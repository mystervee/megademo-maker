import { clone, clamp, ensureArray } from '../utils.js';

const DEFAULT_BPM = 120;
const DEFAULT_STEP_COUNT = 64;
const DEFAULT_CHANNEL_COUNT = 5;
const SCHEDULER_LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_TIME_SECONDS = 0.12;

const DEFAULT_AUDIO_CONFIG = {
  bpm: DEFAULT_BPM,
  loop: true,
  sampleLibrary: [],
  globalTune: {
    steps: Array.from({ length: DEFAULT_STEP_COUNT }, () => ({
      channels: Array.from({ length: DEFAULT_CHANNEL_COUNT }, () => ({
        sampleId: null,
        pitch: 0,
        volume: 1
      }))
    }))
  }
};

function normaliseSample(sample = {}, index = 0) {
  return {
    id: sample.id ?? `sample-${index}`,
    name: sample.name ?? `Sample ${index + 1}`,
    description: sample.description ?? '',
    category: sample.category ?? 'Sample',
    rootNote: sample.rootNote ?? 'C4',
    file: sample.file ?? sample.url ?? '',
    color: sample.color ?? '#48e5c2'
  };
}

function normaliseGlobalTune(globalTune = {}) {
  const sourceSteps = ensureArray(globalTune.steps);
  const stepCount = sourceSteps.length > 0 ? sourceSteps.length : DEFAULT_STEP_COUNT;

  return {
    steps: Array.from({ length: stepCount }, (_, stepIndex) => {
      const step = sourceSteps[stepIndex] ?? {};
      const sourceChannels = ensureArray(step.channels);

      return {
        channels: Array.from({ length: DEFAULT_CHANNEL_COUNT }, (_, channelIndex) => {
          const channel = sourceChannels[channelIndex] ?? {};
          return {
            sampleId:
              typeof channel.sampleId === 'string' && channel.sampleId.length > 0 ? channel.sampleId : null,
            pitch: Number.isFinite(channel.pitch) ? channel.pitch : 0,
            volume: typeof channel.volume === 'number' ? clamp(channel.volume, 0, 2) : 1
          };
        })
      };
    })
  };
}

export function normalizeAudioConfig(input = {}) {
  const provided = clone(input ?? {});
  const bpm = Math.max(1, Number.isFinite(provided.bpm) ? provided.bpm : DEFAULT_AUDIO_CONFIG.bpm);
  const loop = Boolean(provided.loop ?? DEFAULT_AUDIO_CONFIG.loop);
  const sampleLibrary = ensureArray(provided.sampleLibrary).map((sample, index) => normaliseSample(sample, index));
  const globalTune = normaliseGlobalTune(provided.globalTune ?? DEFAULT_AUDIO_CONFIG.globalTune);

  return {
    bpm,
    loop,
    sampleLibrary,
    globalTune
  };
}

function collectSampleIds(audioConfig) {
  const ids = new Set();
  audioConfig.globalTune.steps.forEach((step) => {
    step.channels.forEach((channel) => {
      if (channel.sampleId) {
        ids.add(channel.sampleId);
      }
    });
  });
  return ids;
}

export function createAudioEngine(initialConfig = {}, { onStepChange } = {}) {
  let config = normalizeAudioConfig(initialConfig);
  let audioContext = null;
  let outputGain = null;
  let isPlaying = false;
  let schedulerTimerId = null;
  let nextStepTime = 0;
  let currentStepIndex = 0;
  let playheadTimerIds = [];
  const sampleCache = new Map();
  const loadingMap = new Map();

  function emitStepChange(stepIndex) {
    if (typeof onStepChange === 'function') {
      onStepChange(stepIndex);
    }
  }

  function ensureContext() {
    if (audioContext) return audioContext;
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (!Context) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    audioContext = new Context();
    outputGain = audioContext.createGain();
    outputGain.gain.value = 0.8;
    outputGain.connect(audioContext.destination);
    return audioContext;
  }

  function clearSchedulerTimer() {
    if (schedulerTimerId) {
      window.clearTimeout(schedulerTimerId);
      schedulerTimerId = null;
    }
  }

  function clearPlayheadTimers() {
    playheadTimerIds.forEach((timerId) => window.clearTimeout(timerId));
    playheadTimerIds = [];
  }

  async function loadSample(sampleId) {
    if (!sampleId) return null;
    if (sampleCache.has(sampleId)) {
      return sampleCache.get(sampleId);
    }
    if (loadingMap.has(sampleId)) {
      return loadingMap.get(sampleId);
    }

    const sample = config.sampleLibrary.find((entry) => entry.id === sampleId);
    if (!sample || !sample.file) {
      return null;
    }

    const context = ensureContext();
    const promise = (async () => {
      try {
        const response = await fetch(sample.file);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        const entry = { buffer: audioBuffer };
        sampleCache.set(sampleId, entry);
        return entry;
      } catch (error) {
        console.warn(`Unable to load sample file for ${sampleId} at ${sample.file}`, error);
        sampleCache.set(sampleId, null);
        return null;
      }
    })();

    loadingMap.set(sampleId, promise);
    try {
      return await promise;
    } finally {
      loadingMap.delete(sampleId);
    }
  }

  async function prepareSamples() {
    const ids = Array.from(collectSampleIds(config));
    if (ids.length === 0) return;

    await Promise.all(
      ids.map((id) =>
        loadSample(id).catch((error) => {
          console.warn(`Failed to preload sample ${id}`, error);
        })
      )
    );
  }

  function getStepDurationSeconds() {
    return 60 / config.bpm / 4;
  }

  function getStepCount() {
    return Math.max(1, config.globalTune.steps.length || DEFAULT_STEP_COUNT);
  }

  function queuePlayheadUpdate(stepIndex, stepTime) {
    const context = ensureContext();
    const delayMs = Math.max(0, (stepTime - context.currentTime) * 1000);
    const timeoutId = window.setTimeout(() => {
      playheadTimerIds = playheadTimerIds.filter((id) => id !== timeoutId);
      if (isPlaying) {
        emitStepChange(stepIndex);
      }
    }, delayMs);
    playheadTimerIds.push(timeoutId);
  }

  function playChannel(channel, startTime) {
    if (!channel.sampleId) {
      return;
    }

    const context = ensureContext();
    loadSample(channel.sampleId)
      .then((entry) => {
        if (!entry) return;

        const source = context.createBufferSource();
        source.buffer = entry.buffer;

        const gainNode = context.createGain();
        const playbackStart = Math.max(startTime, context.currentTime + 0.005);
        gainNode.gain.setValueAtTime(clamp(channel.volume ?? 1, 0, 2), playbackStart);

        source.connect(gainNode);
        gainNode.connect(outputGain);

        source.start(playbackStart);
        source.stop(playbackStart + entry.buffer.duration + 0.05);
      })
      .catch((error) => {
        console.warn('Failed to play sample', error);
      });
  }

  function scheduleStep(stepIndex, stepTime) {
    const step = config.globalTune.steps[stepIndex];
    if (!step) {
      return;
    }

    step.channels.forEach((channel) => {
      playChannel(channel, stepTime);
    });

    queuePlayheadUpdate(stepIndex, stepTime);
  }

  function advanceStep() {
    nextStepTime += getStepDurationSeconds();
    currentStepIndex = (currentStepIndex + 1) % getStepCount();
  }

  function scheduler() {
    if (!isPlaying) return;

    const context = ensureContext();
    while (nextStepTime < context.currentTime + SCHEDULE_AHEAD_TIME_SECONDS) {
      scheduleStep(currentStepIndex, nextStepTime);
      advanceStep();
    }

    clearSchedulerTimer();
    schedulerTimerId = window.setTimeout(scheduler, SCHEDULER_LOOKAHEAD_MS);
  }

  async function start() {
    if (isPlaying) return;

    try {
      const context = ensureContext();
      await context.resume();
      await prepareSamples();

      isPlaying = true;
      currentStepIndex = 0;
      nextStepTime = context.currentTime + 0.05;

      clearSchedulerTimer();
      clearPlayheadTimers();
      emitStepChange(null);
      scheduler();
    } catch (error) {
      console.error('Unable to start audio engine', error);
      throw error;
    }
  }

  function stop() {
    if (!isPlaying) return;
    isPlaying = false;
    clearSchedulerTimer();
    clearPlayheadTimers();
    emitStepChange(null);
  }

  function toggle() {
    if (isPlaying) {
      stop();
      return Promise.resolve();
    }
    return start();
  }

  function updateConfig(nextConfig = {}) {
    config = normalizeAudioConfig(nextConfig);
    if (isPlaying) {
      prepareSamples();
    }
  }

  function destroy() {
    stop();
    sampleCache.clear();
    loadingMap.clear();
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      outputGain = null;
    }
  }

  function getState() {
    return { isPlaying };
  }

  async function previewSample(sampleId) {
    if (!sampleId) return;

    try {
      const context = ensureContext();
      await context.resume();
      const entry = await loadSample(sampleId);
      if (!entry) return;

      const source = context.createBufferSource();
      source.buffer = entry.buffer;
      const gainNode = context.createGain();
      gainNode.gain.value = 0.6;
      source.connect(gainNode);
      gainNode.connect(outputGain);
      const startTime = context.currentTime + 0.01;
      source.start(startTime);
      source.stop(startTime + entry.buffer.duration + 0.05);
    } catch (error) {
      console.warn('Sample preview failed', error);
    }
  }

  return {
    start,
    stop,
    toggle,
    updateConfig,
    destroy,
    getState,
    previewSample
  };
}

export const __INTERNALS__ = {
  normalizeAudioConfig,
  DEFAULT_AUDIO_CONFIG
};
