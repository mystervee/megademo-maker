const TWO_PI = Math.PI * 2;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function createBobsEffect(canvas, initialConfig = {}) {
  const bobs = [];

  function seed(count) {
    bobs.length = 0;
    for (let i = 0; i < count; i += 1) {
      bobs.push({
        orbitX: randomBetween(canvas.width * 0.1, canvas.width * 0.35),
        orbitY: randomBetween(canvas.height * 0.08, canvas.height * 0.25),
        phase: Math.random() * TWO_PI,
        wobble: randomBetween(0.8, 1.4),
        speed: randomBetween(0.5, 1.5)
      });
    }
  }

  seed(initialConfig.bobCount ?? 16);

  function ensureCount(count) {
    if (count !== bobs.length) {
      seed(count);
    }
  }

  function render(ctx, time, _delta, config) {
    const {
      bobCount = 16,
      bobColorPalette = ['#ffffff'],
      bobSize = 28,
      bobSpeed = 1,
      bobBlendMode = 'lighter'
    } = config;

    ensureCount(Math.max(1, Math.floor(bobCount)));

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.globalCompositeOperation = bobBlendMode;

    bobs.forEach((bob, index) => {
      const baseAngle = (index / bobs.length) * TWO_PI;
      const angle = baseAngle + time * 0.0006 * bobSpeed * bob.speed + bob.phase;
      const wobbleAngle = angle * bob.wobble;
      const x = centerX + Math.cos(angle) * bob.orbitX;
      const y = centerY + Math.sin(wobbleAngle) * bob.orbitY;
      const paletteColor = bobColorPalette[index % bobColorPalette.length];
      const radius = Math.max(6, bobSize / 2 + Math.sin(wobbleAngle * 2) * (bobSize / 6));

      ctx.fillStyle = paletteColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TWO_PI);
      ctx.fill();
    });

    ctx.restore();
  }

  function updateConfig(config) {
    const count = Math.max(1, Math.floor(config.bobCount ?? bobs.length));
    ensureCount(count);
  }

  function resize() {
    seed(bobs.length);
  }

  return {
    render,
    updateConfig,
    resize
  };
}
