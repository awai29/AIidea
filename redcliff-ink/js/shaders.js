// ==========================================================
// 水墨赤壁 — GLSL Shader 集
// 「shader」是直接在顯示卡上跑的小程式，負責算出每個
// 像素的顏色。我們用它來模擬墨在宣紙上暈開的效果。
// ==========================================================

// ---------- 共用：雜訊函式（製造墨的不規則紋理） ----------
// fbm（分形布朗運動）= 把好幾層雜訊疊在一起，
// 就會得到像雲、像墨暈的自然紋理。
const NOISE_GLSL = /* glsl */ `
  // 偽隨機數：給一個座標，回傳 0~1 的「看起來隨機」的數
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // 平滑雜訊：把格點上的隨機數做平滑插值
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // 疊四層雜訊 → 墨暈紋理
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.1 + vec2(13.7, 7.3);
      a *= 0.5;
    }
    return v;
  }
`;

// ==========================================================
// 江面（水）
// 效果：宣紙上的淡墨水流＋滑鼠掃過時暈開的墨痕漣漪
//       ＋火攻時江面映出的橘紅火光
// ==========================================================
export const waterVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vViewDist;

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vViewDist = distance(cameraPosition, wp.xyz); // 與攝影機的距離，用來做遠處霧化
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const waterFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uPaper;        // 紙色
  uniform vec3 uInk;          // 墨色
  uniform vec4 uRipples[16];  // 漣漪：x,z = 位置，z 分量 = 開始時間，w = 強度
  uniform int uRippleCount;
  uniform float uFireGlow;    // 火光強度 0~1
  uniform vec3 uFireCenter;   // 火光中心（曹軍水寨位置）

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vViewDist;

  ${NOISE_GLSL}

  void main() {
    vec2 p = vWorldPos.xz * 0.045;

    // --- 基底水流：橫向拉長的墨絲，緩緩流動 ---
    float flow = fbm(p * vec2(1.0, 2.4) + vec2(uTime * 0.03, 0.0));
    float streak = fbm(vec2(p.x * 1.6 - uTime * 0.02, p.y * 6.0));
    float base = flow * 0.55 + streak * 0.45;
    float density = smoothstep(0.42, 0.9, base) * 0.38 + base * 0.15;
    // 大塊的淡墨暈染，讓江面有遠近濃淡的層次
    density += fbm(p * 0.35 + vec2(0.0, uTime * 0.01)) * 0.12;

    // --- 滑鼠漣漪：每個漣漪是一圈圈擴散、隨時間淡去的墨痕 ---
    float rippleInk = 0.0;
    for (int i = 0; i < 16; i++) {
      if (i >= uRippleCount) break;
      vec4 r = uRipples[i];
      float d = distance(vWorldPos.xz, r.xy);
      float age = max(uTime - r.z, 0.0);
      // 擴散的圓環 × 距離衰減 × 時間衰減
      float ring = sin(d * 2.6 - age * 5.0) * 0.5 + 0.5;
      float atten = exp(-d * 0.38) * exp(-age * 0.8) * r.w;
      // 加一點雜訊讓墨痕邊緣毛毛的（像墨在紙上暈開）
      float rough = fbm(vWorldPos.xz * 0.8 + age * 0.3);
      rippleInk += ring * atten * (0.6 + rough * 0.8);
    }
    density += rippleInk * 1.1;

    // --- 遠處霧化：越遠越接近紙色（江天一色） ---
    float mist = smoothstep(40.0, 190.0, vViewDist);
    density *= (1.0 - mist * 0.92);

    vec3 col = mix(uPaper, uInk, clamp(density, 0.0, 0.85));

    // --- 火光倒影：火攻時，曹軍水寨附近的江面染上跳動的橘紅 ---
    if (uFireGlow > 0.001) {
      float fd = distance(vWorldPos.xz, uFireCenter.xz);
      float flicker = 0.75 + 0.25 * sin(uTime * 9.0 + vWorldPos.x * 1.7)
                            * sin(uTime * 6.3 + vWorldPos.z * 2.3);
      float glow = exp(-fd * 0.10) * uFireGlow * flicker;
      // 火光沿水流方向拉出倒影條紋
      float refl = fbm(vec2(vWorldPos.x * 0.35, vWorldPos.z * 1.4 - uTime * 0.4));
      glow *= 0.5 + refl * 0.7;
      col = mix(col, vec3(0.92, 0.40, 0.12), clamp(glow, 0.0, 0.5));
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ==========================================================
// 遠山（潑墨山水的剪影，一層層由濃到淡）
// 做法：在一片透明平面上，用雜訊畫出山稜線，
//       稜線以下填上半透明的墨。
// ==========================================================
export const mountainVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const mountainFragment = /* glsl */ `
  uniform vec3 uInk;
  uniform float uDensity; // 這一層山的濃度（近山濃、遠山淡）
  uniform float uSeed;    // 隨機種子，讓每層山形狀不同

  varying vec2 vUv;

  ${NOISE_GLSL}

  void main() {
    // 山稜線高度：用雜訊產生起伏
    float ridge = 0.30
      + fbm(vec2(vUv.x * 3.2 + uSeed * 7.0, uSeed)) * 0.42
      + noise(vec2(vUv.x * 11.0 + uSeed * 3.0, uSeed * 2.0)) * 0.06;

    // 稜線以下 = 山體（邊緣略毛，像筆觸）
    float edgeNoise = noise(vec2(vUv.x * 40.0, uSeed)) * 0.012;
    float body = smoothstep(ridge + edgeNoise, ridge - 0.02 + edgeNoise, vUv.y);

    // 山體內部的墨色濃淡變化（皴法質感）
    float tex = fbm(vUv * vec2(7.0, 3.5) + uSeed * 11.0);
    float alpha = body * uDensity * (0.5 + tex * 0.5);

    // 山腳沒入江霧（拉高淡出範圍，讓山與江面以霧氣相接）
    alpha *= smoothstep(0.03, 0.5, vUv.y);

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uInk, alpha);
  }
`;

// ==========================================================
// 戰船（墨韻著色）
// 效果：三階的墨色明暗（像毛筆分濃淡）＋ 邊緣描墨線
//       ＋ hover 泛朱 ＋ 焚燒時逐漸焦黑、邊緣透出火光
// ==========================================================
export const shipVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal); // 轉成世界座標的法線
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vViewDir = cameraPosition - wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const shipFragment = /* glsl */ `
  uniform vec3 uLightDir;  // 光的方向（固定，像畫裡的留白方向）
  uniform float uHover;    // 滑鼠 hover 程度 0~1
  uniform float uBurn;     // 焚燒程度 0~1
  uniform float uTime;
  uniform float uBattens;  // 1 = 帆（要畫橫向帆骨線）
  uniform float uInkTint;  // 墨色深淺基調（曹軍船較深）

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying vec2 vUv;

  ${NOISE_GLSL}

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    // --- 三階墨色明暗（毛筆的濃、淡、清） ---
    float ndl = dot(N, normalize(uLightDir)) * 0.5 + 0.5;
    float tone = floor(ndl * 3.0) / 3.0;
    vec3 paper = vec3(0.90, 0.86, 0.78);
    vec3 inkDark = vec3(0.12, 0.11, 0.10);
    vec3 col = mix(inkDark, paper, (0.32 + tone * 0.62) * uInkTint);

    // --- 紙紋顆粒 ---
    float grain = noise(vWorldPos.xy * 9.0 + vWorldPos.zx * 4.0);
    col += (grain - 0.5) * 0.07;

    // --- 帆的橫向帆骨墨線 ---
    if (uBattens > 0.5) {
      float seg = abs(fract(vUv.y * 6.0) - 0.5);
      float line = smoothstep(0.44, 0.5, 0.5 - seg);
      col = mix(col, inkDark, line * 0.25); // 淡淡的帆骨線
    }

    // --- 邊緣描墨線（fresnel：面越側對鏡頭越描黑） ---
    float rim = 1.0 - abs(dot(N, V));
    col = mix(col, inkDark, smoothstep(0.55, 0.95, rim) * 0.65);

    // --- hover：泛起一抹朱砂色 ---
    col = mix(col, vec3(0.72, 0.29, 0.21), uHover * 0.26);

    // --- 焚燒：以雜訊決定焦黑蔓延的形狀 ---
    if (uBurn > 0.001) {
      float charNoise = fbm(vWorldPos.xz * 2.2 + vWorldPos.y * 1.5 + 3.7);
      // uBurn 越大，焦黑覆蓋越多
      float charred = smoothstep(uBurn + 0.12, uBurn - 0.12, charNoise);
      col = mix(col, vec3(0.05, 0.04, 0.04), charred * 0.92);

      // 焦黑邊界透出跳動的火光（餘燼）
      float edge = 1.0 - smoothstep(0.0, 0.16, abs(charNoise - uBurn));
      float flicker = 0.6 + 0.4 * sin(uTime * 11.0 + vWorldPos.x * 8.0 + vWorldPos.y * 5.0);
      col += vec3(1.0, 0.38, 0.06) * edge * flicker * 0.85 * smoothstep(0.0, 0.15, uBurn);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ==========================================================
// 火焰粒子
// 每顆粒子從船身竄起、隨風斜飄、由黃轉紅再淡出，循環不止。
// ==========================================================
export const fireVertex = /* glsl */ `
  attribute float aSeed;    // 每顆粒子的隨機種子
  attribute vec3 aOffset;   // 粒子在船上的起點（相對位置）

  uniform float uTime;
  uniform float uStart;     // 點火時刻
  uniform float uIntensity; // 火勢強度 0~1

  varying float vLife;

  void main() {
    float t = max(uTime - uStart, 0.0);
    // 每顆粒子有自己的生命週期（0 = 剛竄出，1 = 熄滅），不斷循環
    float life = fract(t * (0.45 + aSeed * 0.35) + aSeed * 7.31);
    vLife = life;

    vec3 pos = aOffset;
    pos.y += life * (2.6 + aSeed * 2.0);                  // 往上竄
    pos.x += sin(life * 9.0 + aSeed * 20.0) * 0.3 * life; // 左右搖曳
    pos.z += cos(life * 7.0 + aSeed * 31.0) * 0.25 * life;
    pos.x -= life * life * 1.6;                           // 東南風把火往西北吹

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float size = (1.0 - life) * (15.0 + aSeed * 12.0) * uIntensity;
    gl_PointSize = size * (34.0 / max(-mv.z, 1.0)); // 近大遠小
    gl_Position = projectionMatrix * mv;
  }
`;

export const fireFragment = /* glsl */ `
  uniform float uIntensity;
  varying float vLife;

  void main() {
    // 把方形點裁成柔和的圓
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float a = smoothstep(0.5, 0.05, d);

    // 顏色：初生亮黃 → 燒旺橘紅
    vec3 c = mix(vec3(1.0, 0.85, 0.35), vec3(0.85, 0.2, 0.04), vLife);

    float alpha = a * (1.0 - vLife) * uIntensity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(c, alpha);
  }
`;

// ==========================================================
// 東南風（飄過江面的細小流線，暗示風向）
// ==========================================================
export const windVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    // 風由東南（+x, +z）吹向西北（-x, -z），粒子循環飄過
    float speed = 9.0 + aSeed * 7.0;
    pos.x = 60.0 - mod(uTime * speed + aSeed * 120.0, 130.0);
    pos.z = position.z - mod(uTime * speed * 0.4 + aSeed * 60.0, 50.0);
    pos.y = position.y + sin(uTime * 2.0 + aSeed * 30.0) * 0.6;

    // 進出場淡入淡出
    float cycle = mod(uTime * speed + aSeed * 120.0, 130.0) / 130.0;
    vAlpha = sin(cycle * 3.14159) * 0.5;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (2.0 + aSeed * 3.0) * (30.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

export const windFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    // 橫向短劃，像風掠過的筆觸
    vec2 p = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, abs(p.y) * 3.0) * smoothstep(0.5, 0.2, abs(p.x));
    float alpha = a * vAlpha * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vec3(0.25, 0.24, 0.22), alpha);
  }
`;
