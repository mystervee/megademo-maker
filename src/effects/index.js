import { createBobsEffect } from './bobs.js';
import { createPlasmaEffect } from './plasma.js';
import { createStarfieldEffect } from './starfield.js';
import { createScroller } from './scroller.js';

const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function createEffectsSuite(canvas, initialConfig) {
  const context = canvas.getContext('2d');
  let config = clone(initialConfig);

  const modules = {
    plasma: createPlasmaEffect(canvas, config.visual?.plasma ?? {}),
    bobs: createBobsEffect(canvas, config.visual?.bobs ?? {}),
    starfield: createStarfieldEffect(canvas, config.visual?.starfield ?? {}),
    scroller: createScroller(canvas, config.scroller ?? {})
  };

  let animationFrame = null;
  let running = false;
  let lastTimestamp = performance.now();

  function renderFrame(timestamp) {
    if (!running) {
      return;
    }

    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    context.save();
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.fillStyle = 'rgba(5, 3, 15, 0.92)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    modules.plasma.render(context, timestamp, delta, config.visual.plasma);
    modules.bobs.render(context, timestamp, delta, config.visual.bobs);
    modules.starfield.render(context, timestamp, delta, config.visual.starfield);
    modules.scroller.render(context, timestamp, delta, config.scroller);

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
    config = clone(nextConfig);
    modules.plasma.updateConfig(config.visual.plasma);
    modules.bobs.updateConfig(config.visual.bobs);
    modules.starfield.updateConfig(config.visual.starfield);
    modules.scroller.updateConfig(config.scroller);
  }

  function resize() {
    const dpr = window.devicePixelRatio ?? 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    modules.plasma.resize(config.visual.plasma);
    modules.bobs.resize();
    modules.starfield.resize();
    modules.scroller.resize();
  }

  return {
    start,
    stop,
    resize,
    updateConfig
  };
}
