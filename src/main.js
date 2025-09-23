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
      groupName: 'Megademo Crew',
      theme: 'crt',
      visual: {
        bobs: {},
        plasma: {},
        starfield: {}
      },
      scroller: {},
      audio: {
        bpm: 120,
        swing: 0,
        stepsPerBar: 8,
        loop: true,
        sampleLibrary: [],
        tracks: []
      }
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
  }

  async init() {
    this.config = await loadConfig();
    this.effects = createEffectsSuite(this.canvas, this.config);
    this.audioEngine = createAudioEngine(this.config.audio ?? {});

    this.controls = createControlPanel(this.controlContainer, this.config, {
      onChange: (updatedConfig) => {
        this.applyConfig(updatedConfig);
      },
      onAudioToggle: () => {
        this.toggleAudio();
      },
      onSamplePreview: (sampleId) => {
        if (!sampleId) return;
        this.audioEngine.previewSample(sampleId);
      }
    });

    this.controls.setAudioState(false);
    this.updateGroupName();
    this.setupResizeHandling();
    this.effects.resize();
    this.effects.start();
  }

  applyConfig(nextConfig) {
    this.config = deepMerge(this.config, nextConfig);
    this.effects.updateConfig(this.config);
    this.audioEngine.updateConfig(this.config.audio ?? {});
    this.controls.update(this.config);
    this.updateGroupName();
  }

  updateGroupName() {
    const title = document.querySelector('.app__title');
    const subtitle = document.querySelector('.app__subtitle');
    if (title) {
      title.textContent = `${this.config.groupName ?? 'Megademo Maker'}`;
    }
    if (subtitle) {
      subtitle.textContent = 'Build retro scenes with bobs, plasma, starfields, and tracker beats.';
    }
  }

  async toggleAudio() {
    try {
      await this.audioEngine.toggle();
    } catch (error) {
      console.error('Audio toggle failed', error);
    } finally {
      const { isPlaying } = this.audioEngine.getState();
      this.controls.setAudioState(isPlaying);
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
