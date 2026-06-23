import { getCanvasLayout, displayToOriginal, getBrushRadiusInOriginal } from '../coordinateMapping';

describe('getCanvasLayout — landscape image in square canvas', () => {
  // 200×100 image, 100×100 canvas → renderScale=0.5, rendered=100×50, offsetX=0, offsetY=25
  const layout = () => getCanvasLayout(100, 100, 200, 100);

  it('calculates renderScale correctly', () => {
    expect(layout().renderScale).toBeCloseTo(0.5);
  });
  it('calculates renderedWidth correctly', () => {
    expect(layout().renderedWidth).toBeCloseTo(100);
  });
  it('calculates renderedHeight correctly', () => {
    expect(layout().renderedHeight).toBeCloseTo(50);
  });
  it('calculates offsetX correctly', () => {
    expect(layout().offsetX).toBeCloseTo(0);
  });
  it('calculates offsetY correctly', () => {
    expect(layout().offsetY).toBeCloseTo(25);
  });
});

describe('getCanvasLayout — portrait image in square canvas', () => {
  // 100×200 image, 100×100 canvas → renderScale=0.5, rendered=50×100, offsetX=25, offsetY=0
  it('centers portrait image horizontally', () => {
    const layout = getCanvasLayout(100, 100, 100, 200);
    expect(layout.offsetX).toBeCloseTo(25);
    expect(layout.offsetY).toBeCloseTo(0);
  });
});

describe('displayToOriginal', () => {
  it('maps center of displayed landscape image to center of original', () => {
    // 200×100 in 100×100 canvas → rendered at offsetY=25, size 100×50
    // Center of image in display coords: (50, 50)
    const layout = getCanvasLayout(100, 100, 200, 100);
    const result = displayToOriginal(50, 50, layout, 200, 100);
    expect(result.x).toBeCloseTo(100); // center of 200px wide original
    expect(result.y).toBeCloseTo(50);  // center of 100px tall original
  });

  it('returns null when click is outside image area (above image)', () => {
    // image starts at offsetY=25, clicking y=10 is outside
    const layout = getCanvasLayout(100, 100, 200, 100);
    const result = displayToOriginal(50, 10, layout, 200, 100);
    expect(result).toBeNull();
  });

  it('returns null when click is to the right of image', () => {
    // portrait: image occupies x=25..75 of 100px canvas
    const layout = getCanvasLayout(100, 100, 100, 200);
    const result = displayToOriginal(90, 50, layout, 100, 200);
    expect(result).toBeNull();
  });
});

describe('getBrushRadiusInOriginal', () => {
  it('scales UI radius to original image pixel radius', () => {
    // 200×100 in 100×100 → renderedWidth=100
    // UI radius 10 → orig radius = 10 * (200/100) = 20
    const layout = getCanvasLayout(100, 100, 200, 100);
    expect(getBrushRadiusInOriginal(10, layout, 200)).toBeCloseTo(20);
  });
});
