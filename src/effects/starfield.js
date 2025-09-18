function random(min, max) {
  return min + Math.random() * (max - min);
}

export function createStarfieldEffect(canvas, initialConfig = {}) {
  const stars = [];

  function seed(count) {
    stars.length = 0;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: random(0, canvas.width),
        y: random(0, canvas.height),
        z: random(0.2, 1),
        speed: random(0.4, 1.4)
      });
    }
  }

  seed(initialConfig.starCount ?? 96);

  function ensureCount(count) {
    if (count !== stars.length) {
      seed(count);
    }
  }

  function render(ctx, _time, delta, config) {
    const { starCount = 96, starSpeed = 1, starColor = '#f8f7ff' } = config;
    ensureCount(Math.max(8, Math.floor(starCount)));

    const width = canvas.width;
    const height = canvas.height;
    const speedMultiplier = starSpeed * 60 * delta;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = starColor;

    stars.forEach((star) => {
      star.y += star.speed * speedMultiplier;
      if (star.y > height) {
        star.x = random(0, width);
        star.y = random(-height * 0.1, 0);
        star.z = random(0.2, 1);
        star.speed = random(0.4, 1.4);
      }

      const size = Math.max(1, star.z * 3);
      const alpha = Math.min(1, 0.4 + star.z * 0.6);

      ctx.globalAlpha = alpha;
      ctx.fillRect(star.x, star.y, size, size);
    });

    ctx.restore();
  }

  function updateConfig(config) {
    ensureCount(Math.max(8, Math.floor(config.starCount ?? stars.length)));
  }

  function resize() {
    seed(stars.length);
  }

  return {
    render,
    updateConfig,
    resize
  };
}
