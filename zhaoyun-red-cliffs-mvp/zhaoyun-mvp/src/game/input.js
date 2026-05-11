const keys = {};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
}

export function isDown(code) { return !!keys[code]; }
export function simulateKeyDown(code) { keys[code] = true; }
export function simulateKeyUp(code)   { keys[code] = false; }
