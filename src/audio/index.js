const DEFAULT_STEP_COUNT = 8;
const MAX_SWING = 0.45;

const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const DEFAULT_AUDIO_CONFIG = {
  bpm: 120,
  swing: 0,
  stepsPerBar: DEFAULT_STEP_COUNT,
  loop: true,
  sampleLibrary: [],
  tracks: []
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

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

function normaliseTrack(track = {}, index = 0, stepsPerBar = DEFAULT_STEP_COUNT) {
  const trackId = track.id ?? `track-${index}`;
  const maxSampleSlots = Math.max(1, Number.isInteger(track.maxSampleSlots) ? track.maxSampleSlots : 4);
  const sampleSlots = Array.from({ length: maxSampleSlots }, (_, slotIndex) => {
    const slot = track.sampleSlots?.[slotIndex] ?? {};
    return {
      id: slot.id ?? `${trackId}-slot-${slotIndex}`,
      sampleId: typeof slot.sampleId === 'string' ? slot.sampleId : null
    };
  });

  const stepCount = Array.isArray(track.steps) && track.steps.length > 0 ? track.steps.length : stepsPerBar;
  const steps = Array.from({ length: stepCount }, (_, stepIndex) => {
    const step = track.steps?.[stepIndex] ?? {};
    return {
      enabled: Boolean(step.enabled),
      sampleSlot: Number.isInteger(step.sampleSlot) ? step.sampleSlot : 0,
      pitch: Number.isFinite(step.pitch) ? step.pitch : 0,
      volume: typeof step.volume === 'number' ? clamp(step.volume, 0, 2) : 1,
      pan: typeof step.pan === 'number' ? clamp(step.pan, -1, 1) : 0,
      reverse: Boolean(step.reverse),
      mod: typeof step.mod === 'string' ? step.mod : 'none'
    };
  });

  return {
    id: trackId,
    name: track.name ?? `Track ${index + 1}`,
    color: track.color ?? '#48e5c2',
    maxSampleSlots,
    sampleSlots,
    steps,
    muted: Boolean(track.muted)
  };
}

export function normalizeAudioConfig(input = {}) {
  const provided = clone(input ?? {});
  const bpm = Number.isFinite(provided.bpm) ? provided.bpm : DEFAULT_AUDIO_CONFIG.bpm;
  const swing = clamp(Number.isFinite(provided.swing) ? provided.swing : DEFAULT_AUDIO_CONFIG.swing, 0, 100);
  const stepsPerBarRaw = Number.isInteger(provided.stepsPerBar) ? provided.stepsPerBar : DEFAULT_AUDIO_CONFIG.stepsPerBar;
  const stepsPerBar = Math.max(1, stepsPerBarRaw ?? DEFAULT_STEP_COUNT);
  const loop = Boolean(provided.loop ?? DEFAULT_AUDIO_CONFIG.loop);

  const sampleLibrary = ensureArray(provided.sampleLibrary).map((sample, index) => normaliseSample(sample, index));
  const tracks = ensureArray(provided.tracks).map((track, index) => normaliseTrack(track, index, stepsPerBar));

  return {
    bpm,
    swing,
    stepsPerBar,
    loop,
    sampleLibrary,
    tracks
  };
}

function createReversedBuffer(context, buffer) {
  const reversed = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const sourceData = buffer.getChannelData(channel);
    const targetData = reversed.getChannelData(channel);
    for (let i = 0; i < sourceData.length; i += 1) {
      targetData[i] = sourceData[sourceData.length - 1 - i];
    }
  }
  return reversed;
}

function createBitcrusherCurve(bits = 4) {
  const length = 2 ** 16;
  const curve = new Float32Array(length);
  const levels = 2 ** bits;
  for (let i = 0; i < length; i += 1) {
    const x = (i / (length - 1)) * 2 - 1;
    curve[i] = Math.round(x * levels) / levels;
  }
  return curve;
}

function getStepDurationSeconds(config, stepIndex) {
  const bpm = config.bpm || 120;
  const stepsPerBar = config.stepsPerBar || DEFAULT_STEP_COUNT;
  const stepsPerBeat = stepsPerBar / 4 || 1;
  const baseDuration = (60 / bpm) / stepsPerBeat;
  const swingAmount = clamp((config.swing ?? 0) / 100, 0, MAX_SWING);
  if (stepIndex % 2 === 1) {
    return baseDuration * (1 + swingAmount);
  }
  return baseDuration * (1 - swingAmount);
}

function collectSampleIds(audioConfig) {
  const ids = new Set();
  audioConfig.tracks.forEach((track) => {
    track.sampleSlots.forEach((slot) => {
      if (slot?.sampleId) {
        ids.add(slot.sampleId);
      }
    });
  });
  return ids;
}

export function createAudioEngine(initialConfig = {}) {
  let config = normalizeAudioConfig(initialConfig);
  let audioContext = null;
  let outputGain = null;
  let isPlaying = false;
  let stepIndex = 0;
  let timeoutId = null;
  const sampleCache = new Map();
  const loadingMap = new Map();

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

  function clearTimer() {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
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
        const reversedBuffer = createReversedBuffer(context, audioBuffer);
        const entry = { buffer: audioBuffer, reversed: reversedBuffer };
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
    await Promise.all(ids.map((id) => loadSample(id).catch((error) => {
      console.warn(`Failed to preload sample ${id}`, error);
    })));
  }

  function createModChain(context, node, step, startTime) {
    let current = node;
    switch (step.mod) {
      case 'lpf': {
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, startTime);
        filter.Q.setValueAtTime(0.7, startTime);
        current.connect(filter);
        current = filter;
        break;
      }
      case 'hpf': {
        const filter = context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, startTime);
        filter.Q.setValueAtTime(0.9, startTime);
        current.connect(filter);
        current = filter;
        break;
      }
      case 'bitcrush': {
        const crusher = context.createWaveShaper();
        crusher.curve = createBitcrusherCurve(4);
        crusher.oversample = '4x';
        current.connect(crusher);
        current = crusher;
        break;
      }
      case 'chorus': {
        const dry = context.createGain();
        const wet = context.createGain();
        dry.gain.setValueAtTime(0.8, startTime);
        wet.gain.setValueAtTime(0.4, startTime);
        const delay = context.createDelay();
        delay.delayTime.setValueAtTime(0.02, startTime);
        const feedback = context.createGain();
        feedback.gain.setValueAtTime(0.2, startTime);
        current.connect(dry);
        current.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wet);
        const mix = context.createGain();
        dry.connect(mix);
        wet.connect(mix);
        current = mix;
        break;
      }
      case 'delay': {
        const dry = context.createGain();
        const wet = context.createGain();
        dry.gain.setValueAtTime(0.9, startTime);
        wet.gain.setValueAtTime(0.5, startTime);
        const delay = context.createDelay();
        delay.delayTime.setValueAtTime(0.28, startTime);
        const feedback = context.createGain();
        feedback.gain.setValueAtTime(0.35, startTime);
        current.connect(dry);
        current.connect(delay);
        delay.connect(wet);
        delay.connect(feedback);
        feedback.connect(delay);
        const mix = context.createGain();
        dry.connect(mix);
        wet.connect(mix);
        current = mix;
        break;
      }
      default:
        break;
    }
    return current;
  }

  function playStep(track, step, startTime) {
    const context = ensureContext();
    const slot = track.sampleSlots?.[step.sampleSlot];
    if (!slot || !slot.sampleId) {
      return;
    }
    loadSample(slot.sampleId)
      .then((entry) => {
        if (!entry) return;
        const source = context.createBufferSource();
        source.buffer = step.reverse ? entry.reversed : entry.buffer;
        const playbackRate = Math.pow(2, (step.pitch ?? 0) / 12);
        const now = context.currentTime;
        const playbackStart = Math.max(startTime, now + 0.01);
        source.playbackRate.setValueAtTime(playbackRate, playbackStart);
        source.loop = false;

        let chain = source;
        chain = createModChain(context, chain, step, playbackStart);

        const gainNode = context.createGain();
        gainNode.gain.setValueAtTime(clamp(step.volume ?? 1, 0, 2), playbackStart);
        chain.connect(gainNode);

        let destination = gainNode;
        if (context.createStereoPanner) {
          const panner = context.createStereoPanner();
          panner.pan.setValueAtTime(clamp(step.pan ?? 0, -1, 1), playbackStart);
          destination.connect(panner);
          destination = panner;
        }

        destination.connect(outputGain);

        const stopTime = playbackStart + (source.buffer.duration / playbackRate) + 0.05;
        source.start(playbackStart);
        source.stop(stopTime);
      })
      .catch((error) => {
        console.warn('Failed to play sample', error);
      });
  }

  function cycleLength() {
    return Math.max(1, config.stepsPerBar || DEFAULT_STEP_COUNT);
  }

  function scheduleNext() {
    if (!isPlaying) return;
    const context = ensureContext();
    const nominalStart = context.currentTime + 0.06;
    const tracks = config.tracks ?? [];

    tracks.forEach((track) => {
      if (track.muted) return;
      const steps = track.steps ?? [];
      if (steps.length === 0) return;
      const step = steps[stepIndex % steps.length];
      if (!step || !step.enabled) return;
      playStep(track, step, nominalStart);
    });

    const duration = getStepDurationSeconds(config, stepIndex);
    const nextIndex = stepIndex + 1;
    if (!config.loop && nextIndex >= cycleLength()) {
      window.setTimeout(() => {
        stop();
      }, duration * 1000);
      return;
    }

    stepIndex = nextIndex % cycleLength();
    clearTimer();
    timeoutId = window.setTimeout(scheduleNext, duration * 1000);
  }

  async function start() {
    if (isPlaying) return;
    try {
      const context = ensureContext();
      await context.resume();
      await prepareSamples();
      isPlaying = true;
      stepIndex = 0;
      scheduleNext();
    } catch (error) {
      console.error('Unable to start audio engine', error);
      throw error;
    }
  }

  function stop() {
    if (!isPlaying) return;
    isPlaying = false;
    clearTimer();
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
      stepIndex = 0;
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
