// ==========================================================
// 視覺驗證腳本：用 Playwright 開啟網站，逐章截圖，
// 並收集瀏覽器主控台的錯誤訊息。
// 執行方式：node tests/visual-check.mjs
// ==========================================================
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = new URL('./shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// 注意：headless 模式在這台機器上開不出 WebGL（SwiftShader 問題），
// 所以改用「有視窗」模式跑測試，才能真正渲染 3D 畫面。
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 收集主控台錯誤
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500); // 等字體與 shader 就緒

// 1. 封面
await page.screenshot({ path: OUT + '01-intro.png' });

// 2. 開卷 → 第一章
await page.click('#btn-start');
await page.waitForTimeout(3200); // 等運鏡完成
await page.screenshot({ path: OUT + '02-ch1.png' });

// 3. 滑鼠掃過江面（製造漣漪）後截圖
await page.mouse.move(500, 600);
for (let x = 500; x <= 900; x += 40) {
  await page.mouse.move(x, 600 + Math.sin(x / 60) * 40);
  await page.waitForTimeout(60);
}
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '03-ripples.png' });

// 4. hover 戰船：把滑鼠移到畫面中央偏下找船（用 app 後門直接驗證較準）
//    這裡先跳到第四章測試縱火
await page.evaluate(() => window.__APP.goChapter(3));
await page.waitForTimeout(3000);
await page.screenshot({ path: OUT + '04-ch4-before-fire.png' });

// 5. 縱火！（直接呼叫 igniteShip 模擬點擊曹軍船）
await page.evaluate(() => window.__APP.igniteShip(window.__APP.caoShips[0]));
await page.waitForTimeout(4500); // 等火勢蔓延
await page.screenshot({ path: OUT + '05-ch4-fire.png' });

// 6. 第五章
await page.evaluate(() => window.__APP.goChapter(4));
await page.waitForTimeout(3500);
await page.screenshot({ path: OUT + '06-ch5.png' });

// 7. 手機尺寸檢查（iPhone 比例）
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.screenshot({ path: OUT + '07-mobile.png' });

await browser.close();

if (errors.length) {
  console.log('CONSOLE ERRORS:');
  errors.forEach((e) => console.log('  -', e));
  process.exit(1);
} else {
  console.log('OK: no console errors. Screenshots in tests/shots/');
}
