const RESOLUTION_SCALE = {
  low: 0.25,
  medium: 0.5,
  high: 1
};

const COLOR_PRESETS = {
  neon: [
    { h: 170, s: 90, l: 50 },
    { h: 280, s: 80, l: 55 },
    { h: 20, s: 90, l: 55 }
  ],
  sunset: [
    { h: 10, s: 85, l: 55 },
    { h: 35, s: 90, l: 60 },
    { h: 320, s: 60, l: 50 }
  ],
  ice: [
    { h: 200, s: 80, l: 60 },
    { h: 180, s: 90, l: 65 },
    { h: 220, s: 75, l: 55 }
  ],
  mono: [
    { h: 240, s: 0, l: 20 },
    { h: 240, s: 0, l: 50 },
    { h: 240, s: 0, l: 80 }
  ]
};

function toRgb({ h, s, l }) {
  const saturation = s / 100;
  const lightness = l / 100;

  if (saturation === 0) {
    const grey = Math.round(lightness * 255);
    return { r: grey, g: grey, b: grey };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const hueToRgb = (t) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const hue = h / 360;
  const r = Math.round(hueToRgb(hue + 1 / 3) * 255);
  const g = Math.round(hueToRgb(hue) * 255);
  const b = Math.round(hueToRgb(hue - 1 / 3) * 255);
  return { r, g, b };
}

function samplePalette(value, scheme = 'neon') {
  const palette = COLOR_PRESETS[scheme] ?? COLOR_PRESETS.neon;
  const scaled = value * (palette.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(palette.length - 1, index + 1);
  const t = scaled - index;
  const start = toRgb(palette[index]);
  const end = toRgb(palette[nextIndex]);

  return {
    r: Math.round(start.r + (end.r - start.r) * t),
    g: Math.round(start.g + (end.g - start.g) * t),
    b: Math.round(start.b + (end.b - start.b) * t)
  };
}

export function createPlasmaEffect(canvas, initialConfig = {}) {
  const offscreen = document.createElement('canvas');
  const context = offscreen.getContext('2d', { willReadFrequently: true });
  let imageData = null;

  function getScale(resolution) {
    return RESOLUTION_SCALE[resolution] ?? RESOLUTION_SCALE.medium;
  }

  function resize(config) {
    const scale = getScale(config.plasmaResolution);
    offscreen.width = Math.max(1, Math.round(canvas.width * scale));
    offscreen.height = Math.max(1, Math.round(canvas.height * scale));
    imageData = context.createImageData(offscreen.width, offscreen.height);
  }

  resize(initialConfig);

  function render(ctx, time, _delta, config) {
    if (!imageData) {
      resize(config);
    }

    const { plasmaSpeed = 1, plasmaIntensity = 0.9, plasmaColorScheme = 'neon' } = config;
    const data = imageData.data;
    const width = offscreen.width;
    const height = offscreen.height;
    const t = time * 0.001 * plasmaSpeed;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const nx = x / width;
        const ny = y / height;

        const wave1 = Math.sin(nx * 9 + t);
        const wave2 = Math.sin((nx + ny) * 7 + t * 0.7);
        const wave3 = Math.sin(Math.sqrt(nx * nx + ny * ny) * 12 + t * 1.4);
        const value = (wave1 + wave2 + wave3 + 3) / 6;
        const intensity = Math.min(1, Math.pow(value, 0.8) * (0.6 + plasmaIntensity * 0.8));
        const color = samplePalette(intensity, plasmaColorScheme);

        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = 255;
      }
    }

    context.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function updateConfig(config) {
    resize(config);
  }

  return {
    render,
    updateConfig,
    resize: updateConfig
  };
}
