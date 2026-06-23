import { createMaskCanvas, clearMask, isMaskEmpty } from '../maskExporter';

describe('createMaskCanvas', () => {
  it('creates canvas with correct dimensions', () => {
    const canvas = createMaskCanvas(200, 150);
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(150);
  });

  it('new mask canvas is empty (all opaque white)', () => {
    const canvas = createMaskCanvas(10, 10);
    expect(isMaskEmpty(canvas)).toBe(true);
  });
});

describe('clearMask', () => {
  it('resets mask to empty after painting', () => {
    const canvas = createMaskCanvas(10, 10);
    // Manually make a pixel transparent to simulate painting
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1, 1);
    expect(isMaskEmpty(canvas)).toBe(false);
    clearMask(canvas);
    expect(isMaskEmpty(canvas)).toBe(true);
  });
});
