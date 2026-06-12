// ==========================================================
// 水墨赤壁 — 主程式
// 負責：建立 3D 場景（江面、遠山、戰船）、滑鼠互動
// （hover / click / 漣漪）、章節鏡頭運鏡、火攻演出。
// ==========================================================

import * as THREE from 'three';
import { CHAPTERS, FLEET_INFO } from './story.js';
import {
  waterVertex, waterFragment,
  mountainVertex, mountainFragment,
  shipVertex, shipFragment,
  fireVertex, fireFragment,
  windVertex, windFragment,
} from './shaders.js';

// ---------- 常數（顏色與場景配置） ----------
const PAPER = new THREE.Color('#f3eee2'); // 宣紙底色
const INK = new THREE.Color('#23211d');   // 墨色
const CAO_CENTER = new THREE.Vector3(-2, 0, -30); // 曹軍水寨中心（江北）

// ---------- 基本三件組：渲染器、場景、攝影機 ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(PAPER);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 500
);
// 開場前先把鏡頭拉得很遠很高，「開卷」後再緩緩推近
camera.position.set(0, 40, 110);

const clock = new THREE.Clock();

// ---------- 全域狀態 ----------
const state = {
  chapter: -1,                    // 目前章節（-1 = 還在封面）
  mouse: new THREE.Vector2(),     // 滑鼠位置（-1 ~ 1）
  camPos: new THREE.Vector3(0, 40, 110),    // 鏡頭基準位置
  camTarget: new THREE.Vector3(0, 2, -15),  // 鏡頭看向的點
  tween: null,                    // 進行中的運鏡動畫
  fireEnabled: false,             // 是否允許點擊縱火（第四章）
  fireGlow: 0,                    // 江面火光目前值（平滑趨近目標）
  hovered: null,                  // 目前 hover 的船
};

// ==========================================================
// 江面
// ==========================================================
const MAX_RIPPLES = 16;
const ripples = []; // JS 端的漣漪清單 { x, z, t, strength }

const waterUniforms = {
  uTime: { value: 0 },
  uPaper: { value: PAPER.clone() },
  uInk: { value: INK.clone() },
  uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4()) },
  uRippleCount: { value: 0 },
  uFireGlow: { value: 0 },
  uFireCenter: { value: CAO_CENTER.clone() },
};

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 320),
  new THREE.ShaderMaterial({
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    uniforms: waterUniforms,
  })
);
water.rotation.x = -Math.PI / 2; // 平躺成水面
scene.add(water);

// 新增一個漣漪（滑鼠掃過或點擊江面時呼叫）
function addRipple(x, z, strength = 1) {
  ripples.push({ x, z, t: waterUniforms.uTime.value, strength });
  if (ripples.length > MAX_RIPPLES) ripples.shift(); // 太多就丟掉最舊的
}

// ==========================================================
// 遠山（四層，由遠淡到近濃）
// ==========================================================
function buildMountain({ z, height, density, seed }) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(560, height),
    new THREE.ShaderMaterial({
      vertexShader: mountainVertex,
      fragmentShader: mountainFragment,
      uniforms: {
        uInk: { value: new THREE.Color('#3a3f3e') }, // 帶一點青的墨（山色）
        uDensity: { value: density },
        uSeed: { value: seed },
      },
      transparent: true,
      depthWrite: false,
    })
  );
  m.position.set(0, height * 0.32, z);
  scene.add(m);
}
[
  { z: -200, height: 90, density: 0.20, seed: 1.3 }, // 最遠最淡
  { z: -170, height: 72, density: 0.30, seed: 4.7 },
  { z: -140, height: 55, density: 0.40, seed: 8.1 },
  { z: -115, height: 38, density: 0.50, seed: 2.9 }, // 最近最濃
].forEach(buildMountain);

// 天邊一輪朱紅落日（水墨畫常見的一點朱砂）
const sun = new THREE.Mesh(
  new THREE.CircleGeometry(7, 48),
  new THREE.MeshBasicMaterial({ color: '#b3382c', transparent: true, opacity: 0.65 })
);
sun.position.set(38, 34, -210);
scene.add(sun);

// ==========================================================
// 戰船
// ==========================================================
const lightDir = new THREE.Vector3(0.5, 1.0, 0.6); // 固定光向（畫面的留白方向）

// 建立一份「墨韻著色」材質（每艘船有自己的 hover / burn 狀態）
function makeInkMaterial({ battens = 0, inkTint = 1.0 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: shipVertex,
    fragmentShader: shipFragment,
    side: THREE.DoubleSide,
    uniforms: {
      uLightDir: { value: lightDir },
      uHover: { value: 0 },
      uBurn: { value: 0 },
      uTime: { value: 0 },
      uBattens: { value: battens },
      uInkTint: { value: inkTint },
    },
  });
}

// 船身的平面輪廓（俯視圖）：尖艏、寬腹、平艉
function makeHullGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-2.4, 0);
  s.quadraticCurveTo(-1.2, 0.62, 0.8, 0.55);
  s.quadraticCurveTo(1.7, 0.45, 1.9, 0);
  s.quadraticCurveTo(1.7, -0.45, 0.8, -0.55);
  s.quadraticCurveTo(-1.2, -0.62, -2.4, 0);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1.0, bevelEnabled: true,
    bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2); // 立起來：擠出方向變成船的高度
  return geo;
}
const hullGeo = makeHullGeometry();

// 帆：帶一點弧度的布面
function makeSailGeometry() {
  const geo = new THREE.PlaneGeometry(2.6, 3.2, 4, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const v = y / 3.2 + 0.5; // 0 = 帆底，1 = 帆頂
    pos.setX(i, x * (0.6 + 0.5 * v));                  // 中式硬帆：上寬下窄的扇形
    pos.setZ(i, Math.sin(v * Math.PI) * 0.45);         // 吃風的鼓起
  }
  geo.computeVertexNormals();
  return geo;
}
const sailGeo = makeSailGeometry();
const mastGeo = new THREE.CylinderGeometry(0.07, 0.11, 4.6, 6);
const flagGeo = new THREE.PlaneGeometry(0.85, 0.5);

const allShips = [];   // 所有船（做 hover / click 偵測用）
const caoShips = [];   // 曹軍船（火攻目標）

/**
 * 建一艘船
 * @param kind  'cao' 曹軍 | 'wu' 聯軍 | 'huanggai' 黃蓋火船
 */
function buildShip(kind, x, z, rotY = 0, scale = 1) {
  const group = new THREE.Group();
  const materials = [];

  const inkTint = kind === 'cao' ? 0.8 : 1.0; // 曹軍船墨色更深沉

  const hullMat = makeInkMaterial({ inkTint });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  group.add(hull);
  materials.push(hullMat);

  const mastMat = makeInkMaterial({ inkTint: 0.6 });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(-0.2, 2.1, 0);
  group.add(mast);
  materials.push(mastMat);

  const sailMat = makeInkMaterial({ battens: 1, inkTint: 1.15 });
  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.position.set(-0.2, 2.6, 0);
  // 帆面朝向鏡頭方向（z 軸），才看得到完整的帆
  group.add(sail);
  materials.push(sailMat);

  // 桅頂旗：黃蓋火船掛朱紅牙旗（畫面上唯一的紅，劇情關鍵）
  const flagColor = kind === 'huanggai' ? '#b3382c' : '#2b2823';
  const flag = new THREE.Mesh(
    flagGeo,
    new THREE.MeshBasicMaterial({ color: flagColor, side: THREE.DoubleSide })
  );
  flag.position.set(-0.65, 4.6, 0);
  group.add(flag);

  group.position.set(x, 0.15, z);
  group.rotation.y = rotY;
  group.scale.setScalar(scale);

  // 把互動需要的資料掛在 group 上
  group.userData = {
    isShip: true, kind, materials,
    burn: 0, burning: false, hoverLevel: 0,
    bobPhase: Math.random() * Math.PI * 2, // 隨波起伏的相位（每艘不同步）
    baseY: 0.15,
    name: kind === 'cao' ? '曹軍・連環戰船'
        : kind === 'huanggai' ? '黃蓋・詐降火船' : '孫劉聯軍・戰船',
  };
  // 讓子物件都能反查回整艘船
  group.traverse((o) => { o.userData.shipRoot = group; });

  scene.add(group);
  allShips.push(group);
  if (kind === 'cao') caoShips.push(group);
  return group;
}

// --- 曹軍連環船：江北烏林，兩排四列、緊密相連（鐵索連舟） ---
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 4; col++) {
    buildShip('cao', -14 + col * 7.5 + row * 1.5, -26 - row * 7, 0.12, 1.35);
  }
}
// --- 黃蓋火船：江心，正朝北衝 ---
buildShip('huanggai', -9, 4, 0.3, 0.85);
buildShip('huanggai', -4, 7, 0.2, 0.85);
buildShip('huanggai', -12, 9, 0.45, 0.85);
// --- 孫劉聯軍：江南列陣 ---
buildShip('wu', 6, 18, -0.15, 1.0);
buildShip('wu', 13, 21, -0.1, 1.0);
buildShip('wu', 20, 17, -0.25, 1.0);
buildShip('wu', 10, 26, 0.05, 1.0);
buildShip('wu', 17, 28, -0.2, 1.0);

// 曹軍船之間的鐵索（深色細圓柱，象徵連環）
(function buildChains() {
  const chainMat = new THREE.MeshBasicMaterial({ color: '#2b2823' });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const a = caoShips[row * 4 + col].position;
      const b = caoShips[row * 4 + col + 1].position;
      const len = a.distanceTo(b);
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, len, 4), chainMat
      );
      chain.position.lerpVectors(a, b, 0.5);
      chain.position.y = 0.5;
      chain.rotation.z = Math.PI / 2;
      chain.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
      scene.add(chain);
    }
  }
})();

// ==========================================================
// 火焰粒子（每艘船點燃時各掛一團）
// ==========================================================
const FIRE_PARTICLES = 140;

function igniteShip(ship) {
  const ud = ship.userData;
  if (ud.burning) return;
  ud.burning = true;

  // 建立這艘船的火焰粒子雲
  const geo = new THREE.BufferGeometry();
  const offsets = new Float32Array(FIRE_PARTICLES * 3);
  const seeds = new Float32Array(FIRE_PARTICLES);
  for (let i = 0; i < FIRE_PARTICLES; i++) {
    // 粒子起點散佈在船身範圍內
    offsets[i * 3 + 0] = (Math.random() - 0.5) * 4.5;
    offsets[i * 3 + 1] = 0.3 + Math.random() * 1.2;
    offsets[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    seeds[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(offsets.slice(), 3));
  geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: fireVertex,
    fragmentShader: fireFragment,
    uniforms: {
      uTime: { value: waterUniforms.uTime.value },
      uStart: { value: waterUniforms.uTime.value },
      uIntensity: { value: 0 }, // 從 0 漸強
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending, // 疊加混色 → 火光發亮
  });

  const fire = new THREE.Points(geo, mat);
  ship.add(fire);
  ud.fire = fire;

  // 在船底激起一圈大墨痕（火船衝撞的水花）
  addRipple(ship.position.x, ship.position.z, 2.2);

  // 鐵索連舟：火勢延燒到左右相鄰的船（0.65 秒一艘）
  const idx = caoShips.indexOf(ship);
  if (idx !== -1) {
    const row = Math.floor(idx / 4), col = idx % 4;
    const neighbors = [];
    if (col > 0) neighbors.push(caoShips[row * 4 + col - 1]);
    if (col < 3) neighbors.push(caoShips[row * 4 + col + 1]);
    neighbors.push(caoShips[((row + 1) % 2) * 4 + col]); // 另一排同列
    neighbors.forEach((n, i) => {
      setTimeout(() => igniteShip(n), 650 + i * 200);
    });
  }

  updateFireStatus();
}

// 統計燒了幾艘，更新江面火光與章節提示文字
function updateFireStatus() {
  const burnt = caoShips.filter((s) => s.userData.burning).length;
  // 火光上限壓在 0.8，保留畫面的紙墨基調
  state.fireGlowTarget = (burnt / caoShips.length) * 0.8;

  const actionEl = document.getElementById('ch-action');
  if (state.chapter === 3 && burnt > 0) {
    actionEl.textContent = burnt >= caoShips.length
      ? '火烈風猛，燒盡北船——延及岸上營落！'
      : `火勢沿鐵索蔓延……已焚 ${burnt} / ${caoShips.length} 艘`;
  }
}
state.fireGlowTarget = 0;

// ==========================================================
// 東南風粒子（第四章顯示）
// ==========================================================
const wind = (function buildWind() {
  const COUNT = 240;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = 1 + Math.random() * 12;
    pos[i * 3 + 2] = 20 - Math.random() * 60;
    seeds[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: windVertex,
    fragmentShader: windFragment,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  scene.add(points);
  return points;
})();

// ==========================================================
// 滑鼠互動：漣漪、hover、click
// ==========================================================
const raycaster = new THREE.Raycaster();
const tooltip = document.getElementById('tooltip');
let lastRippleTime = 0;

window.addEventListener('pointermove', (e) => {
  state.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  state.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (state.chapter < 0) return; // 封面期間不互動

  raycaster.setFromCamera(state.mouse, camera);

  // --- hover 偵測：先看有沒有指到船 ---
  const hits = raycaster.intersectObjects(allShips, true);
  const ship = hits.length ? hits[0].object.userData.shipRoot : null;
  state.hovered = ship;

  if (ship) {
    document.body.style.cursor = 'pointer';
    tooltip.textContent = ship.userData.name;
    tooltip.classList.remove('hidden');
    tooltip.style.left = e.clientX + 'px';
    tooltip.style.top = e.clientY + 'px';
  } else {
    document.body.style.cursor = '';
    tooltip.classList.add('hidden');
  }

  // --- 江面漣漪：滑鼠掃過水面就暈開墨痕（限流：每 90ms 一個） ---
  const now = performance.now();
  if (now - lastRippleTime > 90) {
    const wHits = raycaster.intersectObject(water);
    if (wHits.length) {
      addRipple(wHits[0].point.x, wHits[0].point.z, 0.9);
      lastRippleTime = now;
    }
  }
});

window.addEventListener('click', (e) => {
  if (state.chapter < 0) return;
  // 點到 UI（面板、按鈕）就不處理 3D 場景
  if (e.target.closest('#panel, #infocard, #masthead')) return;

  raycaster.setFromCamera(state.mouse, camera);
  const hits = raycaster.intersectObjects(allShips, true);

  if (hits.length) {
    const ship = hits[0].object.userData.shipRoot;
    // 第四章 + 點曹軍船 → 縱火！
    if (state.fireEnabled && ship.userData.kind === 'cao') {
      igniteShip(ship);
      hideInfoCard();
    } else {
      showInfoCard(ship.userData.kind); // 其他情況 → 顯示史料小卡
    }
    return;
  }

  // 點到江面 → 一記重墨漣漪
  const wHits = raycaster.intersectObject(water);
  if (wHits.length) addRipple(wHits[0].point.x, wHits[0].point.z, 1.6);
});

// ---------- 史料小卡 ----------
const infocard = document.getElementById('infocard');
function showInfoCard(kind) {
  const info = FLEET_INFO[kind];
  if (!info) return;
  document.getElementById('infocard-title').textContent = info.title;
  document.getElementById('infocard-text').textContent = info.text;
  infocard.classList.remove('hidden');
}
function hideInfoCard() { infocard.classList.add('hidden'); }
document.getElementById('infocard-close').addEventListener('click', hideInfoCard);

// ==========================================================
// 章節切換與運鏡
// ==========================================================
const chTitleEl = document.getElementById('ch-title');
const chNumEl = document.getElementById('ch-num');
const chSubEl = document.getElementById('ch-sub');
const chTextEl = document.getElementById('ch-text');
const chActionEl = document.getElementById('ch-action');
const btnNext = document.getElementById('btn-next');
const dotsEl = document.getElementById('dots');

// 產生章節導覽圓點
CHAPTERS.forEach((ch, i) => {
  const dot = document.createElement('button');
  dot.title = ch.title;
  dot.addEventListener('click', () => goChapter(i));
  dotsEl.appendChild(dot);
});

// 緩入緩出的運鏡（自己寫的小補間動畫，不用外部函式庫）
function tweenCamera(toPos, toTarget, duration = 2.4) {
  state.tween = {
    fromPos: state.camPos.clone(),
    fromTarget: state.camTarget.clone(),
    toPos: new THREE.Vector3(...toPos),
    toTarget: new THREE.Vector3(...toTarget),
    t: 0,
    duration,
  };
}

function goChapter(i) {
  if (i < 0 || i >= CHAPTERS.length || i === state.chapter) return;
  state.chapter = i;
  const ch = CHAPTERS[i];

  // 文字淡出 → 換內容 → 淡入
  chTextEl.classList.add('fading');
  setTimeout(() => {
    chNumEl.textContent = ch.num;
    chTitleEl.textContent = ch.title;
    chSubEl.textContent = ch.sub;
    chTextEl.textContent = ch.text;
    chTextEl.classList.remove('fading');

    if (ch.action) {
      chActionEl.textContent = ch.action;
      chActionEl.classList.remove('hidden');
    } else {
      chActionEl.classList.add('hidden');
    }
  }, 400);

  // 運鏡到本章視角
  tweenCamera(ch.cam.pos, ch.cam.target);

  // 套用本章的場景狀態
  state.fireEnabled = !!ch.flags.fireEnabled;
  wind.visible = !!ch.flags.wind;
  if (ch.flags.burnAll) {
    // 第五章：若讀者沒親手放火，史實仍要發生——自動延燒
    caoShips.forEach((s, k) => {
      if (!s.userData.burning) setTimeout(() => igniteShip(s), k * 300);
    });
  }

  // 更新導覽圓點與按鈕
  [...dotsEl.children].forEach((d, k) => d.classList.toggle('active', k === i));
  btnNext.disabled = i === CHAPTERS.length - 1;
  btnNext.textContent = i === CHAPTERS.length - 1 ? '卷　終' : '下一章 →';

  hideInfoCard();
}

btnNext.addEventListener('click', () => goChapter(state.chapter + 1));

// ---------- 開卷 ----------
document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('intro').classList.add('gone');
  document.body.classList.add('started');
  goChapter(0);
});

// 提供給自動化測試用的小後門（不影響一般使用）
window.__APP = { goChapter, igniteShip, caoShips, state, addRipple };

// ==========================================================
// 每一格畫面的更新（動畫主迴圈）
// ==========================================================
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // --- 更新水面 uniform ---
  waterUniforms.uTime.value = t;
  waterUniforms.uRippleCount.value = ripples.length;
  ripples.forEach((r, i) => {
    waterUniforms.uRipples.value[i].set(r.x, r.z, r.t, r.strength);
  });
  // 淘汰存在超過 4 秒的舊漣漪
  while (ripples.length && t - ripples[0].t > 4) ripples.shift();

  // 江面火光朝目標值平滑趨近
  state.fireGlow += (state.fireGlowTarget - state.fireGlow) * dt * 0.8;
  waterUniforms.uFireGlow.value = state.fireGlow;

  // --- 更新每艘船：隨波起伏、hover 漸變、焚燒進度 ---
  allShips.forEach((ship) => {
    const ud = ship.userData;
    // 隨波起伏（每艘相位不同）
    ship.position.y = ud.baseY + Math.sin(t * 1.1 + ud.bobPhase) * 0.12;
    ship.rotation.z = Math.sin(t * 0.9 + ud.bobPhase) * 0.025;

    // hover 值平滑趨近（有 hover 時亮起朱色）
    const hoverTarget = state.hovered === ship ? 1 : 0;
    ud.hoverLevel += (hoverTarget - ud.hoverLevel) * dt * 8;

    // 焚燒進度慢慢推進到全焦
    if (ud.burning && ud.burn < 1) {
      ud.burn = Math.min(ud.burn + dt * 0.16, 1);
    }
    ud.materials.forEach((m) => {
      m.uniforms.uHover.value = ud.hoverLevel;
      m.uniforms.uBurn.value = ud.burn;
      m.uniforms.uTime.value = t;
    });

    // 火焰粒子：更新時間、火勢漸強
    if (ud.fire) {
      const fu = ud.fire.material.uniforms;
      fu.uTime.value = t;
      fu.uIntensity.value = Math.min(fu.uIntensity.value + dt * 0.5, 1);
    }
  });

  // --- 東南風 ---
  if (wind.visible) {
    wind.material.uniforms.uTime.value = t;
    const wu = wind.material.uniforms.uOpacity;
    wu.value = Math.min(wu.value + dt * 0.5, 1);
  }

  // --- 運鏡補間 ---
  if (state.tween) {
    const tw = state.tween;
    tw.t = Math.min(tw.t + dt / tw.duration, 1);
    // easeInOutCubic：先慢、中快、後慢
    const k = tw.t < 0.5
      ? 4 * tw.t ** 3
      : 1 - Math.pow(-2 * tw.t + 2, 3) / 2;
    state.camPos.lerpVectors(tw.fromPos, tw.toPos, k);
    state.camTarget.lerpVectors(tw.fromTarget, tw.toTarget, k);
    if (tw.t >= 1) state.tween = null;
  }

  // --- 滑鼠視差：鏡頭隨滑鼠輕輕飄移，增加立體感 ---
  const px = state.mouse.x * 2.2;
  const py = -state.mouse.y * 1.2;
  camera.position.set(
    state.camPos.x + px,
    state.camPos.y + py,
    state.camPos.z
  );
  camera.lookAt(state.camTarget);

  renderer.render(scene, camera);
}
animate();

// ---------- 視窗縮放 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
