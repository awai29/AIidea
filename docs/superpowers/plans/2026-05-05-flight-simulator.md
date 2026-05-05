# Flight Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clone dimartarmizi/web-flight-simulator and extend it with an aircraft selection screen, Iron Man Mark 85 playable character, and random global spawn points.

**Architecture:** The base project uses CesiumJS for real-world terrain streaming and Three.js for local 3D rendering (aircraft model, particle effects, lighting). New aircraft are added as config objects with their own model paths, physics parameters, and effects. A pre-game selection screen overlays the canvas before the Cesium/Three.js scene initializes.

**Tech Stack:** Vite, Three.js, CesiumJS, vanilla JavaScript, GLB/glTF models, Vercel (deploy)

---

## Before You Start: User Actions Required

These two steps require the user (not the agent) to complete before running Task 1.

### A. Get Cesium Ion API Key (free)

1. Go to https://ion.cesium.com/signup and create a free account
2. After logging in, click "Access Tokens" in the left sidebar
3. Copy the "Default Token" value
4. You will paste this into the `.env` file in Task 1

### B. Download Iron Man Mark 85 Model (free)

1. Go to https://sketchfab.com/3d-models/iron-man-mark-85-rigged-dde1085c464d4f8da259fe6669ae4dd2
2. Log in or create a free Sketchfab account
3. Click "Download 3D Model" → choose **GLB** format
4. Rename the downloaded file to `ironman.glb`
5. Keep it ready — you will place it in the project in Task 2

---

## File Map

Files to **create**:
- `src/aircraftConfig.js` — aircraft definitions (F-15 and Iron Man params, model paths, physics, weapons)
- `src/spawnLocations.js` — array of named global landmark coordinates
- `src/selectionScreen.js` — selection screen DOM creation, styling, and event handling
- `src/ironmanEffects.js` — foot thruster particles and palm glow for Iron Man

Files to **modify** (exact line numbers determined after cloning):
- `src/main.js` (or project entry point) — import and show selection screen before game init, pass chosen aircraft to game
- whichever file initializes the Cesium camera/viewer starting position — replace fixed coords with `getRandomSpawn()`
- whichever file loads the F-15 GLB model — extend to support loading any model path from config
- whichever file manages afterburner/thruster particle effects — branch on aircraft type to use Iron Man foot thruster
- whichever file manages weapon firing — branch on aircraft type to fire repulsor beam instead of missile

---

## Task 1: Clone & Environment Setup

**Files:**
- Create: `flight-simulator/` (cloned repo)
- Create: `flight-simulator/.env`

- [ ] **Step 1: Clone the base project**

```bash
cd /Users/weiwumbp2024/aiproject
git clone https://github.com/dimartarmizi/web-flight-simulator flight-simulator
cd flight-simulator
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: packages install without error.

- [ ] **Step 3: Create the .env file with your Cesium token**

Create file `flight-simulator/.env`:
```
VITE_CESIUM_TOKEN=PASTE_YOUR_TOKEN_HERE
```

Replace `PASTE_YOUR_TOKEN_HERE` with the token you copied from Cesium Ion.

- [ ] **Step 4: Start the dev server and verify it runs**

```bash
npm run dev
```

Open the URL shown (usually http://localhost:5173) in a browser. You should see the F-15 simulator flying over real terrain. If you see a blank screen or error, check the `.env` token is correct.

- [ ] **Step 5: Stop the dev server (Ctrl+C), then read and document the project structure**

```bash
find src -type f | sort
```

Read each file in `src/` to understand what each one does. Note:
- Which file sets the starting latitude/longitude/altitude
- Which file loads the F-15 GLB model (look for `GLTFLoader` or `.glb`)
- Which file manages particle effects / afterburner (look for `ParticleSystem` or `afterburner`)
- Which file handles weapon firing (look for `missile` or `shoot`)
- Which file is the main entry point (likely `main.js` or `index.js`)

Write these down — you will need them for Tasks 3–7.

---

## Task 2: Place Iron Man Model

**Files:**
- Add: `public/models/ironman.glb`

- [ ] **Step 1: Copy the Iron Man GLB file into the project**

```bash
# Adjust the source path to wherever you saved ironman.glb
cp ~/Downloads/ironman.glb /Users/weiwumbp2024/aiproject/flight-simulator/public/models/ironman.glb
```

- [ ] **Step 2: Verify the file is there**

```bash
ls -lh /Users/weiwumbp2024/aiproject/flight-simulator/public/models/
```

Expected: `ironman.glb` appears in the list with a non-zero file size (expect 5–50 MB).

---

## Task 3: Aircraft Config System

**Files:**
- Create: `src/aircraftConfig.js`

- [ ] **Step 1: Create the aircraft config file**

Create `src/aircraftConfig.js`:
```js
// 每個機型的完整定義。
// physics 數值控制飛行手感：turnRate 越高轉彎越靈活，maxSpeed 控制頂速。
// effects 告訴遊戲要顯示哪種特效。
// weapons 告訴遊戲要發射哪種武器。

export const AIRCRAFT = {
  f15: {
    id: 'f15',
    name: 'F-15 Eagle',
    description: 'High-speed air superiority fighter',
    weapons: 'M61A1 Cannon · AIM-9 Missiles · MJU-7A Flares',
    modelPath: null, // 使用原專案已內建的 F-15（保持原本載入邏輯）
    physics: {
      maxSpeed: 800,        // knots，頂速
      minSpeed: 120,        // 低於此速度會失速
      turnRate: 1.0,        // 1.0 = 原版手感
      throttleStep: 10,
      afterburnerBoost: 200,
    },
    effects: {
      thrusterType: 'afterburner', // 原版後燃器特效
      thrusterColor: 0xff6600,
      palmGlow: false,
    },
    weaponType: 'missile',  // 原版飛彈邏輯
  },

  ironman: {
    id: 'ironman',
    name: 'Iron Man Mark 85',
    description: 'Stark Industries powered armor',
    weapons: 'Repulsor Beam',
    modelPath: '/models/ironman.glb',
    scale: 0.003,          // GLB 模型縮放比例（依實際大小調整）
    rotationOffset: { x: 0, y: Math.PI, z: 0 }, // 讓模型朝正確方向
    physics: {
      maxSpeed: 600,
      minSpeed: 0,          // Iron Man 不需要速度就能飛
      turnRate: 1.8,        // 比 F-15 更靈活
      throttleStep: 8,
      afterburnerBoost: 150,
    },
    effects: {
      thrusterType: 'foot_jets', // 腳底噴射特效
      thrusterColor: 0xff4400,
      palmGlow: true,            // 掌心藍光
      palmGlowColor: 0x00aaff,
    },
    weaponType: 'repulsor', // 光束炮邏輯
  },
};

// 根據 ID 取得機型設定
export function getAircraft(id) {
  return AIRCRAFT[id] ?? AIRCRAFT.f15;
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

```bash
cd /Users/weiwumbp2024/aiproject/flight-simulator
node --input-type=module < src/aircraftConfig.js && echo "OK"
```

Expected: `OK` (no errors).

---

## Task 4: Random Spawn Locations

**Files:**
- Create: `src/spawnLocations.js`
- Modify: the file that sets the initial Cesium camera position (identified in Task 1 Step 5)

- [ ] **Step 1: Create the spawn locations file**

Create `src/spawnLocations.js`:
```js
// 全球地標座標清單（latitude, longitude, altitude 單位：公尺）
// 每次進入遊戲時隨機選一個作為出生點。
// 避免純海洋座標，選擇有明顯地形的地點。

export const SPAWN_LOCATIONS = [
  { name: 'Grand Canyon, USA',       lat: 36.1069, lon: -112.1129, alt: 2500 },
  { name: 'Mount Fuji, Japan',       lat: 35.3606, lon:  138.7274, alt: 4500 },
  { name: 'Swiss Alps',              lat: 46.8182, lon:    8.2275, alt: 3000 },
  { name: 'Norwegian Fjords',        lat: 61.2000, lon:    6.8000, alt: 1500 },
  { name: 'Himalayas, Nepal',        lat: 27.9881, lon:   86.9250, alt: 6000 },
  { name: 'Jade Mountain, Taiwan',   lat: 23.4706, lon:  120.9572, alt: 4000 },
  { name: 'Patagonia, Argentina',    lat: -50.9423, lon: -73.4068, alt: 2000 },
  { name: 'Sahara Desert, Algeria',  lat: 25.0000, lon:    2.0000, alt: 1500 },
  { name: 'Kilimanjaro, Tanzania',   lat: -3.0674, lon:   37.3556, alt: 5500 },
  { name: 'New Zealand Southern Alps', lat: -43.5, lon: 170.0,    alt: 2500 },
  { name: 'Rocky Mountains, Canada', lat: 51.1784, lon: -115.5708, alt: 3000 },
  { name: 'Iceland Volcanoes',       lat: 64.9631, lon:  -19.0208, alt: 1800 },
];

// 回傳隨機一個出生點
export function getRandomSpawn() {
  const index = Math.floor(Math.random() * SPAWN_LOCATIONS.length);
  return SPAWN_LOCATIONS[index];
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

```bash
node --input-type=module < src/spawnLocations.js && echo "OK"
```

Expected: `OK`.

- [ ] **Step 3: Find and modify the initial spawn position in the game code**

Read the file identified in Task 1 Step 5 that sets the starting lat/lon/altitude.
It will look something like:
```js
// 原本寫死的座標（每個專案的變數名可能不同）
const startLat = 36.1069;
const startLon = -112.1129;
const startAlt = 2500;
```

Replace with:
```js
import { getRandomSpawn } from './spawnLocations.js';

const spawn = getRandomSpawn();
console.log(`Spawning at: ${spawn.name}`);
const startLat = spawn.lat;
const startLon = spawn.lon;
const startAlt = spawn.alt;
```

- [ ] **Step 4: Test random spawn**

```bash
npm run dev
```

Refresh the browser 3 times. Each time you should start at a different location on the globe. Check the browser console to see "Spawning at: [location name]" to confirm randomness is working.

- [ ] **Step 5: Commit**

```bash
git add src/spawnLocations.js src/aircraftConfig.js
git add -p  # stage only the spawn-related change in the modified game file
git commit -m "新增：全球隨機出生點與機型設定架構"
```

---

## Task 5: Aircraft Selection Screen

**Files:**
- Create: `src/selectionScreen.js`
- Modify: `src/main.js` (or project entry point)

- [ ] **Step 1: Create the selection screen module**

Create `src/selectionScreen.js`:
```js
import { AIRCRAFT } from './aircraftConfig.js';

// 建立並顯示選機畫面，回傳一個 Promise。
// Promise resolve 時會帶入玩家選擇的機型 ID（'f15' 或 'ironman'）。
export function showSelectionScreen() {
  return new Promise((resolve) => {
    // 外層容器：全螢幕黑底
    const overlay = document.createElement('div');
    overlay.id = 'selection-screen';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      fontFamily: "'Courier New', monospace",
      color: '#e0e0e0',
    });

    // 標題
    const title = document.createElement('h1');
    title.textContent = 'SELECT YOUR AIRCRAFT';
    Object.assign(title.style, {
      fontSize: '2rem',
      letterSpacing: '0.3em',
      marginBottom: '3rem',
      color: '#00cfff',
      textShadow: '0 0 20px rgba(0,207,255,0.5)',
    });
    overlay.appendChild(title);

    // 卡片容器
    const cardRow = document.createElement('div');
    Object.assign(cardRow.style, {
      display: 'flex',
      gap: '2rem',
      flexWrap: 'wrap',
      justifyContent: 'center',
    });

    // 為每個機型建立卡片
    Object.values(AIRCRAFT).forEach((aircraft) => {
      const card = document.createElement('div');
      Object.assign(card.style, {
        width: '280px',
        padding: '2rem',
        border: '1px solid rgba(0,207,255,0.3)',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'center',
      });

      card.innerHTML = `
        <div style="font-size:1.4rem;font-weight:bold;margin-bottom:0.5rem;color:#00cfff;">
          ${aircraft.name}
        </div>
        <div style="font-size:0.85rem;color:#aaa;margin-bottom:1rem;">
          ${aircraft.description}
        </div>
        <div style="font-size:0.75rem;color:#666;border-top:1px solid rgba(255,255,255,0.1);padding-top:1rem;">
          ARMAMENT<br>
          <span style="color:#e0e0e0;">${aircraft.weapons}</span>
        </div>
      `;

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#00cfff';
        card.style.background = 'rgba(0,207,255,0.1)';
        card.style.transform = 'translateY(-4px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'rgba(0,207,255,0.3)';
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.transform = 'translateY(0)';
      });
      card.addEventListener('click', () => {
        overlay.remove();
        resolve(aircraft.id);
      });

      cardRow.appendChild(card);
    });

    overlay.appendChild(cardRow);
    document.body.appendChild(overlay);
  });
}
```

- [ ] **Step 2: Show selection screen before game init**

In `src/main.js` (or the entry point identified in Task 1), add at the very top of the init sequence:

```js
import { showSelectionScreen } from './selectionScreen.js';

// 在遊戲初始化之前等待玩家選機
const chosenAircraftId = await showSelectionScreen();
console.log('Player chose:', chosenAircraftId);

// 將 chosenAircraftId 傳入後續的遊戲初始化流程
// （在下面的任務中，各系統會從 aircraftConfig 讀取設定）
```

If the project entry point is not already an async function or module, wrap the init code in an async IIFE:
```js
(async () => {
  const chosenAircraftId = await showSelectionScreen();
  // ... 其餘初始化代碼
})();
```

- [ ] **Step 3: Store chosen aircraft ID so other modules can read it**

In `src/main.js`, after resolving the selection, export or assign the chosen ID to a module-level variable so other parts of the code can access it:

```js
// 在 main.js 頂部（module scope）
export let selectedAircraftId = 'f15'; // 預設值

// 在選機完成後
selectedAircraftId = chosenAircraftId;
```

- [ ] **Step 4: Test the selection screen**

```bash
npm run dev
```

Open the browser. You should see the dark selection screen with two cards (F-15 Eagle and Iron Man Mark 85). Clicking a card should dismiss the screen and start the game (still with the F-15 model — Iron Man model loads in the next task). Check the browser console for "Player chose: ironman" when you pick Iron Man.

- [ ] **Step 5: Commit**

```bash
git add src/selectionScreen.js
git add -p  # stage only main.js changes
git commit -m "新增：選機畫面（F-15 / Iron Man）"
```

---

## Task 6: Iron Man Model Loading

**Files:**
- Modify: whichever file loads the aircraft GLB model (identified in Task 1 Step 5)

- [ ] **Step 1: Read the existing model loading code**

Find the file that uses `GLTFLoader` to load the F-15 model. It will look like:
```js
const loader = new GLTFLoader();
loader.load('/models/f15.glb', (gltf) => {
  // ... model setup code
});
```

Read and understand all the model setup code: scale, rotation, position offsets, shadow settings, any bone/animation setup.

- [ ] **Step 2: Import aircraft config at the top of that file**

```js
import { getAircraft } from './aircraftConfig.js';
import { selectedAircraftId } from './main.js';
```

- [ ] **Step 3: Replace the hardcoded F-15 load with aircraft-aware loading**

Replace the existing `loader.load(...)` call with:

```js
const aircraft = getAircraft(selectedAircraftId);

// F-15 は原專案已有自己的載入邏輯，只有切換到 Iron Man 時才用新路徑
const modelPath = aircraft.modelPath ?? '/models/f15.glb'; // fallback 到原本路徑

const loader = new GLTFLoader();
loader.load(modelPath, (gltf) => {
  const model = gltf.scene;

  // 套用機型特定的縮放與旋轉（Iron Man 需要調整）
  if (aircraft.scale) {
    model.scale.setScalar(aircraft.scale);
  }
  if (aircraft.rotationOffset) {
    model.rotation.x = aircraft.rotationOffset.x;
    model.rotation.y = aircraft.rotationOffset.y;
    model.rotation.z = aircraft.rotationOffset.z;
  }

  // 其餘原本的 model setup 代碼保持不動
  // (shadow, scene.add, etc.)
});
```

- [ ] **Step 4: Test Iron Man model appears**

```bash
npm run dev
```

Select Iron Man in the selection screen. The Iron Man Mark 85 model should appear in place of the F-15. If the model appears too large or facing wrong direction, adjust `scale` and `rotationOffset` in `src/aircraftConfig.js`:
- If Iron Man is too big: decrease `scale` (e.g., from `0.003` to `0.001`)
- If Iron Man faces backwards: change `rotationOffset.y` from `Math.PI` to `0`
- If Iron Man is sideways: adjust `rotationOffset.x` or `rotationOffset.z`

Repeat until the model looks correct in-flight view (camera follows from behind, Iron Man visible and correctly oriented).

- [ ] **Step 5: Commit**

```bash
git add -p  # stage model loading changes only
git commit -m "新增：Iron Man Mark 85 模型載入"
```

---

## Task 7: Iron Man Visual Effects

**Files:**
- Create: `src/ironmanEffects.js`
- Modify: whichever file manages afterburner/thruster particle effects

- [ ] **Step 1: Create the Iron Man effects module**

Create `src/ironmanEffects.js`:
```js
import * as THREE from 'three';

// 建立 Iron Man 腳底噴射特效（橘紅色火焰粒子）
// scene: THREE.Scene
// 回傳 { update(delta), dispose() }
export function createFootJets(scene) {
  const particleCount = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      -(Math.random() * 2 + 1),   // 向下噴射
      (Math.random() - 0.5) * 0.3
    ));
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xff4400,
    size: 0.5,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const lifetimes = new Float32Array(particleCount).map(() => Math.random());

  return {
    // 每幀呼叫，aircraftPosition 是 THREE.Vector3
    update(delta, aircraftPosition) {
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        lifetimes[i] -= delta * 2;
        if (lifetimes[i] <= 0) {
          // 重置粒子到腳底位置
          pos[i * 3]     = aircraftPosition.x + (Math.random() - 0.5) * 0.5;
          pos[i * 3 + 1] = aircraftPosition.y - 2;  // 腳底偏移
          pos[i * 3 + 2] = aircraftPosition.z + (Math.random() - 0.5) * 0.5;
          lifetimes[i] = 1;
        } else {
          pos[i * 3]     += velocities[i].x * delta * 10;
          pos[i * 3 + 1] += velocities[i].y * delta * 10;
          pos[i * 3 + 2] += velocities[i].z * delta * 10;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = 0.6 + Math.random() * 0.2; // 閃爍效果
    },

    dispose() {
      scene.remove(particles);
      geometry.dispose();
      material.dispose();
    },
  };
}

// 建立 Iron Man 掌心藍光（常態發光球體）
// 回傳 THREE.Mesh，需要 add 到 aircraftModel
export function createPalmGlow() {
  const geometry = new THREE.SphereGeometry(0.15, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(geometry, material);

  // 加入輕微脈動動畫
  let time = 0;
  glow.userData.pulse = (delta) => {
    time += delta * 3;
    glow.material.opacity = 0.5 + Math.sin(time) * 0.2;
  };

  return glow;
}
```

- [ ] **Step 2: Hook Iron Man effects into the game loop**

Find the file that manages the afterburner particles and the main render/update loop.

At the top of that file, add:
```js
import { createFootJets, createPalmGlow } from './ironmanEffects.js';
import { getAircraft } from './aircraftConfig.js';
import { selectedAircraftId } from './main.js';
```

After the aircraft model loads, add (inside the `loader.load` callback):
```js
const aircraft = getAircraft(selectedAircraftId);

let footJets = null;
let palmGlowLeft = null;
let palmGlowRight = null;

if (aircraft.effects.thrusterType === 'foot_jets') {
  // 隱藏原本的後燃器特效（如果有的話）
  // 找到後燃器 mesh/system 並設 visible = false

  footJets = createFootJets(scene);

  if (aircraft.effects.palmGlow) {
    palmGlowLeft  = createPalmGlow();
    palmGlowRight = createPalmGlow();
    // 將掌心光球加到 Iron Man 模型的左右手位置
    // 位置依實際模型骨骼調整：
    palmGlowLeft.position.set(-1.0, 0, 0);   // 左手掌心（相對模型）
    palmGlowRight.position.set(1.0, 0, 0);   // 右手掌心
    model.add(palmGlowLeft);
    model.add(palmGlowRight);
  }
}
```

In the main render/update loop (`requestAnimationFrame` callback), add:
```js
const delta = clock.getDelta(); // 若已有 clock，直接用

if (footJets) {
  footJets.update(delta, aircraftWorldPosition); // 傳入飛機當前世界座標
}
if (palmGlowLeft) {
  palmGlowLeft.userData.pulse(delta);
  palmGlowRight.userData.pulse(delta);
}
```

- [ ] **Step 3: Test Iron Man effects**

```bash
npm run dev
```

Select Iron Man. Verify:
- Orange/red particles spray downward from the feet
- Blue glow is visible on both palms
- F-15 afterburner is not visible when Iron Man is selected

If foot jet particles appear at wrong position, adjust `pos[i * 3 + 1] = aircraftPosition.y - 2` offset in `ironmanEffects.js`.

- [ ] **Step 4: Commit**

```bash
git add src/ironmanEffects.js
git add -p  # stage only effects hook changes
git commit -m "新增：Iron Man 腳底噴射與掌心藍光特效"
```

---

## Task 8: Iron Man Repulsor Beam Weapon

**Files:**
- Modify: whichever file handles weapon firing

- [ ] **Step 1: Read the existing weapon firing code**

Find the file that handles missile firing (look for `shoot`, `fire`, `missile`, or the weapon key handler). Understand:
- What object/mesh is created when a missile fires
- How it moves forward each frame
- How it is removed (on impact or timeout)

- [ ] **Step 2: Add repulsor beam to the weapon file**

At the top of that file add:
```js
import { getAircraft } from './aircraftConfig.js';
import { selectedAircraftId } from './main.js';
```

Add a function to create a repulsor beam projectile (add this near the existing missile-creation code):
```js
function createRepulsorBeam(scene, startPosition, direction) {
  // 光束本體：藍白色細長圓柱
  const geometry = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
  geometry.rotateX(Math.PI / 2); // 讓圓柱朝向 Z 軸（飛行方向）
  const material = new THREE.MeshBasicMaterial({
    color: 0x88ddff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(geometry, material);
  beam.position.copy(startPosition);
  scene.add(beam);

  // 光暈：較大、較透明的圓柱
  const glowGeo = new THREE.CylinderGeometry(0.3, 0.3, 8, 8);
  glowGeo.rotateX(Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  beam.add(glow);

  return {
    mesh: beam,
    velocity: direction.clone().multiplyScalar(600), // 光束速度（m/s）
    lifetime: 3,  // 3 秒後消失
    update(delta) {
      beam.position.addScaledVector(this.velocity, delta);
      this.lifetime -= delta;
    },
    dispose() {
      scene.remove(beam);
      geometry.dispose();
      material.dispose();
      glowGeo.dispose();
      glowMat.dispose();
    },
  };
}
```

- [ ] **Step 3: Branch the fire function on aircraft type**

Find the existing missile fire function. Wrap the missile creation in a condition and add the repulsor alternative:

```js
function fireWeapon() {
  const aircraft = getAircraft(selectedAircraftId);

  if (aircraft.weaponType === 'repulsor') {
    // Iron Man 光束炮
    const beam = createRepulsorBeam(scene, aircraftPosition.clone(), forwardDirection.clone());
    activeProjectiles.push(beam); // 加入現有的拋射物陣列（名稱依原專案而定）
  } else {
    // 原本的飛彈邏輯（保持不動）
    // ... 原有的 missile 建立代碼 ...
  }
}
```

In the projectile update loop (wherever missiles are updated each frame), the existing loop should already handle `activeProjectiles` — the beam's `update(delta)` and `dispose()` methods match the missile interface, so no change needed there if the original code calls `.update(delta)` and checks `.lifetime`.

- [ ] **Step 4: Test the repulsor beam**

```bash
npm run dev
```

Select Iron Man. Press the fire key (same key as original missiles, check the controls in the original README or key handler). You should see a blue-white beam shoot forward from the Iron Man model. It should travel fast and disappear after ~3 seconds.

- [ ] **Step 5: Commit**

```bash
git add -p  # stage only weapon file changes
git commit -m "新增：Iron Man 掌心光束炮武器"
```

---

## Task 9: Final Polish & Deploy

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Add attribution for Iron Man model in the game UI**

Find the footer or credits section of the HTML (or add one). Add:
```html
<!-- Iron Man model credit (CC Attribution required) -->
<div style="position:fixed;bottom:4px;right:8px;font-size:10px;color:rgba(255,255,255,0.3);pointer-events:none;">
  Iron Man Mark 85 model by Nihar Arora (CC BY)
</div>
```

- [ ] **Step 2: Full smoke-test before deploy**

```bash
npm run dev
```

Go through this checklist manually:
- [ ] Selection screen appears on load
- [ ] Both cards (F-15 and Iron Man) are visible and hoverable
- [ ] Selecting F-15 → F-15 model appears, missiles fire, no foot jets
- [ ] Selecting Iron Man → Iron Man model appears, repulsor fires, foot jets visible, palm glow visible
- [ ] Both aircraft spawn at different global locations on each page refresh
- [ ] HUD (altitude, speed, heading) shows for both aircraft

- [ ] **Step 3: Build for production**

```bash
npm run build
```

Expected: build completes with no errors. Output goes to `dist/`.

- [ ] **Step 4: Create vercel.json for correct routing**

Create `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 5: Push to GitHub**

```bash
git add vercel.json
git commit -m "新增：Vercel 部署設定"
git remote add origin https://github.com/YOUR_USERNAME/flight-simulator.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. If you don't have a GitHub repo yet, create one at https://github.com/new (name it `flight-simulator`, keep it public).

- [ ] **Step 6: Deploy on Vercel**

1. Go to https://vercel.com and log in (or sign up free)
2. Click "Add New Project"
3. Connect your GitHub account and select the `flight-simulator` repo
4. Under "Environment Variables", add: `VITE_CESIUM_TOKEN` = your Cesium token
5. Click "Deploy"
6. Wait ~2 minutes. Vercel will give you a URL like `flight-simulator-xxx.vercel.app`

- [ ] **Step 7: Verify live deployment**

Open the Vercel URL in a browser (not localhost). Test:
- Selection screen loads
- Both aircraft work
- Terrain loads (confirms Cesium token is set correctly in Vercel env vars)

---

## Summary of All Commits

| Commit | Content |
|--------|---------|
| 新增：全球隨機出生點與機型設定架構 | spawnLocations.js, aircraftConfig.js, spawn in main |
| 新增：選機畫面（F-15 / Iron Man） | selectionScreen.js, main.js hook |
| 新增：Iron Man Mark 85 模型載入 | model loader branch |
| 新增：Iron Man 腳底噴射與掌心藍光特效 | ironmanEffects.js, render loop hook |
| 新增：Iron Man 掌心光束炮武器 | weapon fire branch |
| 新增：Vercel 部署設定 | vercel.json |
