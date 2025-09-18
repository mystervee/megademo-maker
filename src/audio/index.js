const A4_FREQUENCY = 440;
const NOTE_OFFSETS = {
  C: -9,
  'C#': -8,
  Db: -8,
  D: -7,
  'D#': -6,
  Eb: -6,
  E: -5,
  F: -4,
  'F#': -3,
  Gb: -3,
  G: -2,
  'G#': -1,
  Ab: -1,
  A: 0,
  'A#': 1,
  Bb: 1,
  B: 2
};

function noteToFrequency(note) {
  if (!note) return null;
  const match = note.trim().match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!match) return null;

  const [, letter, accidental, octaveRaw] = match;
  const key = `${letter.toUpperCase()}${accidental}`;
  const octave = Number.parseInt(octaveRaw, 10);
  const semitoneOffset = NOTE_OFFSETS[key];
  if (typeof semitoneOffset !== 'number') return null;

  const totalSemitones = semitoneOffset + (octave - 4) * 12;
  return A4_FREQUENCY * Math.pow(2, totalSemitones / 12);
}

const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function createAudioEngine(initialConfig = {}) {
  let config = clone(initialConfig);
  let audioContext = null;
  let outputGain = null;
  let isPlaying = false;
  let timeoutId = null;
  let stepIndex = 0;

  function ensureContext() {
    if (audioContext) return audioContext;
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (!Context) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    audioContext = new Context();
    outputGain = audioContext.createGain();
    outputGain.gain.value = 0.18;
    outputGain.connect(audioContext.destination);
    return audioContext;
  }

  function clearTimer() {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function scheduleNext() {
    if (!isPlaying || !config.trackerPattern || config.trackerPattern.length === 0) {
      return;
    }

    const context = ensureContext();
    const step = config.trackerPattern[stepIndex % config.trackerPattern.length];
    const noteDuration = (step?.duration ?? 0.5) * (60 / (config.bpm ?? 120));
    const frequency = noteToFrequency(step?.note);
    const startTime = context.currentTime;
    const endTime = startTime + noteDuration;

    if (frequency) {
      const oscillator = context.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;

      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0, startTime);
      envelope.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.001, endTime);

      oscillator.connect(envelope);
      envelope.connect(outputGain);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.05);
    }

    stepIndex += 1;
    clearTimer();
    timeoutId = window.setTimeout(scheduleNext, noteDuration * 1000);
  }

  async function start() {
    if (isPlaying) return;
    try {
      const context = ensureContext();
      await context.resume();
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
    config = clone(nextConfig);
    if (isPlaying) {
      stepIndex = 0;
    }
  }

  function destroy() {
    stop();
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      outputGain = null;
    }
  }

  function getState() {
    return { isPlaying };
  }

  return {
    start,
    stop,
    toggle,
    updateConfig,
    destroy,
    getState
  };
}
