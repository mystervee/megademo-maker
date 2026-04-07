import { createBobsEffect } from './bobs.js';
import { createPlasmaEffect } from './plasma.js';
import { createStarfieldEffect } from './starfield.js';
import { createScroller } from './scroller.js';
import { createVectorEngine } from './vectorEngine.js';

const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function createEffectsSuite(canvas, initialConfig, onFrame) {
  const context = canvas.getContext('2d');
  let currentPreviewConfig = clone(initialConfig);
  let cachedGroupNameWidth = 0;

  function updateGroupNameWidth() {
    if (currentPreviewConfig.groupName) {
      context.save();
      context.font = 'bold 32px "Press Start 2P", sans-serif';
      cachedGroupNameWidth = context.measureText(currentPreviewConfig.groupName).width;
      context.restore();
    } else {
      cachedGroupNameWidth = 0;
    }
  }

  updateGroupNameWidth();
  if (document.fonts) {
    document.fonts.ready.then(() => {
      updateGroupNameWidth();
    });
  }

  const modules = {
    plasma: createPlasmaEffect(canvas, currentPreviewConfig.visual?.plasma ?? {}),
    bobs: createBobsEffect(canvas, currentPreviewConfig.visual?.bobs ?? {}),
    starfield: createStarfieldEffect(canvas, currentPreviewConfig.visual?.starfield ?? {}),
    scroller: createScroller(canvas, currentPreviewConfig.scroller ?? {}),
    vector: createVectorEngine(canvas, currentPreviewConfig.visual?.vector ?? {})
  };

  let animationFrame = null;
  let running = false;
  let lastTimestamp = performance.now();

  function renderFrame(timestamp) {
    if (!running) {
      return;
    }

    if (onFrame) onFrame(timestamp);

    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    context.save();
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.fillStyle = 'rgba(5, 3, 15, 0.92)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    if (currentPreviewConfig.plasmaEnabled) {
      modules.plasma.render(context, timestamp, delta, currentPreviewConfig.visual?.plasma);
    }
    if (currentPreviewConfig.bobsEnabled) {
      modules.bobs.render(context, timestamp, delta, currentPreviewConfig.visual?.bobs);
    }
    if (currentPreviewConfig.starfieldEnabled) {
      modules.starfield.render(context, timestamp, delta, currentPreviewConfig.visual?.starfield);
    }
    if (currentPreviewConfig.vectorsEnabled) {
      modules.vector.render(context, timestamp, delta, currentPreviewConfig.visual?.vector);
    }
    modules.scroller.render(context, timestamp, delta, currentPreviewConfig.scroller);

    if (currentPreviewConfig.groupName) {
      context.save();
      context.font = 'bold 32px "Press Start 2P", sans-serif';
      const textWidth = cachedGroupNameWidth;
      const center = canvas.width / 2;
      const x = center + Math.sin(timestamp * 0.003) * (canvas.width / 2 - textWidth / 2);
      const y = 40;

      const gradient = context.createLinearGradient(0, y - 32, 0, y);
      gradient.addColorStop(0, '#ff00ff');
      gradient.addColorStop(1, '#00ffff');

      context.fillStyle = gradient;
      context.shadowColor = 'rgba(255, 0, 255, 0.8)';
      context.shadowBlur = 10;
      context.fillText(currentPreviewConfig.groupName, x - textWidth / 2, y);
      context.restore();
    }

    animationFrame = requestAnimationFrame(renderFrame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTimestamp = performance.now();
    animationFrame = requestAnimationFrame(renderFrame);
  }

  function stop() {
    running = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function updateConfig(nextConfig) {
    const prevGroupName = currentPreviewConfig.groupName;
    currentPreviewConfig = clone(nextConfig);

    if (currentPreviewConfig.groupName !== prevGroupName) {
      updateGroupNameWidth();
    }

    modules.plasma.updateConfig(currentPreviewConfig.visual?.plasma ?? {});
    modules.bobs.updateConfig(currentPreviewConfig.visual?.bobs ?? {});
    modules.starfield.updateConfig(currentPreviewConfig.visual?.starfield ?? {});
    modules.vector.updateConfig(currentPreviewConfig.visual?.vector ?? {});
    modules.scroller.updateConfig(currentPreviewConfig.scroller ?? {});
  }

  function resize() {
    const dpr = window.devicePixelRatio ?? 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    modules.plasma.resize(currentPreviewConfig.visual?.plasma ?? {});
    modules.bobs.resize();
    modules.starfield.resize();
    modules.vector.resize();
    modules.scroller.resize();
  }

  return {
    start,
    stop,
    resize,
    updateConfig
  };
}
