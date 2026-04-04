import './styles.css';
import { createEffectsSuite } from './effects/index.js';
import { createAudioEngine } from './audio/index.js';
import { createControlPanel } from './ui/controls.js';

const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

async function loadConfig() {
  try {
    const response = await fetch('/config/config.json');
    if (!response.ok) {
      throw new Error(`Unable to load config: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Failed to load config.json, using defaults.', error);
    return {
      globalSettings: {
        groupName: 'Megademo Crew',
        bpm: 120,
        masterVolume: 1.0
      },
      globalTune: {
        steps: Array.from({ length: 64 }, () => ({
          channels: Array.from({ length: 5 }, () => ({
            sampleId: null,
            pitch: 0,
            volume: 1
          }))
        })),
        trackEffects: Array.from({ length: 5 }, () => ({
          reverb: 0,
          delay: 0,
          filter: 0
        }))
      },
      numberOfParts: 1,
      parts: [
        {
          visual: {
            bobs: {},
            plasma: {},
            starfield: {},
            vector: {}
          },
          scroller: {},
          audio: {
            tracks: [],
            sampleLibrary: [
              { id: 'synth-1', name: 'Synth/Bass' },
              { id: 'synth-2', name: 'Synth/Bass' },
              { id: 'synth-3', name: 'Synth/Bass' },
              { id: 'synth-4', name: 'Synth/Bass' },
              { id: 'synth-5', name: 'Synth/Bass' },
              { id: 'synth-6', name: 'Synth/Bass' },
              { id: 'synth-7', name: 'Synth/Bass' },
              { id: 'synth-8', name: 'Synth/Bass' },
              { id: 'drum-1', name: 'Drum/Perc' },
              { id: 'drum-2', name: 'Drum/Perc' },
              { id: 'drum-3', name: 'Drum/Perc' },
              { id: 'drum-4', name: 'Drum/Perc' },
              { id: 'drum-5', name: 'Drum/Perc' },
              { id: 'drum-6', name: 'Drum/Perc' },
              { id: 'drum-7', name: 'Drum/Perc' },
              { id: 'drum-8', name: 'Drum/Perc' }
            ]
          },
          transition: 'cut'
        }
      ]
    };
  }
}

function deepMerge(target, source) {
  const output = clone(target);
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

class MegademoApp {
  constructor(canvas, controlContainer) {
    this.canvas = canvas;
    this.controlContainer = controlContainer;
    this.config = null;
    this.effects = null;
    this.audioEngine = null;
    this.controls = null;
    this.resizeObserver = null;
    this.onWindowResize = null;
    this.isPlaying = false;
    this.currentPlayingIndex = 0;
    this.partStartTime = 0;
    this.currentStep = 1;
    this.currentPartTab = 0;
  }

  async init() {
    this.config = await loadConfig();
    
    let initialPreviewConfig = this.config.parts && this.config.parts.length > 0 ? this.config.parts[0] : this.config;
    initialPreviewConfig = { ...initialPreviewConfig, groupName: this.config.globalSettings?.groupName ?? this.config.groupName };
    this.effects = createEffectsSuite(this.canvas, initialPreviewConfig, (timestamp) => {
      this.onRenderFrame(timestamp);
    });
    this.audioEngine = createAudioEngine(this.config.audio ?? {});

    this.controls = createControlPanel(this.controlContainer, this.config, {
      onChange: (updatedConfig, currentStep, currentPartTab) => {
        this.applyConfig(updatedConfig, currentStep, currentPartTab);
      },
      onPlaybackToggle: () => {
        if (this.isPlaying) {
          this.stopSequence();
        } else {
          this.startSequence();
        }
      },
      onSamplePreview: (sampleId) => {
        if (!sampleId) return;
        this.audioEngine.previewSample(sampleId);
      }
    });

    this.controls.setPlaybackState(false);
    this.updateGroupName();
    this.setupResizeHandling();
    this.effects.resize();
    this.effects.start();
  }

  onRenderFrame(timestamp) {
    if (!this.isPlaying) return;
    
    const totalParts = this.config.numberOfParts || 1;
    const part = this.config.parts[this.currentPlayingIndex];
    if (!part) return;

    const durationSeconds = part.durationInSeconds ?? 10;
    const elapsed = timestamp - this.partStartTime;
    
    if (elapsed > durationSeconds * 1000) {
      this.currentPlayingIndex++;
      this.partStartTime = timestamp;
      
      if (this.currentPlayingIndex >= totalParts) {
        this.stopSequence();
        return;
      }
      
      this.controls.setPlaybackState(this.isPlaying, this.currentPlayingIndex, totalParts);
      const previewConfig = {
        ...this.config.parts[this.currentPlayingIndex],
        groupName: this.config.globalSettings?.groupName ?? this.config.groupName
      };
      this.effects.updateConfig(previewConfig);
    }
  }

  startSequence() {
    this.isPlaying = true;
    this.currentPlayingIndex = 0;
    this.partStartTime = performance.now();
    
    const totalParts = this.config.numberOfParts || 1;
    this.controls.setPlaybackState(true, this.currentPlayingIndex, totalParts);
    
    if (!this.audioEngine.getState().isPlaying) {
      this.audioEngine.start().catch(err => console.error(err));
    }
    
    if (this.config.parts && this.config.parts.length > 0) {
      const previewConfig = {
        ...this.config.parts[this.currentPlayingIndex],
        groupName: this.config.globalSettings?.groupName ?? this.config.groupName
      };
      this.effects.updateConfig(previewConfig);
    }
  }

  stopSequence() {
    this.isPlaying = false;
    this.controls.setPlaybackState(false);
    
    if (this.audioEngine.getState().isPlaying) {
      this.audioEngine.stop();
    }
    
    this.applyConfig(this.config, this.currentStep, this.currentPartTab);
  }

  applyConfig(nextConfig, currentStep = 1, currentPartTab = 0) {
    this.config = deepMerge(this.config, nextConfig);
    this.currentStep = currentStep;
    this.currentPartTab = currentPartTab;
    
    let previewConfig = this.config;
    if (this.isPlaying) {
      previewConfig = this.config.parts[this.currentPlayingIndex] ?? this.config.parts[0];
    } else if (this.config.parts && this.config.parts.length > 0) {
      if (currentStep === 3 && this.config.parts[currentPartTab]) {
        previewConfig = this.config.parts[currentPartTab];
      } else {
        previewConfig = this.config.parts[0];
      }
    }
    previewConfig = { ...previewConfig, groupName: this.config.globalSettings?.groupName ?? this.config.groupName };

    this.effects.updateConfig(previewConfig);
    this.audioEngine.updateConfig(this.config.audio ?? {});
    this.controls.update(this.config);
    this.updateGroupName();
  }

  updateGroupName() {
    const title = document.querySelector('.app__title');
    const subtitle = document.querySelector('.app__subtitle');
    if (title) {
      title.textContent = 'MegaDemo Maker';
    }
    if (subtitle) {
      subtitle.textContent = 'Build retro scenes with bobs, plasma, starfields, and tracker beats.';
    }
  }

  setupResizeHandling() {
    const resize = () => {
      this.effects.resize();
    };

    resize();
    window.addEventListener('resize', resize);
    this.onWindowResize = resize;

    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(resize);
      this.resizeObserver.observe(this.canvas);
    }
  }
}

function bootstrap() {
  const canvas = document.getElementById('demo-canvas');
  const controlPanel = document.getElementById('control-panel');

  if (!canvas || !controlPanel) {
    console.error('Megademo Maker: Required DOM nodes are missing.');
    return;
  }

  const app = new MegademoApp(canvas, controlPanel);
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
