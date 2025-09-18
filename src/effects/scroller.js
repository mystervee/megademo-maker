const DEFAULT_FONT = 'Press Start 2P';

function measureTextWidth(ctx, text) {
  const metrics = ctx.measureText(text);
  return metrics.width;
}

export function createScroller(canvas, initialConfig = {}) {
  const context = canvas.getContext('2d');
  let offset = canvas.width;
  let cachedText = initialConfig.messageText ?? '';
  let cachedFont = initialConfig.messageFont ?? DEFAULT_FONT;
  let cachedWidth = 0;

  function ensureMetrics(config) {
    const { messageText = '', messageFont = DEFAULT_FONT } = config;
    if (messageText !== cachedText || messageFont !== cachedFont) {
      cachedText = messageText;
      cachedFont = messageFont;
      context.save();
      context.font = `24px "${cachedFont}"`;
      cachedWidth = measureTextWidth(context, cachedText || ' ');
      context.restore();
      offset = canvas.width;
    }
  }

  ensureMetrics(initialConfig);

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
    const amplitude = messageWaveAmplitude;
    const frequency = messageWaveFrequency;

    for (let i = 0; i < messageText.length; i += 1) {
      const char = messageText[i];
      const charWidth = ctx.measureText(char).width;
      const waveOffset = Math.sin((x * frequency + time * 0.002) + i * 0.8) * amplitude;

      ctx.fillText(char, x, y + waveOffset);
      x += charWidth + 2;
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
