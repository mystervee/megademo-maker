const DEFAULT_FONT = 'Press Start 2P';

function measureTextWidth(ctx, text) {
  const metrics = ctx.measureText(text);
  return metrics.width;
}

export function createScroller(canvas, initialConfig = {}) {
  const context = canvas.getContext('2d');
  let offset = canvas.width;
  let cachedText = null;
  let cachedFont = null;
  let cachedWidth = 0;
  let cachedCharWidths = [];

  function ensureMetrics(config) {
    const { messageText = '', messageFont = DEFAULT_FONT } = config;
    if (messageText !== cachedText || messageFont !== cachedFont) {
      cachedText = messageText;
      cachedFont = messageFont;
      context.save();
      context.font = `24px "${cachedFont}"`;
      cachedWidth = measureTextWidth(context, cachedText || ' ');

      cachedCharWidths = [];
      for (let i = 0; i < cachedText.length; i++) {
        cachedCharWidths.push(context.measureText(cachedText[i]).width);
      }

      context.restore();
      offset = canvas.width;
    }
  }

  ensureMetrics(initialConfig);
  if (document.fonts) {
    document.fonts.ready.then(() => {
      cachedText = null;
      cachedFont = null;
      ensureMetrics(initialConfig);
    });
  }

  function render(ctx, time, delta, config) {
    const {
      messageText = '',
      messageFont = DEFAULT_FONT,
      messageSpeed = 2,
      messageWaveAmplitude = 12,
      messageWaveFrequency = 0.01,
      messageColor = '#48e5c2'
    } = config;

    ensureMetrics(config);

    ctx.save();
    ctx.font = `24px "${messageFont}"`;
    ctx.fillStyle = messageColor;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(12, 245, 216, 0.45)';
    ctx.shadowBlur = 12;

    offset -= messageSpeed * 60 * delta;
    if (offset < -cachedWidth - canvas.width) {
      offset = canvas.width;
    }

    let x = offset;
    const y = canvas.height - 60;

    for (let i = 0; i < messageText.length; i += 1) {
      const char = messageText[i];
      const charWidth = cachedCharWidths[i] || 0;
      const waveOffset = Math.sin(x * messageWaveFrequency + time * 0.005) * messageWaveAmplitude;

      ctx.fillText(char, x, y + waveOffset);
      x += charWidth; // Increment by character width to prevent overlap
    }

    ctx.restore();
  }

  function updateConfig(config) {
    ensureMetrics(config);
  }

  function resize() {
    offset = canvas.width;
    cachedWidth = 0;
  }

  return {
    render,
    updateConfig,
    resize
  };
}
