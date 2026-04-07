import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStarfieldEffect } from './starfield.js';

describe('createStarfieldEffect', () => {
  let canvas;
  let ctx;

  beforeEach(() => {
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      globalCompositeOperation: '',
      fillStyle: '',
      globalAlpha: 1
    };
    canvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(() => ctx)
    };
  });

  it('should initialize with default star count', () => {
    const effect = createStarfieldEffect(canvas);
    const config = { starCount: 96, starSpeed: 1, starColor: '#ffffff' };

    effect.render(ctx, 0, 0.016, config);

    // Default is 96, render calls fillRect for each star
    expect(ctx.fillRect).toHaveBeenCalledTimes(96);
  });

  it('should initialize with custom star count', () => {
    const effect = createStarfieldEffect(canvas, { starCount: 50 });
    const config = { starCount: 50, starSpeed: 1, starColor: '#ffffff' };

    effect.render(ctx, 0, 0.016, config);

    expect(ctx.fillRect).toHaveBeenCalledTimes(50);
  });

  it('should enforce a minimum of 8 stars during render', () => {
    const effect = createStarfieldEffect(canvas, { starCount: 2 });
    const config = { starCount: 2, starSpeed: 1, starColor: '#ffffff' };

    effect.render(ctx, 0, 0.016, config);

    // Even though we requested 2, ensureCount(Math.max(8, ...)) is called in render
    expect(ctx.fillRect).toHaveBeenCalledTimes(8);
  });

  it('should update star count via updateConfig', () => {
    const effect = createStarfieldEffect(canvas, { starCount: 20 });
    effect.updateConfig({ starCount: 40 });

    const config = { starCount: 40, starSpeed: 1, starColor: '#ffffff' };
    effect.render(ctx, 0, 0.016, config);

    expect(ctx.fillRect).toHaveBeenCalledTimes(40);
  });

  it('should update star count via render config', () => {
    const effect = createStarfieldEffect(canvas, { starCount: 20 });
    const config = { starCount: 30, starSpeed: 1, starColor: '#ffffff' };

    effect.render(ctx, 0, 0.016, config);

    expect(ctx.fillRect).toHaveBeenCalledTimes(30);
  });

  it('should handle star movement and wrap around', () => {
    // We can't easily check the internal state of stars,
    // but we can check that it doesn't crash during a long delta
    const effect = createStarfieldEffect(canvas, { starCount: 10 });
    const config = { starCount: 10, starSpeed: 100, starColor: '#ffffff' };

    // Large delta to force stars off screen
    effect.render(ctx, 0, 10, config);

    expect(ctx.fillRect).toHaveBeenCalledTimes(10);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('should expose a resize method', () => {
    const effect = createStarfieldEffect(canvas, { starCount: 10 });
    expect(typeof effect.resize).toBe('function');

    // Calling resize should not throw
    expect(() => effect.resize()).not.toThrow();
  });
});
