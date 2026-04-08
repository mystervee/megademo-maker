// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudioEngine } from './index.js';
import { createTrackerPanel } from '../ui/tracker.js';

function createGlobalTune(withSamples = false) {
  return {
    steps: Array.from({ length: 64 }, () => ({
      channels: Array.from({ length: 5 }, (_, channelIndex) => ({
        sampleId: withSamples && channelIndex === 0 ? 'kick' : null,
        pitch: 0,
        volume: 1
      }))
    })),
    trackEffects: Array.from({ length: 5 }, () => ({
      reverb: 0,
      delay: 0,
      filter: 0
    }))
  };
}

describe('audio scheduler and tracker sync', () => {
  let audioBufferSourceStarts;
  let clearTimeoutSpy;

  class FakeAudioContext {
    constructor() {
      this.baseTimeMs = Date.now();
      this.destination = {};
    }

    get currentTime() {
      return (Date.now() - this.baseTimeMs) / 1000;
    }

    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime: vi.fn()
        },
        connect: vi.fn()
      };
    }

    createBufferSource() {
      return {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn((time) => {
          audioBufferSourceStarts.push(time);
        }),
        stop: vi.fn()
      };
    }

    decodeAudioData() {
      return Promise.resolve({ duration: 0.2 });
    }

    resume() {
      return Promise.resolve();
    }

    close() {
      return Promise.resolve();
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    audioBufferSourceStarts = [];
    clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16)
    })));
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('webkitAudioContext', FakeAudioContext);
  });

  afterEach(() => {
    clearTimeoutSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('schedules step playback at the expected BPM interval', async () => {
    const engine = createAudioEngine({
      bpm: 120,
      sampleLibrary: [{ id: 'kick', file: '/assets/music/drum-kick.wav' }],
      globalTune: createGlobalTune(true)
    });

    await engine.start();
    await vi.advanceTimersByTimeAsync(100);

    expect(audioBufferSourceStarts.length).toBeGreaterThanOrEqual(2);
    expect(audioBufferSourceStarts[1] - audioBufferSourceStarts[0]).toBeCloseTo(0.125, 5);

    engine.stop();
  });

  it('increments playback steps from 0 to 63 and loops back to 0', async () => {
    const playedSteps = [];
    const engine = createAudioEngine(
      {
        bpm: 120,
        globalTune: createGlobalTune(false)
      },
      {
        onStepChange: (stepIndex) => {
          if (Number.isInteger(stepIndex)) {
            playedSteps.push(stepIndex);
          }
        }
      }
    );

    await engine.start();
    await vi.advanceTimersByTimeAsync(8200);

    expect(playedSteps.slice(0, 65)).toEqual([...Array.from({ length: 64 }, (_, index) => index), 0]);

    engine.stop();
  });

  it('updates the DOM highlight and auto-scroll when the playback step changes', () => {
    const tracker = createTrackerPanel({
      audio: { sampleLibrary: [{ id: 'kick', name: 'kick.wav' }] },
      globalTune: createGlobalTune(false)
    });

    document.body.appendChild(tracker.element);

    const gridScrollable = tracker.element.querySelector('.tracker-grid');
    const rulerCells = Array.from(tracker.element.querySelectorAll('.tracker-grid-cell')).slice(0, 64);

    Object.defineProperty(gridScrollable, 'clientWidth', { value: 120, configurable: true });
    Object.defineProperty(gridScrollable, 'scrollWidth', { value: 64 * 60, configurable: true });
    gridScrollable.scrollLeft = 0;

    rulerCells.forEach((cell, index) => {
      Object.defineProperty(cell, 'offsetLeft', { value: index * 60, configurable: true });
    });

    tracker.setPlaybackStep(5);

    expect(tracker.element.querySelectorAll('.active-step-highlight')).toHaveLength(6);
    expect(gridScrollable.scrollLeft).toBe(240);

    tracker.setPlaybackStep(1);
    expect(gridScrollable.scrollLeft).toBe(60);
  });

  it('stops scheduling future preview steps when playback is stopped', async () => {
    const playedSteps = [];
    const engine = createAudioEngine(
      {
        bpm: 120,
        globalTune: createGlobalTune(false)
      },
      {
        onStepChange: (stepIndex) => {
          if (Number.isInteger(stepIndex)) {
            playedSteps.push(stepIndex);
          }
        }
      }
    );

    await engine.start();
    await vi.advanceTimersByTimeAsync(300);
    const playedBeforeStop = playedSteps.length;

    engine.stop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(playedSteps.length).toBe(playedBeforeStop);
  });
});
