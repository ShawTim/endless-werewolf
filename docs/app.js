/* ===== Endless Werewolf — 3D Village Table ===== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const CACHE_VERSION = '20260720-showcase-2';
function versionedUrl(url) {
  return `${url}${url.includes('?') ? '&' : '?'}v=${CACHE_VERSION}`;
}

const PI = Math.PI, cos = Math.cos, sin = Math.sin, TAU = PI * 2;

// ===== i18n =====
const I18N = {
  en: {
    brand: 'Endless Werewolf', sub: 'AI One Night',
    archive: 'Games', info: 'About', night: 'Night', autoRotate: 'Auto',
    nightPhase: 'Night Phase', dayDiscussion: 'Day Discussion', voting: 'Voting',
    resolution: 'Resolution', postgame: 'Postgame',
    centerCards: 'Center cards', roles: 'Roles', nightActions: 'Night Actions',
    duration: 'Duration', totalSpeeches: 'Total speeches', playerStats: 'Player Stats',
    discussionLog: 'Discussion Log', votes: 'Votes', tally: 'Tally', executed: 'Executed',
    outcome: 'Outcome', reason: 'Reason', winners: 'Winners', finalRoles: 'Final Roles',
    initialRole: 'Initial role', currentRole: 'Current role', nightMemory: 'Night memory',
    speeches: 'Speeches', vote: 'Vote', postgameLabel: 'Postgame',
    deadExec: 'Executed', winLabel: 'Winners', loseLabel: 'Losers',
    gameArchive: 'Game Archive', loadingVillage: 'Loading 3D village…',
    speaks: 'speaks', voteFor: 'Voted for', langLabel: '中文',
    werewolfWin: 'Werewolf Wins!', villageWin: 'Village Wins!',
    tannerWin: 'Tanner Wins!', noTeamWin: 'No One Wins',
    chineseName: 'Chinese name', thinking: 'Thinking', persona: 'Persona', gameData: 'Game Data',
    story: 'Watch Game', proof: 'Proof', agentState: 'Agent State', decisionTrace: 'Decision Trace',
  },
  zh: {
    brand: '無限狼人殺', sub: 'AI 一夜',
    archive: '遊戲', info: '關於', night: '夜晚', autoRotate: '自動',
    nightPhase: '夜晚階段', dayDiscussion: '白天討論', voting: '投票',
    resolution: '結算', postgame: '賽後訪問',
    centerCards: '中央卡牌', roles: '角色', nightActions: '夜晚行動',
    duration: '時長', totalSpeeches: '總發言數', playerStats: '玩家統計',
    discussionLog: '討論記錄', votes: '投票', tally: '票數', executed: '被處決',
    outcome: '結果', reason: '原因', winners: '勝方', finalRoles: '最終角色',
    initialRole: '初始角色', currentRole: '當前角色', nightMemory: '夜晚記憶',
    speeches: '發言', vote: '投票', postgameLabel: '賽後',
    deadExec: '被處決', winLabel: '勝方', loseLabel: '敗方',
    gameArchive: '遊戲檔案', loadingVillage: '載入 3D 村莊…',
    speaks: '次發言', voteFor: '投票給', langLabel: 'EN',
    werewolfWin: '狼人勝利！', villageWin: '村民勝利！',
    tannerWin: '皮匠勝利！', noTeamWin: '無人勝利',
    chineseName: '中文名', thinking: '思考深度', persona: '人設', gameData: '遊戲數據',
    story: '觀看遊戲', proof: '證據', agentState: '代理狀態', decisionTrace: '決策軌跡',
  }
};
let lang = (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
function t(key) { return I18N[lang][key] || I18N.en[key] || key; }

// --- Player visual styles (covers both V1 and V2 rosters) ---
// Distinct per-character palette — 4 dimensions so each villager feels unique
// color: name-tag accent (used in HTML/CSS only)
// body: torso/shoulder main color (saturated clothing)
// accent: secondary clothing color (sleeves, trim — darker shade of body)
// head: hair color (distinct from skin)
// skin: face/skin tone (warm light tone)
const PLAYER_STYLES = {
  // V1 roster
  'Blaze':       {color:0xe74c3c, body:0xb83227, accent:0x6b1a13, hair:0x2a1410, skin:0xe8b890},
  'SafetySam':   {color:0x27ae60, body:0x2d8a4e, accent:0x1a4d2e, hair:0x3a2a18, skin:0xf0c8a0},
  'Dr. Pizza':   {color:0x3498db, body:0x2980b9, accent:0x163d5c, hair:0x1a1410, skin:0xf5d4b0},
  'Twister':     {color:0xe67e22, body:0xc0611a, accent:0x5a2e0d, hair:0x8a4a20, skin:0xddb088},
  'EasyBake':    {color:0xf39c12, body:0xc8881a, accent:0x6a4a10, hair:0xd4a050, skin:0xfde0c0},
  'ConspiBro':   {color:0x95a5a6, body:0x4a4a52, accent:0x1a1a22, hair:0x222222, skin:0xd4a880},
  // V2 roster
  'The Prosecutor':   {color:0xc0392b, body:0x8a2820, accent:0x3a1010, hair:0x1a0a08, skin:0xe0a880},
  'The Therapist':    {color:0x2ecc71, body:0x1f7a4a, accent:0x0d3a22, hair:0x4a3020, skin:0xf0c8a4},
  'The Chaos Agent':  {color:0xe67e22, body:0xa0501a, accent:0x4a2008, hair:0x6a3010, skin:0xe8b890},
  'The Gut Player':   {color:0x95a5a6, body:0x3a3a3a, accent:0x141414, hair:0x2a1a10, skin:0xcca078},
  'The Statistician': {color:0x3498db, body:0x1f5d8a, accent:0x0a2a4a, hair:0x1a1a1a, skin:0xf0d0b0},
  'The Underdog':     {color:0xf39c12, body:0xc8881a, accent:0x6a4a10, hair:0x8a5a20, skin:0xefd0a0},
};

// --- Player data (dynamically loaded from each game's night_result) ---
let PLAYERS = [];

// --- Game data ---
let currentGame = null;
let gameData = {};
let currentPhase = 'night';
let archiveGames = [];
let gameLoadVersion = 0;

// --- Three.js globals ---
let scene, camera, renderer, amb, dir, moonPoint, candlePoint, flame;
let composer, renderPass, bloomPass, smaaPass;
let chars = [];
let isNight = false;
let autoRotate = true;
const R = 3.2, SH = 0.6, TR = 2.0;

// ===== Cel-shading gradient maps =====
function makeToonGradientMap(steps = 5, smooth = false) {
  // Asymmetric bias toward darker bands for crisper cel shading.
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const biased = Math.pow(t, 0.85);
    data[i] = Math.round((0.30 + biased * 0.70) * 255);
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  tex.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
const TOON_GRADIENT = makeToonGradientMap(6);
const TOON_GRADIENT_SOFT = makeToonGradientMap(8, true);

// Small neutral weave used as a bump map on clothing. It adds material detail
// without baking a color into the per-character palettes.
function makeFabricBumpMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(64, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const weave = ((x % 4 === 0) ? 8 : 0) + ((y % 4 === 0) ? -7 : 0);
      const noise = ((x * 17 + y * 31) % 9) - 4;
      const value = Math.max(0, Math.min(255, 128 + weave + noise));
      const i = (y * 64 + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 7);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
const FABRIC_BUMP = makeFabricBumpMap();

// Cel-shaded rim-light shader chunk — injects a stepped fresnel term into MeshToonMaterial
// This is a discrete (cel) rim, not a smooth fresnel — it produces a hard light edge
function applyToonRim(material, rimColor = 0xfff0c8, rimPower = 2.5, rimStrength = 0.45) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: new THREE.Color(rimColor) };
    shader.uniforms.uRimPower = { value: rimPower };
    shader.uniforms.uRimStrength = { value: rimStrength };
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec3 uRimColor;
       uniform float uRimPower;
       uniform float uRimStrength;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `// cel rim
       float rimDot = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
       float rim = smoothstep(0.55, 0.95, pow(rimDot, uRimPower));
       gl_FragColor.rgb += uRimColor * rim * uRimStrength;
       #include <dithering_fragment>`
    );
  };
  material.needsUpdate = true;
}

// Cel-shaded outline — BackSide inflated mesh (gives chunky ink-line silhouette)
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x0a0814, side: THREE.BackSide });
OUTLINE_MAT.toneMapped = false;
function addOutline(mesh, scale = 1.05) {
  if (!mesh.geometry) return;
  const outline = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  outline.scale.setScalar(scale);
  outline.renderOrder = -1;
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.userData.isOutline = true;
  // polygonOffset pushes outline slightly back in depth so body never z-fights
  outline.material.polygonOffset = true;
  outline.material.polygonOffsetFactor = 1;
  outline.material.polygonOffsetUnits = 1;
  mesh.add(outline);
}


// ===== Ambient Particles =====
let fireflies = null;   // night fireflies
let dustMotes = null;   // day dust motes
// --- State for per-frame updates ---
let activeVotes = null;   // stored votes object for per-frame redraw
let activeBubblesData = []; // [{playerIndex, text, duration, startTime, el, hex}]
let deathAnims = [];     // [{index, startTime, duration, baseY}]
let teamAnims = [];      // [{index, type: 'celebrate'|'defeat', startTime}]

// --- DOM refs ---
const canvas = document.getElementById('c');
const tagsContainer = document.getElementById('tags');
const bubblesContainer = document.getElementById('bubbles');
const voteOverlay = document.getElementById('vote-overlay');
const hoverCard = document.getElementById('hover-card');
const loadingEl = document.getElementById('loading');
const resultBanner = document.getElementById('result-banner');
const replayControls = document.getElementById('replay-controls');

// ===== Init =====
async function init() {
  // Load 3D scene first (no characters yet — they load with game data)
  initThree();
  setupCameraControls();
  setupUI();

  // Apply night preset lighting immediately so first paint matches the default phase
  const preset = NIGHT_PRESETS.night;
  scene.background.setHex(preset.bg);
  amb.intensity = preset.amb;
  dir.intensity = preset.dir;
  dir.color.setHex(preset.dirColor);
  moonPoint.intensity = preset.moon;
  candlePoint.intensity = preset.candle;
  scene.fog.color.setHex(preset.fogColor);
  scene.fog.near = preset.fogNear;
  scene.fog.far = preset.fogFar;
  if (flame) flame.material.emissiveIntensity = preset.flame;
  // Show brazier fires at night
  if (window.__brazierEmbers && window.__brazierLights) {
    for (const e of window.__brazierEmbers) e.visible = true;
    for (const l of window.__brazierLights) l.intensity = 0.35;
  }

  // Try to load latest game (this will populate PLAYERS and build characters)
  await loadGameIndex();
  
  // Fallback: if no game data, load static players.json for a preview
  if (PLAYERS.length === 0) {
    try {
      const resp = await fetch(versionedUrl('./players.json'));
      PLAYERS = await resp.json();
      buildAllCharacters();
      buildNameTags();
    } catch(e) {
      console.error('No players available', e);
    }
  }
  
  loadingEl.style.display = 'none';
  startIntroAnim();
  animate();
}

// ===== Three.js Setup =====
function initThree() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  const compactViewport = innerWidth <= 768;
  const renderPixelRatio = Math.min(devicePixelRatio, compactViewport ? 1.5 : 2);
  renderer.setPixelRatio(renderPixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Post-processing composer
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderPixelRatio);
  composer.setSize(innerWidth, innerHeight);
  renderPass = new RenderPass(null, null); // scene/camera set right after creation
  composer.addPass(renderPass);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.18, 0.35, 1.05);
  composer.addPass(bloomPass);
  // EffectComposer renders into off-screen targets, so canvas MSAA alone does
  // not smooth the final post-processed image. SMAA handles silhouettes and
  // the thin facial/accessory geometry after bloom.
  smaaPass = new SMAAPass(innerWidth * renderPixelRatio, innerHeight * renderPixelRatio);
  composer.addPass(smaaPass);
  composer.addPass(new OutputPass());

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1520);
  scene.fog = new THREE.Fog(0x1a1520, 14, 32);

  // ===== Textures =====
  const texLoader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  FABRIC_BUMP.anisotropy = maxAnisotropy;
  const stoneTex = texLoader.load('./tex-stone.jpg');
  stoneTex.anisotropy = maxAnisotropy;
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
  stoneTex.repeat.set(4, 4);

  const woodTex = texLoader.load('./tex-wood.jpg');
  woodTex.anisotropy = maxAnisotropy;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 2);

  // Sky as background sphere
  const skyTex = texLoader.load('./tex-sky.jpg');
  skyTex.anisotropy = maxAnisotropy;
  // Default equirect mapping — bright sunset/orange texture shows at horizon
  skyTex.center.set(0.5, 0.5);
  skyTex.rotation = 0;
  skyTex.offset.set(0, 0);
  skyTex.repeat.set(1, 1);
  const skyGeo = new THREE.SphereGeometry(40, 64, 32);
  // No tint — let original sky color show through; fog:false so it stays vivid
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, color: 0xffffff, side: THREE.BackSide, fog: false });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 9, 9);
  if (renderPass) { renderPass.scene = scene; renderPass.camera = camera; }

  // Hemispheric fill preserves form on faces and clothing instead of applying
  // the same flat brightness to every surface.
  amb = new THREE.HemisphereLight(0xdce8ff, 0x8c674a, 0.8);
  scene.add(amb);

  dir = new THREE.DirectionalLight(0xfff5e0, 0.85);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  const shadowMapSize = compactViewport ? 1024 : 2048;
  dir.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  dir.shadow.bias = -0.00025;
  dir.shadow.normalBias = 0.035;
  dir.shadow.radius = 3;
  dir.shadow.blurSamples = compactViewport ? 8 : 16;
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 24;
  dir.shadow.camera.left = -6; dir.shadow.camera.right = 6;
  dir.shadow.camera.top = 6; dir.shadow.camera.bottom = -6;
  scene.add(dir);

  moonPoint = new THREE.PointLight(0x7080ff, 0, 20);
  moonPoint.position.set(-5, 6, 5);
  scene.add(moonPoint);

  candlePoint = new THREE.PointLight(0xFFD700, 1.5, 10);
  candlePoint.position.set(0, 0.75, 0);
  scene.add(candlePoint);

  // Rim/key light: cool blue from high to make characters pop from background
  const rimLight = new THREE.DirectionalLight(0x88aaff, 0.35);
  rimLight.position.set(-3, 8, -5);
  scene.add(rimLight);

  // 4 ground braziers around the table — warm fill, position-match to characters
  const brazierMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.7, metalness: 0.4 });
  const brazierEmber = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff5510, emissiveIntensity: 0.9 });
  // Track brazier components so we can toggle on/off for day/night
  const brazierEmbers = [];
  const brazierLights = [];
  for (let i = 0; i < 4; i++) {
    const a = (i + 0.5) * (TAU / 4) + PI / 4; // offset 45° so they sit between character slots
    const bx = cos(a) * (R - 0.3);
    const bz = sin(a) * (R - 0.3);
    // Bowl
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.18, 10), brazierMat);
    bowl.position.set(bx, -0.5, bz);
    bowl.castShadow = true;
    scene.add(bowl);
    // Stand
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.32, 6), brazierMat);
    stand.position.set(bx, -0.3, bz);
    stand.castShadow = true;
    scene.add(stand);
    // Ember glow — small so it doesn't read as a "second eye" on chars
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), brazierEmber);
    ember.position.set(bx, -0.4, bz);
    scene.add(ember);
    brazierEmbers.push(ember);
    // Point light (limited to 4, OK)
    const bl = new THREE.PointLight(0xff7a30, 0.35, 3.5, 1.8);
    bl.position.set(bx, -0.3, bz);
    scene.add(bl);
    brazierLights.push(bl);
  }
  // Expose for day/night toggling
  window.__brazierEmbers = brazierEmbers;
  window.__brazierLights = brazierLights;

  // Floor — stone with darker outer ring for natural vignette
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, color: 0xe0d2bc })
  );
  floor.rotation.x = -PI / 2; floor.position.y = -0.6; floor.receiveShadow = true;
  scene.add(floor);

  // Grass tufts (instanced small cones) scattered around for organic ground
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.9 });
  const grassCount = 60;
  for (let i = 0; i < grassCount; i++) {
    const a = Math.random() * TAU;
    const r = 4 + Math.random() * 8;
    const h = 0.08 + Math.random() * 0.12;
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.04, h, 4), grassMat);
    tuft.position.set(cos(a) * r, -0.55, sin(a) * r);
    tuft.rotation.set(Math.random() * 0.3, Math.random() * TAU, Math.random() * 0.3);
    scene.add(tuft);
  }

  // Table
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(TR, TR, 0.12, 48),
    new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0.02 })
  );
  tableTop.position.y = 0.15; tableTop.receiveShadow = true; tableTop.castShadow = true;
  scene.add(tableTop);

  const tableRing = new THREE.Mesh(
    new THREE.RingGeometry(TR, TR + 0.08, 48),
    new THREE.MeshStandardMaterial({ color: 0xe8c468, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.3 })
  );
  tableRing.position.y = 0.16; tableRing.rotation.x = -PI / 2;
  scene.add(tableRing);

  const tablePed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 0.6, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 })
  );
  tablePed.position.y = -0.3; tablePed.castShadow = true;
  scene.add(tablePed);

  // Candle
  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0xE8D8B8 })
  );
  candle.position.y = 0.5;
  scene.add(candle);

  flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFF8800, emissiveIntensity: 0.8 })
  );
  flame.position.y = 0.72;
  scene.add(flame);
  initParticles();
}


function initParticles() {
  // ---- Fireflies (night) ----
  const ffCount = 40;
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(ffCount * 3);
  const ffPhase = new Float32Array(ffCount);
  const ffRadius = new Float32Array(ffCount);
  for (let i = 0; i < ffCount; i++) {
    const a = Math.random() * TAU;
    const r = 3 + Math.random() * 8;
    ffPos[i*3] = cos(a) * r;
    ffPos[i*3+1] = 0.5 + Math.random() * 4;
    ffPos[i*3+2] = sin(a) * r;
    ffPhase[i] = Math.random() * TAU;
    ffRadius[i] = r;
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({
    color: 0xFFE066, size: 0.12, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
    map: makeGlowTexture(),
  });
  fireflies = new THREE.Points(ffGeo, ffMat);
  fireflies.userData = { phases: ffPhase, radii: ffRadius, count: ffCount };
  scene.add(fireflies);

  // ---- Dust motes (day) ----
  const dmCount = 60;
  const dmGeo = new THREE.BufferGeometry();
  const dmPos = new Float32Array(dmCount * 3);
  const dmVel = new Float32Array(dmCount * 3);
  for (let i = 0; i < dmCount; i++) {
    dmPos[i*3] = (Math.random() - 0.5) * 20;
    dmPos[i*3+1] = Math.random() * 6;
    dmPos[i*3+2] = (Math.random() - 0.5) * 20;
    dmVel[i*3] = (Math.random() - 0.5) * 0.002;
    dmVel[i*3+1] = Math.random() * 0.001;
    dmVel[i*3+2] = (Math.random() - 0.5) * 0.002;
  }
  dmGeo.setAttribute('position', new THREE.BufferAttribute(dmPos, 3));
  const dmMat = new THREE.PointsMaterial({
    color: 0xFFE8C0, size: 0.04, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  dustMotes = new THREE.Points(dmGeo, dmMat);
  dustMotes.userData = { vels: dmVel, count: dmCount };
  scene.add(dustMotes);
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,200,1)');
  grad.addColorStop(0.3, 'rgba(255,220,100,0.6)');
  grad.addColorStop(1, 'rgba(255,200,50,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function updateParticles(t) {
  // Fireflies
  if (fireflies) {
    const ud = fireflies.userData;
    const pos = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < ud.count; i++) {
      const ph = ud.phases[i] + t * 0.5;
      pos[i*3] = cos(ph * 0.3) * ud.radii[i];
      pos[i*3+1] = 0.5 + Math.sin(ph * 0.7) * 1.5 + Math.cos(ph) * 0.3 + 1.5;
      pos[i*3+2] = sin(ph * 0.3) * ud.radii[i];
    }
    fireflies.geometry.attributes.position.needsUpdate = true;
    fireflies.material.opacity = isNight ? 0.8 : 0;
  }
  // Dust motes
  if (dustMotes) {
    const ud = dustMotes.userData;
    const pos = dustMotes.geometry.attributes.position.array;
    for (let i = 0; i < ud.count; i++) {
      pos[i*3] += ud.vels[i*3];
      pos[i*3+1] += ud.vels[i*3+1] + Math.sin(t + i) * 0.0005;
      pos[i*3+2] += ud.vels[i*3+2];
      // Wrap around
      if (pos[i*3] > 10) pos[i*3] = -10; if (pos[i*3] < -10) pos[i*3] = 10;
      if (pos[i*3+1] > 6) pos[i*3+1] = 0; if (pos[i*3+1] < 0) pos[i*3+1] = 6;
      if (pos[i*3+2] > 10) pos[i*3+2] = -10; if (pos[i*3+2] < -10) pos[i*3+2] = 10;
    }
    dustMotes.geometry.attributes.position.needsUpdate = true;
    dustMotes.material.opacity = isNight ? 0 : 0.4;
  }
}

// ===== Character Builder =====

function sp(i) { const a = (i / 6) * TAU - PI / 2; return [cos(a) * R, SH, sin(a) * R]; }
function sa(i) { return (i / 6) * TAU - PI / 2; }

function limb(r, len, color, rough = 0.6) {
  const m = new THREE.Mesh(
    new THREE.CapsuleGeometry(r, len, 8, 16),
    new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRADIENT })
  );
  m.material.dithering = true;
  m.castShadow = true;
  return m;
}

function buildCharacter(player, index){
  const g=new THREE.Group();
  const pos=sp(index); g.position.set(...pos);
  const ang=sa(index); g.rotation.y=-ang-PI/2;
  scene.add(g);

  // Distinct palette: skin, hair, main clothing, secondary clothing
  const skinMat=new THREE.MeshToonMaterial({color:player.skin, gradientMap: TOON_GRADIENT_SOFT});
  const bodyMat=new THREE.MeshToonMaterial({color:player.body, gradientMap: TOON_GRADIENT});
  const accMat=new THREE.MeshToonMaterial({color:player.accent, gradientMap: TOON_GRADIENT});
  const hairMat=new THREE.MeshToonMaterial({color:player.hair, gradientMap: TOON_GRADIENT});
  const darkMat=new THREE.MeshToonMaterial({color:0x1a1a2e, gradientMap: TOON_GRADIENT});
  for (const mat of [skinMat, bodyMat, accMat, hairMat, darkMat]) mat.dithering = true;
  bodyMat.bumpMap = FABRIC_BUMP;
  bodyMat.bumpScale = 0.018;
  accMat.bumpMap = FABRIC_BUMP;
  accMat.bumpScale = 0.014;
  // Apply cel rim to body materials (skin & hair excluded — soft / dark surfaces)
  applyToonRim(bodyMat, 0xfff0d0, 3.0, 0.24);
  applyToonRim(accMat, 0xffe0a0, 2.8, 0.28);

  // === Torso ===
  // Tapered body — wider at shoulders, narrower at waist
  const torso=new THREE.Mesh(
    new THREE.CylinderGeometry(0.28,0.35,0.55,24),
    bodyMat
  );
  torso.position.y=0.35; torso.castShadow=true; g.add(torso);
  addOutline(torso, 1.035);

  // Shoulders — slight width
  const shoulders=new THREE.Mesh(
    new THREE.SphereGeometry(0.3,24,16),
    bodyMat
  );
  shoulders.position.y=0.58; shoulders.scale.set(1,0.5,0.8); shoulders.castShadow=true; g.add(shoulders);
  addOutline(shoulders, 1.025);

  // === Arms === (sleeves in accent color, hands in skin)
  const armL=limb(0.09,0.35,player.accent);
  armL.position.set(-0.38,0.4,0);
  armL.rotation.z=0.15;
  g.add(armL);
  addOutline(armL, 1.04);
  const armR=limb(0.09,0.35,player.accent);
  armR.position.set(0.38,0.4,0);
  armR.rotation.z=-0.15;
  g.add(armR);
  addOutline(armR, 1.04);

  // Hands
  const handL=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),skinMat);
  handL.position.set(-0.48,0.2,0); handL.castShadow=true; g.add(handL);
  const handR=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),skinMat);
  handR.position.set(0.48,0.2,0); handR.castShadow=true; g.add(handR);

  // === Legs === (pants in deep accent color)
  const legL=limb(0.12,0.3,player.accent);
  legL.position.set(-0.14,-0.1,0); g.add(legL);
  addOutline(legL, 1.04);
  const legR=limb(0.12,0.3,player.accent);
  legR.position.set(0.14,-0.1,0); g.add(legR);
  addOutline(legR, 1.04);

  // === Head (parented group so face features follow head bob) ===
  const head=new THREE.Group();
  head.position.y=0.98; g.add(head);

  const headSphere=new THREE.Mesh(new THREE.SphereGeometry(0.36,32,24),skinMat);
  headSphere.castShadow=true; head.add(headSphere);
  addOutline(headSphere, 1.018);

  // Hair cap — upper hemisphere. Skipped for characters with persona-specific hair (Prosecutor, Therapist, Statistician, Underdog, Chaos Agent, Gut Player) to avoid double-layer.
  const personaHairChars = ['The Prosecutor', 'Blaze', 'The Therapist', 'SafetySam', 'The Statistician', 'Dr. Pizza', 'The Underdog', 'EasyBake', 'The Chaos Agent', 'Twister', 'The Gut Player', 'ConspiBro'];
  if (!personaHairChars.includes(player.name)) {
    const hairCap=new THREE.Mesh(
      new THREE.SphereGeometry(0.365,32,20,0,TAU,0,PI*0.5),
      hairMat
    );
    hairCap.position.y=0.01; hairCap.castShadow=true; head.add(hairCap);
  }

  // Positions are local to head (world y - 0.98)

  // Ears
  const earGeo=new THREE.SphereGeometry(0.06,16,10);
  const earL=new THREE.Mesh(earGeo,skinMat); earL.position.set(-0.35,-0.01,0); earL.scale.set(0.5,1,0.8); head.add(earL);
  const earR=new THREE.Mesh(earGeo,skinMat); earR.position.set(0.35,-0.01,0); earR.scale.set(0.5,1,0.8); head.add(earR);

  // Eyebrows
  const browGeo=new THREE.BoxGeometry(0.1,0.02,0.03);
  const browL=new THREE.Mesh(browGeo,darkMat); browL.position.set(-0.12,0.07,0.32); browL.rotation.z=0.08; head.add(browL);
  const browR=new THREE.Mesh(browGeo,darkMat); browR.position.set(0.12,0.07,0.32); browR.rotation.z=-0.08; head.add(browR);

  // Eyes — whites with pupils + highlight for life
  const eyeWhiteMat=new THREE.MeshToonMaterial({color:0xffffff, gradientMap: TOON_GRADIENT});
  const eyeGeo2=new THREE.SphereGeometry(0.05,16,12);
  const eL=new THREE.Mesh(eyeGeo2,eyeWhiteMat); eL.position.set(-0.12,0.02,0.32); eL.scale.set(1.2,1,0.6); head.add(eL);
  const eR=new THREE.Mesh(eyeGeo2,eyeWhiteMat); eR.position.set(0.12,0.02,0.32); eR.scale.set(1.2,1,0.6); head.add(eR);
  // Pupils (bigger, more cartoon)
  const pupilGeo=new THREE.SphereGeometry(0.025,12,8);
  const pL=new THREE.Mesh(pupilGeo,darkMat); pL.position.set(-0.12,0.02,0.36); head.add(pL);
  const pR=new THREE.Mesh(pupilGeo,darkMat); pR.position.set(0.12,0.02,0.36); head.add(pR);
  // Eye highlights (small white spheres for cartoon "shine")
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const hlGeo = new THREE.SphereGeometry(0.012, 6, 6);
  const hlL = new THREE.Mesh(hlGeo, hlMat); hlL.position.set(-0.105, 0.035, 0.378); head.add(hlL);
  const hlR = new THREE.Mesh(hlGeo, hlMat); hlR.position.set(0.135, 0.035, 0.378); head.add(hlR);

  // Nose — more defined
  const nose=new THREE.Mesh(
    new THREE.ConeGeometry(0.04,0.12,8),
    skinMat
  );
  nose.position.set(0,-0.06,0.38); nose.rotation.x=PI/2; nose.scale.set(0.8,1,0.8); head.add(nose);

  // Mouth — smile with lips
  const smile=new THREE.Mesh(
    new THREE.TorusGeometry(0.08,0.025,8,16,PI),
    new THREE.MeshStandardMaterial({color:0x8B3A3A,roughness:0.4})
  );
  smile.position.set(0,-0.12,0.35); smile.rotation.z=PI; head.add(smile);
  // Upper lip
  const lipLine=new THREE.Mesh(
    new THREE.BoxGeometry(0.12,0.01,0.02),
    darkMat
  );
  lipLine.position.set(0,-0.1,0.36); head.add(lipLine);

  // Chin
  const chin=new THREE.Mesh(
    new THREE.SphereGeometry(0.08,12,8),
    skinMat
  );
  chin.position.set(0,-0.16,0.28); chin.scale.set(1,0.6,0.8); head.add(chin);

  // === Persona-specific accessories ===
  switch(player.name){
    case 'The Prosecutor': case 'Blaze': // Suit / fire theme
      // Suit collar — V shape
      const collar=new THREE.Mesh(
        new THREE.ConeGeometry(0.22,0.15,4),
        accMat
      );
      collar.position.set(0,0.62,0.28); collar.rotation.x=PI; collar.rotation.y=PI/4;
      g.add(collar);
      // Tie
      const tie=new THREE.Mesh(
        new THREE.ConeGeometry(0.05,0.2,4),
        new THREE.MeshStandardMaterial({color:0xc0392b})
      );
      tie.position.set(0,0.5,0.3); tie.rotation.x=-PI/2+0.3;
      g.add(tie);
      // Gavel in right hand
      const gavelHead=new THREE.Mesh(
        new THREE.CylinderGeometry(0.06,0.06,0.14,8),
        new THREE.MeshStandardMaterial({color:0x6B4226,roughness:0.5})
      );
      gavelHead.position.set(0.52,0.15,0.1); gavelHead.rotation.z=PI/2;
      g.add(gavelHead);
      const gavelHandle=new THREE.Mesh(
        new THREE.CylinderGeometry(0.02,0.02,0.12,8),
        new THREE.MeshStandardMaterial({color:0x6B4226})
      );
        gavelHandle.position.set(0.6,0.1,0.1); gavelHandle.rotation.z=PI/3;
      g.add(gavelHandle);
      // Slick hair — persona accent (subtle, top-of-head only)
      const hairP1=new THREE.Mesh(
        new THREE.SphereGeometry(0.365,16,12,0,TAU,0,PI*0.35),
        hairMat
      );
      hairP1.position.set(0,0.07,0); hairP1.scale.set(1,0.4,1); head.add(hairP1);
      break;

    case 'The Therapist': case 'SafetySam': // Glasses + clipboard / shield
      // Glasses — two torus rings
      const glassL=new THREE.Mesh(
        new THREE.TorusGeometry(0.08,0.015,8,16),
        new THREE.MeshStandardMaterial({color:0x333333,metalness:0.5,roughness:0.2})
      );
      glassL.position.set(-0.12,0.02,0.32); head.add(glassL);
      const glassR=new THREE.Mesh(
        new THREE.TorusGeometry(0.08,0.015,8,16),
        new THREE.MeshStandardMaterial({color:0x333333,metalness:0.5,roughness:0.2})
      );
      glassR.position.set(0.12,0.02,0.32); head.add(glassR);
      // Bridge
      const bridge=new THREE.Mesh(
        new THREE.CylinderGeometry(0.01,0.01,0.08,4),
        new THREE.MeshStandardMaterial({color:0x333333})
      );
      bridge.position.set(0,0.02,0.33); bridge.rotation.z=PI/2;
      head.add(bridge);
      // Clipboard in left hand
      const board=new THREE.Mesh(
        new THREE.BoxGeometry(0.18,0.22,0.02),
        new THREE.MeshStandardMaterial({color:0xF5F0E0,roughness:0.7})
      );
      board.position.set(-0.52,0.15,0.05); board.rotation.x=-0.2;
      g.add(board);
      // Soft hair — bun (use player hair color)
      const hairP2=new THREE.Mesh(
        new THREE.SphereGeometry(0.365,16,12,0,TAU,0,PI*0.5),
        hairMat
      );
      hairP2.position.set(0,0.06,0); hairP2.scale.set(1,0.6,1); head.add(hairP2);
      // Bun
      const bun=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),
        hairMat);
      bun.position.set(0,0.24,-0.15); head.add(bun);
      break;

    case 'The Chaos Agent': case 'Twister': // Wild hair + mask
      // Wild spiky hair — multiple cones
      for(let k=0;k<7;k++){
        const spike=new THREE.Mesh(
          new THREE.ConeGeometry(0.06,0.2+Math.random()*0.1,5),
          new THREE.MeshStandardMaterial({color:0xB85820,roughness:0.4})
        );
        const sa2=k/7*TAU;
        spike.position.set(cos(sa2)*0.25,0.17,sin(sa2)*0.25);
        spike.rotation.set(Math.random()*0.3-0.15,sa2,Math.random()*0.4-0.2);
        head.add(spike);
      }
      // Mask on stick (drama!)
      const stick=new THREE.Mesh(
        new THREE.CylinderGeometry(0.015,0.015,0.35,6),
        new THREE.MeshStandardMaterial({color:0x6B4226})
      );
      stick.position.set(0.52,0.25,0.1); stick.rotation.z=-0.3;
      g.add(stick);
      const mask=new THREE.Mesh(
        new THREE.SphereGeometry(0.1,12,8,0,TAU,0,PI),
        accMat
      );
      mask.position.set(0.6,0.35,0.1); mask.scale.set(0.8,1,0.3);
      g.add(mask);
      // Big grin (wider smile)
      smile.geometry=new THREE.TorusGeometry(0.09,0.018,8,16,PI*1.1);
      break;

    case 'The Gut Player': case 'ConspiBro': // Bandana + muscular / suspicious
      // Bandana
      const bandana=new THREE.Mesh(
        new THREE.TorusGeometry(0.34,0.06,8,20),
        new THREE.MeshStandardMaterial({color:0x7f8c8d,roughness:0.4})
      );
      bandana.position.set(0,0.1,0); bandana.rotation.x=PI/2; bandana.scale.set(1,1,0.8);
      head.add(bandana);
      // Bandana knot
      const knot=new THREE.Mesh(
        new THREE.BoxGeometry(0.06,0.08,0.06),
        new THREE.MeshStandardMaterial({color:0x7f8c8d})
      );
      knot.position.set(0,0.08,-0.32); head.add(knot);
      // Bigger arms (muscular)
      armL.scale.set(1.3,1.2,1.3); armR.scale.set(1.3,1.2,1.3);
      handL.scale.set(1.3,1.3,1.3); handR.scale.set(1.3,1.3,1.3);
      // Fist pose — both hands on table
      handL.position.set(-0.35,0.05,0.15); armL.rotation.x=-0.5; armL.position.y=0.3;
      handR.position.set(0.35,0.05,0.15); armR.rotation.x=-0.5; armR.position.y=0.3;
      // Scar on cheek
      const scar=new THREE.Mesh(
        new THREE.BoxGeometry(0.02,0.06,0.01),
        new THREE.MeshStandardMaterial({color:0xaa3333})
      );
      scar.position.set(-0.15,-0.03,0.35); scar.rotation.z=0.2;
      head.add(scar);
      break;

    case 'The Statistician': case 'Dr. Pizza': // Glasses + tablet / pizza
      // Glasses — square-ish (use torus)
      const sgL=new THREE.Mesh(
        new THREE.TorusGeometry(0.07,0.012,8,16),
        new THREE.MeshStandardMaterial({color:0x2980b9,metalness:0.4,roughness:0.2})
      );
      sgL.position.set(-0.12,0.02,0.32); head.add(sgL);
      const sgR=new THREE.Mesh(
        new THREE.TorusGeometry(0.07,0.012,8,16),
        new THREE.MeshStandardMaterial({color:0x2980b9,metalness:0.4,roughness:0.2})
      );
      sgR.position.set(0.12,0.02,0.32); head.add(sgR);
      // Tablet in left hand
      const tablet=new THREE.Mesh(
        new THREE.BoxGeometry(0.16,0.22,0.015),
        new THREE.MeshStandardMaterial({color:0x1a1a2e,roughness:0.2,metalness:0.5})
      );
      tablet.position.set(-0.5,0.18,0.08); tablet.rotation.x=-0.15;
      g.add(tablet);
      // Screen glow
      const screen=new THREE.Mesh(
        new THREE.PlaneGeometry(0.13,0.18),
        new THREE.MeshStandardMaterial({color:0x2980b9,emissive:0x2980b9,emissiveIntensity:0.3})
      );
      screen.position.set(-0.5,0.18,0.09); screen.rotation.x=-0.15;
      g.add(screen);
      // Neat combed hair (use player hair color)
      const hairP5=new THREE.Mesh(
        new THREE.SphereGeometry(0.365,16,12,0,TAU,0,PI*0.45),
        hairMat
      );
      hairP5.position.set(0,0.08,0); hairP5.scale.set(1,0.4,1.05); head.add(hairP5);
      // Side part
      const part=new THREE.Mesh(
        new THREE.BoxGeometry(0.15,0.03,0.1),
        new THREE.MeshStandardMaterial({color:0x333333})
      );
      part.position.set(0.05,0.14,0.1); head.add(part);
      break;

    case 'The Underdog': case 'EasyBake': // Messy hair + lucky charm
      // Messy hair — uneven sphere (use player hair color)
      const hairP6=new THREE.Mesh(
        new THREE.SphereGeometry(0.38,16,12,0,TAU,0,PI*0.55),
        hairMat
      );
      hairP6.position.set(0,0.04,0); hairP6.scale.set(1.05,0.65,1.05);
      // Tilt slightly
      hairP6.rotation.z=0.08;
      head.add(hairP6);
      // Hair strands sticking up
      for(let k=0;k<3;k++){
        const strand=new THREE.Mesh(
          new THREE.ConeGeometry(0.03,0.1+Math.random()*0.06,4),
          new THREE.MeshStandardMaterial({color:0x5a3e10,roughness:0.6})
        );
        strand.position.set(-0.1+k*0.1,0.22+Math.random()*0.05,0);
        strand.rotation.set(Math.random()*0.3-0.15,0,Math.random()*0.3-0.15);
        head.add(strand);
      }
      // Lucky charm (four-leaf clover) in right hand
      for(let k=0;k<4;k++){
        const leaf=new THREE.Mesh(
          new THREE.SphereGeometry(0.04,8,6),
          new THREE.MeshStandardMaterial({color:0x27ae60,roughness:0.4})
        );
        const a2=k/4*TAU;
        leaf.position.set(0.48+cos(a2)*0.06,0.15+sin(a2)*0.06,0.08);
        leaf.scale.set(1,1.5,0.5);
        g.add(leaf);
      }
      // Worried eyebrows — adjust existing ones (local to head group)
      browL.position.y=0.10; browL.rotation.z=-0.2;
      browR.position.y=0.10; browR.rotation.z=0.2;
      // Nervous posture — slightly leaning back
      g.rotation.x=-0.05;
      break;
  }

  // === Base platform ===
  const baseMat = new THREE.MeshStandardMaterial({color:player.color,roughness:0.58,metalness:0.04});
  const base=new THREE.Mesh(
    new THREE.CylinderGeometry(0.5,0.55,0.08,24),
    baseMat
  );
  base.position.y=-0.14; base.receiveShadow=true; g.add(base);

  const ringMat = new THREE.MeshStandardMaterial({
    color:player.accent, side:THREE.DoubleSide, roughness:0.42, metalness:0.08,
    emissive:player.accent, emissiveIntensity:0.16
  });
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(0.5,0.58,24),
    ringMat
  );
  ring.position.y=-0.09; ring.rotation.x=-PI/2; g.add(ring);

  
  // Highlight ring (for active speaker)
  const highlight = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.7, 32),
    new THREE.MeshBasicMaterial({ color: 0xe8c468, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  highlight.position.y = -0.08; highlight.rotation.x = -PI / 2;
  highlight.userData.isHighlight = true;
  g.add(highlight);

  // Accessories are created by several persona-specific branches. Normalize
  // their shadow settings here so small details contribute to the final form,
  // while inflated outline shells never create oversized duplicate shadows.
  g.traverse(obj => {
    if (!obj.isMesh || obj.userData.isOutline || obj.userData.isHighlight) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
  });

  // Store refs
  g.userData = { player, index, highlight, baseMat, ringMat, _originalBaseColor: player.color, _originalRingColor: player.accent, _baseRotY: g.rotation.y };
  return g;
}

function buildAllCharacters() {
  chars = PLAYERS.map((p, i) => buildCharacter(p, i));
}

// ===== 3D Avatar Portrait Renderer =====
const avatarCache = {};
let _avatarRenderer = null;
function getAvatarRenderer() {
  if (_avatarRenderer) return _avatarRenderer;
  // Create a dedicated offscreen renderer for avatar portraits
  const avCanvas = document.createElement('canvas');
  avCanvas.width = 256; avCanvas.height = 256;
  _avatarRenderer = new THREE.WebGLRenderer({
    canvas: avCanvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  _avatarRenderer.setPixelRatio(1);
  _avatarRenderer.shadowMap.enabled = false;
  _avatarRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  _avatarRenderer.toneMappingExposure = 1.12;
  _avatarRenderer.outputColorSpace = THREE.SRGBColorSpace;
  return _avatarRenderer;
}

function renderAvatarPortrait(player, size = 128) {
  const key = player.name + '_' + size;
  if (avatarCache[key]) return avatarCache[key];

  const avRenderer = getAvatarRenderer();

  // Mini scene for portrait
  const avScene = new THREE.Scene();
  avScene.background = new THREE.Color(0x1a1520);
  const avCam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  avCam.position.set(0, 1.0, 2.2);
  avCam.lookAt(0, 0.98, 0);

  const avAmb = new THREE.HemisphereLight(0xdce8ff, 0x8c674a, 0.9);
  avScene.add(avAmb);
  const avDir = new THREE.DirectionalLight(0xfff5e0, 1.05);
  avDir.position.set(2, 3, 2);
  avScene.add(avDir);
  const avFill = new THREE.DirectionalLight(0x6688ff, 0.3);
  avFill.position.set(-2, 1, 1);
  avScene.add(avFill);

  // Build a simplified head+shoulders for portrait — use new palette fields
  const skinMat = new THREE.MeshToonMaterial({color:player.skin||player.head||0xD4A574, gradientMap: TOON_GRADIENT_SOFT});
  const bodyMat = new THREE.MeshToonMaterial({color:player.body||0x4a0000, gradientMap: TOON_GRADIENT});
  const accMat = new THREE.MeshToonMaterial({color:player.accent||player.body||0xe74c3c, gradientMap: TOON_GRADIENT});
  const hairMat = new THREE.MeshToonMaterial({color:player.hair||0x1a1410, gradientMap: TOON_GRADIENT});
  const darkMat = new THREE.MeshToonMaterial({color:0x1a1a2e, gradientMap: TOON_GRADIENT});
  for (const mat of [skinMat, bodyMat, accMat, hairMat, darkMat]) mat.dithering = true;
  bodyMat.bumpMap = FABRIC_BUMP;
  bodyMat.bumpScale = 0.018;
  accMat.bumpMap = FABRIC_BUMP;
  accMat.bumpScale = 0.014;

  // Head — group so face features follow any future head animation
  const head = new THREE.Group();
  head.position.y = 0.98;
  avScene.add(head);

  const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 32), skinMat);
  head.add(headSphere);

  // Positions are local to head (world y - 0.98)

  // Ears
  const earGeo = new THREE.SphereGeometry(0.06, 16, 10);
  const earL = new THREE.Mesh(earGeo, skinMat); earL.position.set(-0.35, -0.01, 0); earL.scale.set(0.5, 1, 0.8); head.add(earL);
  const earR = new THREE.Mesh(earGeo, skinMat); earR.position.set(0.35, -0.01, 0); earR.scale.set(0.5, 1, 0.8); head.add(earR);

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.1, 0.02, 0.03);
  const browL = new THREE.Mesh(browGeo, darkMat); browL.position.set(-0.12, 0.07, 0.32); browL.rotation.z = 0.08; head.add(browL);
  const browR = new THREE.Mesh(browGeo, darkMat); browR.position.set(0.12, 0.07, 0.32); browR.rotation.z = -0.08; head.add(browR);

  // Eyes
  const eyeWhiteMat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.3});
  const eyeGeo2 = new THREE.SphereGeometry(0.05, 16, 12);
  const eL = new THREE.Mesh(eyeGeo2, eyeWhiteMat); eL.position.set(-0.12, 0.02, 0.32); eL.scale.set(1.2, 1, 0.6); head.add(eL);
  const eR = new THREE.Mesh(eyeGeo2, eyeWhiteMat); eR.position.set(0.12, 0.02, 0.32); eR.scale.set(1.2, 1, 0.6); head.add(eR);
  const pupilGeo = new THREE.SphereGeometry(0.02, 12, 8);
  const pL = new THREE.Mesh(pupilGeo, darkMat); pL.position.set(-0.12, 0.02, 0.36); head.add(pL);
  const pR = new THREE.Mesh(pupilGeo, darkMat); pR.position.set(0.12, 0.02, 0.36); head.add(pR);

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), skinMat);
  nose.position.set(0, -0.06, 0.38); nose.rotation.x = PI/2; nose.scale.set(0.8, 1, 0.8); head.add(nose);

  // Mouth
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 16, PI), new THREE.MeshStandardMaterial({color:0x8B3A3A, roughness:0.4}));
  smile.position.set(0, -0.12, 0.35); smile.rotation.z = PI; head.add(smile);

  // Chin
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), skinMat);
  chin.position.set(0, -0.16, 0.28); chin.scale.set(1, 0.6, 0.8); head.add(chin);

  // Shoulders/torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.55, 24), bodyMat);
  torso.position.y = 0.35; avScene.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), bodyMat);
  shoulders.position.y = 0.58; shoulders.scale.set(1, 0.5, 0.8); avScene.add(shoulders);

  // Persona-specific accessories (simplified for portrait)
  addAvatarAccessories(avScene, head, player, skinMat, bodyMat, accMat, darkMat, browL, browR, smile);

  // Render to texture using dedicated offscreen renderer (no hijacking main renderer)
  avRenderer.setSize(size, size, false);
  avRenderer.setRenderTarget(null);
  avRenderer.render(avScene, avCam);

  // Read pixels directly from the offscreen canvas
  const gl = avRenderer.getContext();
  const pixels = new Uint8Array(size * size * 4);
  gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  // Flip Y (WebGL bottom-to-top)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcIdx = ((size - 1 - y) * size + x) * 4;
      const dstIdx = (y * size + x) * 4;
      imageData.data[dstIdx] = pixels[srcIdx];
      imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
      imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
      imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');

  // Cleanup scene resources
  avScene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });

  avatarCache[key] = dataUrl;
  return dataUrl;
}

function addAvatarAccessories(scene, head, player, skinMat, bodyMat, accMat, darkMat, browL, browR, smile) {
  switch(player.name) {
    case 'The Prosecutor': case 'Blaze': {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, TAU, 0, PI*0.45), new THREE.MeshStandardMaterial({color:0x2a1a0a, roughness:0.4}));
      hair.position.set(0, 0.07, 0); hair.scale.set(1, 0.5, 1); head.add(hair);
      const collar = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.15, 4), accMat);
      collar.position.set(0, 0.62, 0.28); collar.rotation.x = PI; collar.rotation.y = PI/4; scene.add(collar);
      const tie = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), new THREE.MeshStandardMaterial({color:0xc0392b}));
      tie.position.set(0, 0.5, 0.3); tie.rotation.x = -PI/2+0.3; scene.add(tie);
      break;
    }
    case 'The Therapist': case 'SafetySam': {
      const glassL = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16), new THREE.MeshStandardMaterial({color:0x333333, metalness:0.5, roughness:0.2}));
      glassL.position.set(-0.12, 0.02, 0.32); head.add(glassL);
      const glassR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16), new THREE.MeshStandardMaterial({color:0x333333, metalness:0.5, roughness:0.2}));
      glassR.position.set(0.12, 0.02, 0.32); head.add(glassR);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12, 0, TAU, 0, PI*0.5), new THREE.MeshStandardMaterial({color:0x4a3520, roughness:0.5}));
      hair.position.set(0, 0.06, 0); hair.scale.set(1, 0.6, 1); head.add(hair);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), new THREE.MeshStandardMaterial({color:0x4a3520, roughness:0.5}));
      bun.position.set(0, 0.24, -0.15); head.add(bun);
      break;
    }
    case 'The Chaos Agent': case 'Twister': {
      for (let k = 0; k < 7; k++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2 + Math.random()*0.1, 5), new THREE.MeshStandardMaterial({color:0xB85820, roughness:0.4}));
        const a = k/7 * TAU;
        spike.position.set(cos(a)*0.25, 0.17, sin(a)*0.25);
        spike.rotation.set(Math.random()*0.3-0.15, a, Math.random()*0.4-0.2);
        head.add(spike);
      }
      smile.geometry = new THREE.TorusGeometry(0.09, 0.018, 8, 16, PI*1.1);
      break;
    }
    case 'The Gut Player': case 'ConspiBro': {
      const bandana = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 20), new THREE.MeshStandardMaterial({color:0x7f8c8d, roughness:0.4}));
      bandana.position.set(0, 0.1, 0); bandana.rotation.x = PI/2; bandana.scale.set(1, 1, 0.8); head.add(bandana);
      const scar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.01), new THREE.MeshStandardMaterial({color:0xaa3333}));
      scar.position.set(-0.15, -0.03, 0.35); scar.rotation.z = 0.2; head.add(scar);
      break;
    }
    case 'The Statistician': case 'Dr. Pizza': {
      const sgL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 16), new THREE.MeshStandardMaterial({color:0x2980b9, metalness:0.4, roughness:0.2}));
      sgL.position.set(-0.12, 0.02, 0.32); head.add(sgL);
      const sgR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 16), new THREE.MeshStandardMaterial({color:0x2980b9, metalness:0.4, roughness:0.2}));
      sgR.position.set(0.12, 0.02, 0.32); head.add(sgR);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, TAU, 0, PI*0.4), new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.3}));
      hair.position.set(0, 0.08, 0); hair.scale.set(1, 0.35, 1.05); head.add(hair);
      break;
    }
    case 'The Underdog': case 'EasyBake': {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12, 0, TAU, 0, PI*0.55), new THREE.MeshStandardMaterial({color:0x5a3e10, roughness:0.6}));
      hair.position.set(0, 0.04, 0); hair.scale.set(1.05, 0.65, 1.05); hair.rotation.z = 0.08; head.add(hair);
      for (let k = 0; k < 3; k++) {
        const strand = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1 + Math.random()*0.06, 4), new THREE.MeshStandardMaterial({color:0x5a3e10, roughness:0.6}));
        strand.position.set(-0.1 + k*0.1, 0.22 + Math.random()*0.05, 0);
        strand.rotation.set(Math.random()*0.3-0.15, 0, Math.random()*0.3-0.15);
        head.add(strand);
      }
      browL.position.y = 0.10; browL.rotation.z = -0.2;
      browR.position.y = 0.10; browR.rotation.z = 0.2;
      break;
    }
  }
}

// ===== Camera Controls =====
let theta = 0, phi = PI / 2.4;
// Narrow mobile viewports need more distance to keep the full circle visible.
let dist = (innerWidth <= 768) ? 20 : 10;
const targetV = new THREE.Vector3(0, 1.1, 0);
let isDrag = false, isPan = false, px = 0, py = 0;
const DIST_MIN = 3, DIST_MAX = 40;

function updateCam() {
  const x = dist * sin(phi) * cos(theta);
  const y = dist * cos(phi) + 0.5;
  const z = dist * sin(phi) * sin(theta);
  camera.position.set(x, y, z);
  camera.lookAt(targetV);
}

function setupCameraControls() {
  canvas.addEventListener('mousedown', e => { isDrag = true; isPan = e.button === 2; px = e.clientX; py = e.clientY; });
  window.addEventListener('mouseup', () => { isDrag = false; isPan = false; });
  window.addEventListener('mousemove', e => {
    if (!isDrag) return;
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    if (isPan) {
      const ps = 0.01 * dist;
      const right = new THREE.Vector3(); camera.getWorldDirection(right);
      right.cross(new THREE.Vector3(0, 1, 0)).normalize();
      targetV.addScaledVector(right, -dx * ps);
      targetV.addScaledVector(new THREE.Vector3(0, 1, 0), dy * ps);
    } else {
      theta -= dx * 0.008; phi -= dy * 0.008;
      phi = Math.max(0.02, Math.min(PI / 2.05, phi));
    }
    updateCam();
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    dist *= e.deltaY > 0 ? 1.1 : 0.9;
    dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist));
    updateCam();
  }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ===== Touch Controls (pinch zoom + drag rotate/pan) =====
  let touchState = null; // {mode: 'rotate'|'pinch', x0, y0, x1, y1, dist0}

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      touchState = { mode: 'rotate', x0: e.touches[0].clientX, y0: e.touches[0].clientY, startX: e.touches[0].clientX, startY: e.touches[0].clientY, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchState = {
        mode: 'pinch',
        x0: e.touches[0].clientX, y0: e.touches[0].clientY,
        x1: e.touches[1].clientX, y1: e.touches[1].clientY,
        dist0: Math.hypot(dx, dy),
        startDist: dist,
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        targetX: targetV.x, targetY: targetV.y, targetZ: targetV.z,
      };
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!touchState) return;
    if (touchState.mode === 'rotate' && e.touches.length === 1) {
      const cx = e.touches[0].clientX, cy = e.touches[0].clientY;
      const dx = cx - touchState.x0;
      const dy = cy - touchState.y0;
      touchState.x0 = cx;
      touchState.y0 = cy;
      touchState.lastX = cx;
      touchState.lastY = cy;
      theta -= dx * 0.008;
      phi -= dy * 0.008;
      phi = Math.max(0.02, Math.min(PI / 2.05, phi));
      updateCam();
    } else if (touchState.mode === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const scale = touchState.dist0 / newDist;
      dist = Math.max(DIST_MIN, Math.min(DIST_MAX, touchState.startDist * scale));

      // Two-finger drag also pans target
      const newMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const newMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const panDx = newMidX - touchState.midX;
      const panDy = newMidY - touchState.midY;
      const ps = 0.008 * dist;
      const right = new THREE.Vector3(); camera.getWorldDirection(right);
      right.cross(new THREE.Vector3(0, 1, 0)).normalize();
      targetV.addScaledVector(right, -panDx * ps);
      targetV.addScaledVector(new THREE.Vector3(0, 1, 0), panDy * ps);
      touchState.midX = newMidX;
      touchState.midY = newMidY;

      updateCam();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
      // Swipe-to-change-phase detection
      if (touchState && touchState.mode === 'rotate' && touchState.startX !== undefined) {
        const dx = touchState.lastX - touchState.startX;
        const dy = touchState.lastY - touchState.startY;
        // Horizontal swipe: |dx| > 60, |dx| > 2*|dy|, short duration
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
          const phases = ['night', 'day', 'vote', 'resolve', 'postgame'];
          const curIdx = phases.indexOf(currentPhase);
          if (dx > 0 && curIdx > 0) setPhase(phases[curIdx - 1]);
          else if (dx < 0 && curIdx < phases.length - 1) setPhase(phases[curIdx + 1]);
        }
      }
      touchState = null;
    }
    else if (e.touches.length === 1) {
      touchState = { mode: 'rotate', x0: e.touches[0].clientX, y0: e.touches[0].clientY };
    }
  });

  // Raycaster for hover
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  let hoveredId = -1;

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const intersects = raycaster.intersectObjects(chars, true);
    let foundId = -1;
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && obj.parent) {
        const idx = chars.indexOf(obj);
        if (idx >= 0) { foundId = PLAYERS[idx].id; break; }
        obj = obj.parent;
      }
    }
    if (foundId !== hoveredId) {
      hoveredId = foundId;
      if (foundId > 0) {
        const p = PLAYERS.find(x => String(x.id) === String(foundId));
        if (p) {
          const hex = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
          const avatarUrl = renderAvatarPortrait(p, 96);
          const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
          hoverCard.innerHTML = `
            <div class="avatar-img" style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:2px solid ${hex};flex-shrink:0;"><img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" /></div>
            <div class="name" style="color:${hex}">${displayName}</div>
            <div class="desc">${p.persona}</div>
            <div class="trait" style="margin-top:6px;font-size:10px;color:#666;">${(p.model || '').split('/').pop()}</div>
          `;
          hoverCard.style.borderColor = hex + '66';
          hoverCard.style.opacity = '1';
        }
      } else {
        hoverCard.style.opacity = '0';
      }
    }
    if (foundId > 0) {
      hoverCard.style.left = (e.clientX + 15) + 'px';
      hoverCard.style.top = (e.clientY + 15) + 'px';
    }

  });

  // Dedicated click / double-click handler (fixes: mousemove e.detail fires spuriously)
  let clickTimer = null;
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const intersects = raycaster.intersectObjects(chars, true);
    let foundId = -1;
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && obj.parent) {
        const idx = chars.indexOf(obj);
        if (idx >= 0) { foundId = PLAYERS[idx].id; break; }
        obj = obj.parent;
      }
    }
    if (foundId > 0) {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; showPlayerDetail(foundId); }
      else { clickTimer = setTimeout(() => { clickTimer = null; showPlayerModal(foundId); }, 250); }
    }
  });

  updateCam();

  // ===== Keyboard Pan Controls (WASD / Arrow Keys) =====
  const keys = {};
  window.addEventListener('keydown', e => {
    // Don't capture if typing in input/textarea
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const k = e.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
      keys[k] = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    keys[k] = false;
  });

  // Hook into animate loop via global flag
  window._panKeys = keys;
}

function updateKeyboardPan() {
  if (!window._panKeys) return;
  const keys = window._panKeys;
  const panSpeed = 0.08;
  const right = new THREE.Vector3();
  camera.getWorldDirection(right);
  right.cross(new THREE.Vector3(0, 1, 0)).normalize();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  let moved = false;
  if (keys['w'] || keys['arrowup']) { targetV.addScaledVector(forward, panSpeed); moved = true; }
  if (keys['s'] || keys['arrowdown']) { targetV.addScaledVector(forward, -panSpeed); moved = true; }
  if (keys['a'] || keys['arrowleft']) { targetV.addScaledVector(right, -panSpeed); moved = true; }
  if (keys['d'] || keys['arrowright']) { targetV.addScaledVector(right, panSpeed); moved = true; }
  if (moved) updateCam();
}

// ===== Night Mode (with smooth transition) =====
let nightTransition = null; // {fromVals, toVals, startTime, duration}
const NIGHT_PRESETS = {
  // Keep daytime fog beyond the floor. The previous 14–32 range blended the
  // platform into the bright day fog and looked like a large white reflection,
  // especially at wider zoom levels.
  day: {
    bg:0xa8c0d8, fogColor:0x465766, fogNear:60, fogFar:100,
    amb:1.05, dir:1.15, dirColor:0xfff5df, moon:0, candle:0, flame:0
  },
  night: {
    bg:0x0a0a18, fogColor:0x0a0a18, fogNear:14, fogFar:32,
    amb:0.30, dir:0.38, dirColor:0x6677ff, moon:0.6, candle:4, flame:2.5
  },
};

function setNight(n) {
  isNight = n;
  const target = n ? NIGHT_PRESETS.night : NIGHT_PRESETS.day;
  const from = {
    bg: scene.background.getHex(),
    amb: amb.intensity, dir: dir.intensity,
    dirR: dir.color.r, dirG: dir.color.g, dirB: dir.color.b,
    moon: moonPoint.intensity, candle: candlePoint.intensity,
    flame: flame.material.emissiveIntensity,
    fogR: scene.fog.color.r, fogG: scene.fog.color.g, fogB: scene.fog.color.b,
    fogNear: scene.fog.near, fogFar: scene.fog.far,
  };
  nightTransition = { from, target, startTime: performance.now(), duration: 600 };

  // Day mode hides brazier embers + lights (no fire during daylight)
  if (window.__brazierEmbers && window.__brazierLights) {
    const showBraziers = n;
    for (const e of window.__brazierEmbers) e.visible = showBraziers;
    for (const l of window.__brazierLights) l.intensity = showBraziers ? 0.35 : 0;
  }
}

function updateNightTransition() {
  if (!nightTransition) return;
  const elapsed = performance.now() - nightTransition.startTime;
  const t = Math.min(elapsed / nightTransition.duration, 1);
  // Ease in-out
  const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
  const f = nightTransition.from, tgt = nightTransition.target;

  const bg = new THREE.Color(
    f.bg + (tgt.bg - f.bg) * e  // hex lerp won't work directly, use component
  );
  // Proper component-wise interpolation
  const bgR = (f.bg >> 16 & 0xff) / 255 + ((tgt.bg >> 16 & 0xff) - (f.bg >> 16 & 0xff)) / 255 * e;
  const bgG = (f.bg >> 8 & 0xff) / 255 + ((tgt.bg >> 8 & 0xff) - (f.bg >> 8 & 0xff)) / 255 * e;
  const bgB = (f.bg & 0xff) / 255 + ((tgt.bg & 0xff) - (f.bg & 0xff)) / 255 * e;
  scene.background.setRGB(bgR, bgG, bgB);
  scene.fog.color.setRGB(
    f.fogR + (((tgt.fogColor >> 16 & 0xff)/255) - f.fogR) * e,
    f.fogG + (((tgt.fogColor >> 8 & 0xff)/255) - f.fogG) * e,
    f.fogB + (((tgt.fogColor & 0xff)/255) - f.fogB) * e
  );
  scene.fog.near = f.fogNear + (tgt.fogNear - f.fogNear) * e;
  scene.fog.far = f.fogFar + (tgt.fogFar - f.fogFar) * e;
  amb.intensity = f.amb + (tgt.amb - f.amb) * e;
  dir.intensity = f.dir + (tgt.dir - f.dir) * e;
  dir.color.setRGB(
    f.dirR + (((tgt.dirColor >> 16 & 0xff)/255) - f.dirR) * e,
    f.dirG + (((tgt.dirColor >> 8 & 0xff)/255) - f.dirG) * e,
    f.dirB + (((tgt.dirColor & 0xff)/255) - f.dirB) * e
  );
  moonPoint.intensity = f.moon + (tgt.moon - f.moon) * e;
  candlePoint.intensity = f.candle + (tgt.candle - f.candle) * e;
  flame.material.emissiveIntensity = f.flame + (tgt.flame - f.flame) * e;

  if (t >= 1) nightTransition = null;
}

// ===== Name Tags =====
let tagEls = [];
function buildNameTags() {
  tagsContainer.innerHTML = '';
  tagEls = [];
  PLAYERS.forEach(p => {
    const d = document.createElement('div');
    d.className = 'tag';
    const hex = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
    d.style.border = '1px solid ' + hex + '44';
    d.style.color = hex;
    const main = lang === 'zh' ? (p.name_zh || p.name) : p.name;
    d.innerHTML = main + '<div class="role-sub"></div>';
    tagsContainer.appendChild(d);
    tagEls.push(d);
  });
}

// Team colors for resolve/postgame phases
const TEAM_COLORS = {
  village_team: 0x2ecc71,   // green
  werewolf_team: 0xe74c3c,  // red
  tanner: 0xf1c40f,         // yellow
  none: 0x95a5a6,           // grey
};

function showTeamColors(finalRoles) {
  if (!finalRoles) return;
  PLAYERS.forEach((p, i) => {
    const roleInfo = finalRoles[p.name];
    if (!roleInfo) return;
    const team = roleInfo.team || 'none';
    const teamColor = TEAM_COLORS[team] || 0x95a5a6;
    const roleDisplay = lang === 'zh' ? roleZh(roleInfo.current_role) : roleInfo.current_role;
    
    // Change base color
    if (chars[i] && chars[i].userData.baseMat) {
      chars[i].userData.baseMat.color.setHex(teamColor);
      chars[i].userData.baseMat.emissive.setHex(teamColor);
      chars[i].userData.baseMat.emissiveIntensity = 0.15;
    }
    if (chars[i] && chars[i].userData.ringMat) {
      chars[i].userData.ringMat.color.setHex(teamColor);
      chars[i].userData.ringMat.emissive.setHex(teamColor);
      chars[i].userData.ringMat.emissiveIntensity = 0.4;
    }
    
    // Add role to name tag
    if (tagEls[i]) {
      const roleSub = tagEls[i].querySelector('.role-sub');
      if (roleSub) {
        roleSub.textContent = roleDisplay;
        roleSub.style.color = '#' + teamColor.toString(16).padStart(6, '0');
      }
    }
  });
}

function resetTeamColors() {
  PLAYERS.forEach((p, i) => {
    if (chars[i] && chars[i].userData.baseMat) {
      chars[i].userData.baseMat.color.setHex(chars[i].userData._originalBaseColor);
      chars[i].userData.baseMat.emissive.setHex(0x000000);
      chars[i].userData.baseMat.emissiveIntensity = 0;
    }
    if (chars[i] && chars[i].userData.ringMat) {
      chars[i].userData.ringMat.color.setHex(chars[i].userData._originalRingColor);
      chars[i].userData.ringMat.emissive.setHex(chars[i].userData._originalRingColor);
      chars[i].userData.ringMat.emissiveIntensity = 0.3;
    }
    if (tagEls[i]) {
      const roleSub = tagEls[i].querySelector('.role-sub');
      if (roleSub) roleSub.textContent = '';
    }
  });
}

function updateNameTags() {
  const w = innerWidth, h = innerHeight;
  PLAYERS.forEach((p, i) => {
    const pos = sp(i);
    // Lower the tag for foreground characters (closer to camera bottom) to avoid covering faces
    const worldPos = new THREE.Vector3(pos[0], pos[1] + 1.6, pos[2]);
    const screenPos = worldPos.clone().project(camera);
    const isForeground = screenPos.y < -0.2; // lower half of screen = foreground
    const yOffset = isForeground ? 1.95 : 1.6;
    const v = new THREE.Vector3(pos[0], pos[1] + yOffset, pos[2]);
    v.project(camera);
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    const d = camera.position.distanceTo(new THREE.Vector3(pos[0], pos[1] + 1.6, pos[2]));
    const s = Math.min(1.2, 8 / d);
    if (tagEls[i]) {
      tagEls[i].style.left = x + 'px';
      tagEls[i].style.top = y + 'px';
      tagEls[i].style.transform = `translate(-50%,-50%) scale(${s})`;
      tagEls[i].style.opacity = v.z < 1 ? '1' : '0';
    }
  });
}

// ===== Speech Bubbles =====
const MAX_BUBBLES = 3;

function showBubble(playerIndex, text, duration = 4000) {
  const p = PLAYERS[playerIndex];
  if (!p) return;
  const hex = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;

  const el = document.createElement('div');
  el.className = 'bubble';
  el.style.borderColor = hex;
  el.innerHTML = `
    <div class="speaker" style="color:${hex}">${displayName}</div>
    <div class="text">${formatGameText(text)}</div>
    <div class="arrow" style="border-top-color:${hex}"></div>
  `;
  bubblesContainer.appendChild(el);

  // Highlight speaker + start speaking animation
  if (chars[playerIndex] && chars[playerIndex].userData.highlight) {
    chars[playerIndex].userData.highlight.material.opacity = 0.6;
  }
  setSpeaking(playerIndex, true);

  const bubbleData = { playerIndex, text, duration, startTime: performance.now(), el, hex };
  activeBubblesData.push(bubbleData);

  // Enforce max visible bubbles (remove oldest)
  while (activeBubblesData.length > MAX_BUBBLES) {
    const old = activeBubblesData.shift();
    old.el.style.transition = 'opacity 0.4s';
    old.el.style.opacity = '0';
    const oldEl = old.el;
    const oldIdx = old.playerIndex;
    setTimeout(() => oldEl.remove(), 400);
    activeBubblesData = activeBubblesData.filter(b => b !== old);
    // Only clear highlight if no other bubble references this player
    if (!activeBubblesData.some(b => b.playerIndex === oldIdx)) {
      if (chars[oldIdx] && chars[oldIdx].userData.highlight) {
        chars[oldIdx].userData.highlight.material.opacity = 0;
      }
    }
  }

  updateBubblePosition(bubbleData);

  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
    activeBubblesData = activeBubblesData.filter(b => b !== bubbleData);
    if (chars[playerIndex] && chars[playerIndex].userData.highlight) {
      chars[playerIndex].userData.highlight.material.opacity = 0;
    }
    setSpeaking(playerIndex, false);
  }, duration);
}

function updateBubblePosition(b) {
  const p = PLAYERS[b.playerIndex];
  if (!p) return;
  const pos = sp(b.playerIndex);
  const v = new THREE.Vector3(pos[0], pos[1] + 1.8, pos[2]);
  v.project(camera);
  const projectedX = (v.x * 0.5 + 0.5) * innerWidth;
  const projectedY = (-v.y * 0.5 + 0.5) * innerHeight;
  const bubbleWidth = b.el.offsetWidth || Math.min(280, innerWidth - 16);
  const bubbleHeight = b.el.offsetHeight || 80;
  const margin = innerWidth <= 768 ? 8 : 12;
  const topClearance = innerWidth <= 768 ? 64 : 48;
  const bottomClearance = innerWidth <= 768 ? 108 : 72;
  const halfWidth = bubbleWidth / 2;
  const x = THREE.MathUtils.clamp(
    projectedX,
    margin + halfWidth,
    innerWidth - margin - halfWidth
  );
  const y = THREE.MathUtils.clamp(
    projectedY,
    topClearance + bubbleHeight,
    innerHeight - bottomClearance
  );
  // Use transform for GPU-accelerated movement (no reflow)
  b.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
}

function updateAllBubbles() {
  activeBubblesData.forEach(b => updateBubblePosition(b));
}

function clearBubbles() {
  bubblesContainer.innerHTML = '';
  activeBubblesData = [];
  speakingStates = [];
  chars.forEach((c, i) => {
    if (c.userData && c.userData.highlight) {
      c.userData.highlight.material.opacity = 0;
    }
    // Reset head position
    c.children.forEach(child => {
      if (child.userData._baseY) {
        child.position.y = child.userData._baseY;
        delete child.userData._baseY;
      }
    });
    c.rotation.x = 0;
  });
}

// ===== Vote Arrows =====
// Vote arrow elements are created once, then only coordinates updated per frame
let voteArrowEls = []; // [{path, head, label, voter, target}]

function showVoteArrows(votes) {
  activeVotes = votes;
  voteOverlay.innerHTML = '';
  voteArrowEls = [];
  if (!activeVotes) return;

  for (const [voter, target] of Object.entries(activeVotes)) {
    const vi = PLAYERS.findIndex(p => p.name === voter);
    const ti = PLAYERS.findIndex(p => p.name === target);
    if (vi < 0 || ti < 0) continue;

    const voterColor = getPlayerColor(voter);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'vote-arrow-svg');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', voterColor);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '6,4');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.7');
    svg.appendChild(path);

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('fill', voterColor);
    head.setAttribute('opacity', '0.85');
    svg.appendChild(head);

    voteOverlay.appendChild(svg);

    const voterP = PLAYERS.find(x => x.name === voter);
    const voterName = lang === 'zh' && voterP ? (voterP.name_zh || voter) : voter;
    const label = document.createElement('div');
    label.className = 'vote-label';
    label.style.color = voterColor;
    label.textContent = voterName;
    voteOverlay.appendChild(label);

    voteArrowEls.push({ path, head, label, voter, target });
  }
  redrawVoteArrows();
}

function redrawVoteArrows() {
  if (!activeVotes || voteArrowEls.length === 0) return;
  for (const va of voteArrowEls) {
    const vi = PLAYERS.findIndex(p => p.name === va.voter);
    const ti = PLAYERS.findIndex(p => p.name === va.target);
    if (vi < 0 || ti < 0) continue;

    const vpos = sp(vi);
    const tpos = sp(ti);
    const vStart = new THREE.Vector3(vpos[0], vpos[1] + 0.5, vpos[2]);
    const vEnd = new THREE.Vector3(tpos[0], tpos[1] + 0.5, tpos[2]);
    const startScreen = vStart.clone().project(camera);
    const endScreen = vEnd.clone().project(camera);
    const sx = (startScreen.x * 0.5 + 0.5) * innerWidth;
    const sy = (-startScreen.y * 0.5 + 0.5) * innerHeight;
    const ex = (endScreen.x * 0.5 + 0.5) * innerWidth;
    const ey = (-endScreen.y * 0.5 + 0.5) * innerHeight;

    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 10) { va.path.setAttribute('d', ''); continue; }

    const headLen = Math.min(16, len * 0.25);
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2 - Math.max(50, len * 0.35);
    va.path.setAttribute('d', `M ${sx},${sy} Q ${midX},${midY} ${ex},${ey}`);

    // Arrowhead tangent at end of curve
    const tdx = ex - midX, tdy = ey - midY;
    const tlen = Math.sqrt(tdx*tdx + tdy*tdy) || 1;
    const tangentAngle = Math.atan2(tdy / tlen, tdx / tlen);
    const hx1c = ex - headLen * Math.cos(tangentAngle - 0.4);
    const hy1c = ey - headLen * Math.sin(tangentAngle - 0.4);
    const hx2c = ex - headLen * Math.cos(tangentAngle + 0.4);
    const hy2c = ey - headLen * Math.sin(tangentAngle + 0.4);
    va.head.setAttribute('points', `${ex},${ey} ${hx1c},${hy1c} ${hx2c},${hy2c}`);

    va.label.style.left = sx + 'px';
    va.label.style.top = sy + 'px';
  }
}

function clearVoteArrows() {
  activeVotes = null;
  voteOverlay.innerHTML = '';
}

// ===== Result Banner =====
function showResultBanner(outcome, reason, winners) {
  const titles = {
    werewolf_win: t('werewolfWin'),
    village_win: t('villageWin'),
    tanner_win: t('tannerWin'),
    village_win_no_wolf: t('villageWin'),
    no_team_win: t('noTeamWin'),
  };
  resultBanner.querySelector('.title').textContent = titles[outcome] || outcome;
  resultBanner.querySelector('.sub').textContent = reason || '';
  const winLabel = lang === 'zh' ? '勝方：' : 'Winners: ';
  const winNames = winners && winners.length ? winners.map(n => {
    const p = PLAYERS.find(x => x.name === n);
    return lang === 'zh' && p ? (p.name_zh || n) : n;
  }) : [];
  resultBanner.querySelector('.winners').textContent = winNames.length ? winLabel + winNames.join(', ') : '';
  resultBanner.classList.add('visible');
  setTimeout(() => resultBanner.classList.remove('visible'), 5000);
}

function hideResultBanner() {
  resultBanner.classList.remove('visible');
}

// ===== Highlight Character =====
function highlightCharacter(index, active) {
  if (chars[index] && chars[index].userData.highlight) {
    chars[index].userData.highlight.material.opacity = active ? 0.6 : 0;
  }
}

// ===== Dim Character (executed) — animated death =====
function dimCharacter(index) {
  if (!chars[index]) return;
  // Snapshot per-character (materials are shared, so per-mesh originalColor is unsafe)
  if (!chars[index].userData._dimSnapshot) {
    const snap = [];
    chars[index].traverse(obj => {
      if (obj.isMesh && obj.material) {
        snap.push({
          mat: obj.material,
          color: obj.material.color.clone(),
          emissive: obj.material.emissive ? obj.material.emissive.clone() : null,
        });
      }
    });
    chars[index].userData._dimSnapshot = snap;
  }
  chars[index].traverse(obj => {
    if (obj.isMesh && obj.material) {
      obj.material.color.lerp(new THREE.Color(0x333333), 0.7);
      if (obj.material.emissive) obj.material.emissive.setHex(0x000000);
    }
  });
  // Start death animation (fall over)
  deathAnims.push({ index, startTime: performance.now(), duration: 800, baseY: chars[index].position.y });
}

function updateDeathAnims(t) {
  deathAnims = deathAnims.filter(d => {
    if (!chars[d.index]) return false;
    const elapsed = t - d.startTime;
    const progress = Math.min(elapsed / d.duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    // Tilt 90 degrees — fall flat
    chars[d.index].rotation.x = -(PI / 2) * eased;
    // Sink down to ground level
    const pos = sp(d.index);
    chars[d.index].position.set(pos[0], d.baseY - 0.35 * eased, pos[2]);
    return progress < 1;
  });
}

function undimAll() {
  deathAnims = [];
  teamAnims = [];
  chars.forEach(g => {
    const snap = g.userData._dimSnapshot;
    if (snap) {
      snap.forEach(s => {
        s.mat.color.copy(s.color);
        if (s.emissive && s.mat.emissive) s.mat.emissive.copy(s.emissive);
      });
      delete g.userData._dimSnapshot;
    }
    g.rotation.x = 0;
    g.rotation.y = g.userData._baseRotY || 0;
    g.rotation.z = 0;
    const pos = sp(PLAYERS.indexOf(g.userData.player));
    g.position.set(pos[0], SH, pos[2]);
  });
}

// ===== Game Data Loading =====
async function loadGameIndex() {
  try {
    const resp = await fetch(versionedUrl('./data/index.json'));
    if (!resp.ok) throw new Error('No index');
    const index = await resp.json();
    if (index.games && index.games.length > 0) {
      archiveGames = index.games.slice();
      const latest = archiveGames[0];
      await loadGame(latest.game_id || latest.id);
      buildArchiveList(archiveGames);
    }
  } catch(e) {
    console.log('No game index found, showing empty scene');
  }
}

async function loadGame(gameId) {
  const requestVersion = ++gameLoadVersion;
  const requestedLang = lang;
  const base = `./data/games/${gameId}/`;
  const suffix = requestedLang === 'zh' ? '_zh' : '';
  
  async function fetchJSON(name) {
    // Language selection is strict. Never leak English records into the
    // Chinese UI (or vice versa) through a silent localization fallback.
    const filename = name + suffix + '.json';
    const response = await fetch(versionedUrl(base + filename));
    if (!response.ok) {
      throw new Error(`Missing ${requestedLang.toUpperCase()} game record: ${filename}`);
    }
    return await response.json();
  }

  async function fetchRawJSON(name) {
    try {
      const r = await fetch(versionedUrl(base + name + '.json'));
      return r.ok ? await r.json() : null;
    } catch(e) {
      return null;
    }
  }
  
  try {
    const [night, day, vote, resolve, postgame, manifest] = await Promise.all([
      fetchJSON('night_result'),
      fetchJSON('day_result'),
      fetchJSON('vote_result'),
      fetchJSON('resolve_result'),
      fetchJSON('postgame_result'),
      fetchRawJSON('manifest'),
    ]);
    
    // The canonical discussion transcript is embedded in day_result. Older
    // published archives do not include a separate English markdown file.
    let chatHistory = day?.chat_history || '';
    if (!chatHistory) {
      try {
        const chatName = suffix ? `chat_history${suffix}.md` : 'chat_history.md';
        const response = await fetch(versionedUrl(base + chatName));
        if (response.ok) chatHistory = await response.text();
      } catch(e) {}
    }

    // Discard stale results if another game/language load started while these
    // files were in flight. This prevents a slow Chinese response from
    // overwriting an English UI (or vice versa).
    if (requestVersion !== gameLoadVersion || requestedLang !== lang) return false;

    currentGame = gameId;
    gameData = { night, day, vote, resolve, postgame, manifest, chatHistory };
    
    // Normalize ZH data: map Chinese player names back to English canonical names
    // so all lookups (PLAYERS.find, votes, speeches) work consistently
    if (night && night.players) {
      const zhToEn = {};
      for (const [, pd] of Object.entries(night.players)) {
        if (pd.name_zh && pd.name) zhToEn[pd.name_zh] = pd.name;
      }
      const mapName = (n) => zhToEn[n] || n;
      // Normalize day trace player_name and target
      if (day && day.day_trace) {
        day.day_trace.forEach(t => {
          if (t.player_name) t.player_name = mapName(t.player_name);
          if (t.target) t.target = mapName(t.target);
        });
      }
      // Normalize votes
      if (vote) {
        if (vote.votes) {
          const newVotes = {};
          for (const [voter, target] of Object.entries(vote.votes)) {
            newVotes[mapName(voter)] = mapName(target);
          }
          vote.votes = newVotes;
        }
        if (vote.tally) {
          const newTally = {};
          for (const [name, count] of Object.entries(vote.tally)) {
            newTally[mapName(name)] = count;
          }
          vote.tally = newTally;
        }
        if (vote.executed) vote.executed = vote.executed.map(mapName);
      }
      // Normalize resolve
      if (resolve) {
        if (resolve.executed) resolve.executed = resolve.executed.map(mapName);
        if (resolve.winners) resolve.winners = resolve.winners.map(mapName);
        if (resolve.final_roles) {
          const newRoles = {};
          for (const [name, role] of Object.entries(resolve.final_roles)) {
            newRoles[mapName(name)] = role;
          }
          resolve.final_roles = newRoles;
        }
      }
      // Normalize postgame
      if (postgame && postgame.interviews) {
        for (const [, items] of Object.entries(postgame.interviews)) {
          items.forEach(i => { if (i.player_name) i.player_name = mapName(i.player_name); });
        }
      }
    }
    gameData.structuredTrace = buildStructuredTrace();
    gameData.autonomy = buildAutonomyMetadata();
    currentPhase = 'night';

    // Dynamically build PLAYERS from game data
    if (night && night.players) {
      PLAYERS = Object.values(night.players).map(p => {
        // Try lookup by English name first, fall back to Chinese name
        const enName = p.name_en || p.name;
        const style = PLAYER_STYLES[enName] || PLAYER_STYLES[p.name] || {};
        return {
          id: p.id,
          name: p.name,
          name_zh: p.name_zh || '',
          name_en: p.name_en || p.name,
          persona: p.persona || '',
          model: p.model || '',
          thinking: p.thinking || 'high',
          color: style.color || 0xc0392b,
          accent: style.accent !== undefined ? style.accent : (style.body !== undefined ? style.body : 0xe74c3c),
          body: style.body !== undefined ? style.body : 0x4a0000,
          head: style.head || 0xD4A574, // legacy alias
          hair: style.hair !== undefined ? style.hair : 0x1a1410,
          skin: style.skin !== undefined ? style.skin : 0xe8b890,
          icon: style.icon || '',
        };
      });
      // Rebuild 3D scene with new players
      rebuildScene();
    }
    
    setPhase('night');
    showGameInfo();

    // Update archive list active state to reflect newly loaded game
    document.querySelectorAll('#archive-list .game-item').forEach(el => {
      el.classList.toggle('active', el.dataset.gameId === gameId);
    });
    return true;
  } catch(e) {
    if (requestVersion !== gameLoadVersion) return false;
    console.error('Failed to load game', gameId, e);
    return false;
  }
}

function rebuildScene() {
  // Remove old characters
  chars.forEach(g => scene.remove(g));
  chars = [];
  // Invalidate avatar portrait cache so portraits re-render with new character builds
  for (const k of Object.keys(avatarCache)) delete avatarCache[k];
  // Build new ones
  buildAllCharacters();
  buildNameTags();
}

function buildArchiveList(games) {
  const list = document.getElementById('archive-list');
  list.innerHTML = '';
  const outcomeLabels = {
    werewolf_win: lang === 'zh' ? '狼人勝' : 'Werewolf Win',
    village_win: lang === 'zh' ? '村民勝' : 'Village Win',
    tanner_win: lang === 'zh' ? '皮匠勝' : 'Tanner Win',
    village_win_no_wolf: lang === 'zh' ? '村民勝（無狼）' : 'Village Win (no wolf)',
    no_team_win: lang === 'zh' ? '無隊勝' : 'No Team Win',
  };
  games.forEach((g, index) => {
    const el = document.createElement('div');
    const id = g.game_id || g.id;
    el.className = 'game-item' + (id === currentGame ? ' active' : '');
    el.dataset.gameId = id;
    const rawOutcome = g.outcome || g.summary?.outcome || '?';
    const outcome = outcomeLabels[rawOutcome] || rawOutcome;
    const date = g.date || g.timestamp || '';
    el.innerHTML = `
      <div class="gid">Game ${String(id).replace('game_', '').replace('game-', '')}${index === 0 ? `<span class="latest-badge">${lang === 'zh' ? '最新' : 'LATEST'}</span>` : ''}</div>
      <div class="outcome">${outcome}</div>
      <div class="date">${date}</div>
    `;
    el.addEventListener('click', () => {
      document.getElementById('archive-panel').classList.remove('open');
      loadGame(id);
    });
    list.appendChild(el);
  });
}

// ===== Structured Agent Trace =====
function playerDataByName(name) {
  return Object.values(gameData.night?.players || {}).find(p => p.name === name) || null;
}

function traceMetaFor(name, payload = {}) {
  const player = playerDataByName(name);
  return {
    model: payload.model || player?.model || '',
    thinking: payload.thinking || player?.thinking || 'off',
    reasoning: payload.reasoning_summary || payload.thought || '',
    latencyMs: payload.latency_ms ?? payload.latencyMs ?? null,
    source: payload.source || 'agent',
    fallback: Boolean(payload.fallback || payload.error),
    error: payload.error || '',
  };
}

function buildStructuredTrace() {
  const events = [];
  let sequence = 0;
  const add = (event) => events.push({ id: `event-${++sequence}`, ...event });
  const localizedFile = name => lang === 'zh' ? name.replace('.json', '_zh.json') : name;

  for (const [index, action] of (gameData.night?.night_trace || []).entries()) {
    add({
      phase: 'night', type: 'action', actor: action.actor || '',
      action: action.action || '', target: action.target, targets: action.targets,
      role: action.role || '', sourceFile: localizedFile('night_result.json'),
      sourcePath: `night_trace[${index}]`, ...traceMetaFor(action.actor, action),
    });
  }

  for (const [index, event] of (gameData.day?.day_trace || []).entries()) {
    add({
      phase: 'day', type: event.type || 'event', actor: event.player_name || '',
      target: event.target, text: event.speech || '', timestamp: event.timestamp || '',
      sourceFile: localizedFile('day_result.json'), sourcePath: `day_trace[${index}]`,
      ...traceMetaFor(event.player_name, event),
    });
  }

  const voteTrace = new Map((gameData.vote?.vote_trace || []).map(v => [v.player, v]));
  for (const [actor, target] of Object.entries(gameData.vote?.votes || {})) {
    const detail = voteTrace.get(actor) || {};
    const voteIndex = (gameData.vote?.vote_trace || []).findIndex(v => v.player === actor);
    add({
      phase: 'vote', type: 'vote', actor, target,
      sourceFile: localizedFile('vote_result.json'),
      sourcePath: voteIndex >= 0 ? `vote_trace[${voteIndex}]` : `votes.${actor}`,
      ...traceMetaFor(actor, detail),
    });
  }

  if (gameData.resolve) {
    add({
      phase: 'resolve', type: 'outcome', actor: '',
      text: gameData.resolve.reason || '', outcome: gameData.resolve.outcome,
      executed: gameData.resolve.executed || [], winners: gameData.resolve.winners || [],
      sourceFile: localizedFile('resolve_result.json'), sourcePath: 'resolution',
      source: 'game-engine', fallback: false,
    });
  }

  for (const [category, items] of Object.entries(gameData.postgame?.interviews || {})) {
    for (const [index, item] of (items || []).entries()) {
      add({
        phase: 'postgame', type: 'interview', actor: item.player_name || '',
        text: item.quote || '', category, role: item.role || '',
        sourceFile: localizedFile('postgame_result.json'),
        sourcePath: `interviews.${category}[${index}]`,
        ...traceMetaFor(item.player_name, item),
      });
    }
  }
  return events;
}

function buildAutonomyMetadata() {
  const trace = gameData.structuredTrace || [];
  const manifest = gameData.manifest || {};
  const roster = Object.values(gameData.night?.players || {}).map(p => ({
    name: p.name, model: p.model, thinking: p.thinking || 'off', seat: p.seat,
  }));
  return {
    gameId: currentGame || gameData.night?.game_id || '',
    status: manifest.status || gameData.resolve?.status || 'recorded',
    createdAt: manifest.created_at || '',
    completedAt: manifest.completed_at || gameData.postgame?.generated_at || '',
    outcome: gameData.resolve?.outcome || manifest.outcome || '',
    roster,
    eventCount: trace.length,
    agentEvents: trace.filter(e => e.source === 'agent').length,
    deterministicEvents: trace.filter(e => e.source !== 'agent').length,
    fallbackEvents: trace.filter(e => e.fallback).length,
  };
}


// ===== Center Cards (3D on table) =====
let centerCardMeshes = [];
function buildCenterCards() {
  // Remove old
  centerCardMeshes.forEach(m => scene.remove(m));
  centerCardMeshes = [];
  const cards = (gameData.night?.center_cards) || [];
  if (cards.length === 0) return;

  cards.forEach((role, i) => {
    const angle = (i / cards.length) * TAU - PI / 2;
    const cx = cos(angle) * 0.6;
    const cz = sin(angle) * 0.6;

    // Card base — flat card lying on table
    const cardGeo = new THREE.BoxGeometry(0.35, 0.02, 0.5);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, roughness: 0.4, metalness: 0.3,
    });
    const card = new THREE.Mesh(cardGeo, cardMat);
    card.position.set(cx, 0.25, cz);
    card.rotation.y = angle + PI / 2;
    card.castShadow = true;
    card.receiveShadow = true;
    scene.add(card);
    centerCardMeshes.push(card);

    // Card border (gold trim)
    const borderGeo = new THREE.EdgesGeometry(cardGeo);
    const borderMat = new THREE.LineBasicMaterial({ color: 0xe8c468 });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.position.copy(card.position);
    border.rotation.copy(card.rotation);
    scene.add(border);
    centerCardMeshes.push(border);

    // Role text via CanvasTexture on top face
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128; labelCanvas.height = 256;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#15152a';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#e8c468';
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const roleText = lang === 'zh' ? roleZh(role) : role;
    ctx.fillText(roleText, 64, 100);
    // Decorative border
    ctx.strokeStyle = '#e8c468';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 112, 240);
    // Question mark for mystery
    ctx.font = 'bold 60px serif';
    ctx.fillStyle = '#e8c46844';
    ctx.fillText('?', 64, 170);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelGeo = new THREE.PlaneGeometry(0.35, 0.5);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(cx, 0.27, cz);
    label.rotation.x = -PI / 2;
    label.rotation.z = angle + PI / 2;
    scene.add(label);
    centerCardMeshes.push(label);
  });
}

// ===== Phase Management =====
function setPhase(phase) {
  currentPhase = phase;
  document.getElementById('panel-content').dataset.panelView = 'phase';
  // Update timeline UI
  document.querySelectorAll('.phase-step').forEach(el => {
    el.classList.toggle('active', el.dataset.phase === phase);
  });

  // Cancel any pending night action bubble timeouts
  nightActionTimeouts.forEach(id => clearTimeout(id));
  nightActionTimeouts = [];
  postgameTimeouts.forEach(id => clearTimeout(id));
  postgameTimeouts = [];
  clearBubbles();
  clearVoteArrows();
  hideResultBanner();
  // Clean up confetti
  if (confettiSystem) { scene.remove(confettiSystem.points); confettiSystem.points.geometry.dispose(); confettiSystem.points.material.dispose(); confettiSystem = null; }
  undimAll();
  resetTeamColors();
  // Stop day replay if running and hide controls
  replayPlaying = false;
  if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
  replayControls.classList.remove('visible');
  nightActionBubblesShown = false;

  switch(phase) {
    case 'night':
      buildCenterCards();
      setNight(true);
      showNightInfo();
      showInitialRoles();
      startReplay(buildNightReplaySeq(), lang === 'zh' ? '夜晚' : 'Night');
      break;
    case 'day':
      setNight(false);
      showDayInfo();
      showInitialRoles();
      break;
    case 'vote':
      setNight(false);
      showVoteInfo();
      showInitialRoles();
      break;
    case 'resolve':
      setNight(false);
      showResolveInfo();
      break;
    case 'postgame':
      setNight(false);
      showPostgameInfo();
      break;
  }
}

// Role colors for night phase display
const ROLE_COLORS = {
  Werewolf: 0xe74c3c, Seer: 0x3498db, Robber: 0xe67e22,
  Troublemaker: 0x9b59b6, Villager: 0x2ecc71, Tanner: 0xf1c40f,
  Minion: 0x607d8b, Insomniac: 0x1abc9c,
};
const ROLE_ZH = {
  Werewolf: '狼人', Seer: '預言家', Robber: '強盜',
  Troublemaker: '搗蛋鬼', Villager: '村民', Tanner: '皮匠',
  Minion: '爪牙', Insomniac: '失眠者',
};
function roleZh(name) { return ROLE_ZH[name] || name; }

function showInitialRoles() {
  if (!gameData.night || !gameData.night.players) return;
  PLAYERS.forEach((p, i) => {
    const pd = Object.values(gameData.night.players).find(x => x.name === p.name);
    if (!pd || !tagEls[i]) return;
    const role = pd.initial_role || '';
    const roleSub = tagEls[i].querySelector('.role-sub');
    if (roleSub) {
      const roleColor = ROLE_COLORS[role] || 0x95a5a6;
      roleSub.textContent = lang === 'zh' ? roleZh(role) : role;
      roleSub.style.color = '#' + roleColor.toString(16).padStart(6, '0');
    }
  });
}

// Show night actions as speech bubbles on acting characters
function showNightActionArrows() {
  // Night actions are shown via bubbles, re-show each frame for camera tracking
  // Bubbles are managed by activeBubblesData with special marker
}

let nightActionBubblesShown = false;
let nightActionTimeouts = [];
let postgameTimeouts = [];
function showNightActionBubbles() {
  // Handled by startReplay('night') in setPhase; this is a no-op for backward compat
  nightActionBubblesShown = true;
}

function buildNightReplaySeq() {
  if (!gameData.night || !gameData.night.night_trace) return [];
  const actionLabels = lang === 'zh' ? {
    inspect_center: '查驗中央卡牌',
    inspect_player: '查驗',
    rob: '搶奪了',
    swap: '交換了',
    peek_wolf: '偷看狼人',
    none: '無行動',
  } : {
    inspect_center: 'Inspected center cards',
    inspect_player: 'Inspected',
    rob: 'Robbed',
    swap: 'Swapped',
    peek_wolf: 'Peeked for wolves',
    none: 'No action',
  };
  const seq = [];
  for (const tr of gameData.night.night_trace) {
    const actor = tr.actor || tr.player;
    if (!actor) continue;
    let actionText = actionLabels[tr.action] || tr.action || '?';
    if (tr.target) {
      if (tr.action === 'inspect_center') {
        actionText += ' #' + tr.target;
      } else {
        const tp = PLAYERS.find(x => x.name === tr.target);
        const targetName = lang === 'zh' && tp ? (tp.name_zh || tr.target) : tr.target;
        actionText += ' ' + targetName;
      }
    }
    if (tr.targets && Array.isArray(tr.targets)) {
      if (tr.action === 'inspect_center') {
        actionText += ' #' + tr.targets.join(', #');
      } else {
        const names = tr.targets.map(tName => {
          const tp = PLAYERS.find(x => x.name === tName);
          return lang === 'zh' && tp ? (tp.name_zh || tName) : tName;
        });
        actionText += ' ' + names.join(' \u2194 ');
      }
    }
    seq.push({ speaker: actor, text: actionText });
  }
  return seq;
}

function showNightInfo() {
  if (!gameData.night) return;
  const players = gameData.night.players || {};
  const trace = gameData.night.night_trace || [];
  
  let html = '<div class="panel-section"><h3>' + t('nightPhase') + '</h3>';
  html += '<div class="row"><span class="key">' + t('centerCards') + '</span><span class="val">' + (gameData.night.center_cards || []).join(', ') + '</span></div>';
  
  html += '<h3 style="margin-top:16px;">' + t('roles') + '</h3>';
  for (const [, p] of Object.entries(players)) {
    const accent = getPlayerColor(p.name);
    const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
    html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${lang === 'zh' ? roleZh(p.initial_role) : p.initial_role}</span></div>`;
  }
  
  if (trace.length > 0) {
    const actionLabels = lang === 'zh' ? {
      inspect_center: '查驗中間牌',
      inspect_player: '查驗玩家',
      rob: '搶奪',
      swap: '交換',
      peek_wolf: '偷看狼人',
      none: '無行動',
    } : {
      inspect_center: 'Inspects Center',
      inspect_player: 'Inspects Player',
      rob: 'Robs',
      swap: 'Swaps',
      peek_wolf: 'Peeks at Wolf',
      none: 'No Action',
    };
    html += '<h3 style="margin-top:16px;">' + t('nightActions') + '</h3>';
    for (const tr of trace) {
      const trP = PLAYERS.find(x => x.name === (tr.actor || tr.player || ''));
      const trName = trP ? (lang === 'zh' ? (trP.name_zh || trP.name) : trP.name) : (tr.actor || tr.player || tr.role || '?');
      const trAction = actionLabels[tr.action] || tr.action || '?';
      const trTarget = tr.target ? (() => {
        const tp = PLAYERS.find(x => x.name === tr.target);
        return lang === 'zh' && tp ? (tp.name_zh || tr.target) : tr.target;
      })() : '';
      html += `<div class="row"><span class="key" style="color:${trP ? getPlayerColor(trP.name) : '#888'}">${trName}</span><span class="val">${trAction}${trTarget ? ' → ' + trTarget : ''}</span></div>`;
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel(true);
}

function showDayInfo() {
  if (!gameData.day) return;
  const stats = gameData.day.player_stats || {};
  const trace = gameData.day.day_trace || [];
  const speeches = trace.filter(tr => tr.type === 'speech');
  
  let html = '<div class="panel-section"><h3>' + t('dayDiscussion') + '</h3>';
  html += `<div class="row"><span class="key">${t('duration')}</span><span class="val">${(gameData.day.config?.duration_seconds || 0)}s</span></div>`;
  html += `<div class="row"><span class="key">${t('totalSpeeches')}</span><span class="val">${speeches.length}</span></div>`;
  
  html += '<h3 style="margin-top:16px;">' + t('playerStats') + '</h3>';
  for (const [name, s] of Object.entries(stats)) {
    const accent = getPlayerColor(name);
    const p = PLAYERS.find(x => x.name === name);
    const displayName = lang === 'zh' && p ? (p.name_zh || name) : name;
    html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${s.speak_count} / ${gameData.day.config?.max_speaks_per_player || 3}</span></div>`;
  }
  
  if (speeches.length > 0) {
    html += '<h3 style="margin-top:16px;">' + t('discussionLog') + '</h3>';
    for (const s of speeches) {
      const accent = getPlayerColor(s.player_name);
      const p = PLAYERS.find(x => x.name === s.player_name);
      const displayName = lang === 'zh' && p ? (p.name_zh || s.player_name) : s.player_name;
      html += `<div class="speech-entry active-replay-target" style="border-left-color:${accent}">`;
      html += `<div class="speaker" style="color:${accent}">${displayName}${s.target ? ' @' + displayPlayerName(s.target) : ''}</div>`;
      html += `<div class="text">${formatGameText(s.speech || '')}</div>`;
      if (s.timestamp) html += `<div class="time">${s.timestamp}</div>`;
      html += '</div>';
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel(true);

  // Start replay of speeches
  startSpeechReplay(speeches);
}

function showVoteInfo() {
  if (!gameData.vote) return;
  const votes = gameData.vote.votes || {};
  const tally = gameData.vote.tally || {};
  const executed = gameData.vote.executed || [];
  
  let html = '<div class="panel-section"><h3>' + t('voting') + '</h3>';
  html += '<h3 style="margin-top:12px;">' + t('votes') + '</h3>';
  for (const [voter, target] of Object.entries(votes)) {
    const voterColor = getPlayerColor(voter);
    const targetColor = getPlayerColor(target);
    const vp = PLAYERS.find(x => x.name === voter);
    const tp = PLAYERS.find(x => x.name === target);
    const voterName = lang === 'zh' && vp ? (vp.name_zh || voter) : voter;
    const targetName = lang === 'zh' && tp ? (tp.name_zh || target) : target;
    html += `<div class="row"><span class="key" style="color:${voterColor}">${voterName}</span><span class="val" style="color:${targetColor}">→ ${targetName}</span></div>`;
  }
  
  html += '<h3 style="margin-top:12px;">' + t('tally') + '</h3>';
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    const accent = getPlayerColor(name);
    const p = PLAYERS.find(x => x.name === name);
    const displayName = lang === 'zh' && p ? (p.name_zh || name) : name;
    const isExecuted = executed.includes(name);
    html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${count} ${t('vote')}${count !== 1 ? 's' : ''}${isExecuted ? ' *' : ''}</span></div>`;
  }
  
  if (executed.length > 0) {
    const execNames = executed.map(n => {
      const p = PLAYERS.find(x => x.name === n);
      return lang === 'zh' && p ? (p.name_zh || n) : n;
    });
    html += `<div class="row" style="margin-top:12px;"><span class="key">${t('executed')}</span><span class="val" style="color:var(--danger)">${execNames.join(', ')}</span></div>`;
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel(true);

  // Show vote arrows
  showVoteArrows(votes);
  
  // Dim executed players
  executed.forEach(name => {
    const idx = PLAYERS.findIndex(p => p.name === name);
    if (idx >= 0) dimCharacter(idx);
  });
}

function showResolveInfo() {
  if (!gameData.resolve) return;
  const r = gameData.resolve;
  
  let html = '<div class="panel-section"><h3>' + t('resolution') + '</h3>';
  const outcomeLabels = {
    werewolf_win: lang === 'zh' ? '狼人勝' : 'Werewolf Win',
    village_win: lang === 'zh' ? '村民勝' : 'Village Win',
    tanner_win: lang === 'zh' ? '皮匠勝' : 'Tanner Win',
    village_win_no_wolf: lang === 'zh' ? '村民勝（無狼）' : 'Village Win (no wolf)',
    no_team_win: lang === 'zh' ? '無隊勝' : 'No Team Win',
  };
  const teamLabels = {
    village_team: lang === 'zh' ? '村民陣營' : 'Village',
    werewolf_team: lang === 'zh' ? '狼人陣營' : 'Werewolf',
    tanner: lang === 'zh' ? '皮匠' : 'Tanner',
  };
  html += `<div class="row"><span class="key">${t('outcome')}</span><span class="val">${outcomeLabels[r.outcome] || r.outcome || '?'}</span></div>`;
  html += `<div class="row"><span class="key">${t('reason')}</span><span class="val">${r.reason || '?'}</span></div>`;
  
  if (r.winners && r.winners.length > 0) {
    const winNames = r.winners.map(n => {
      const p = PLAYERS.find(x => x.name === n);
      return lang === 'zh' && p ? (p.name_zh || n) : n;
    });
    html += `<div class="row"><span class="key">${t('winners')}</span><span class="val" style="color:var(--success)">${winNames.join(', ')}</span></div>`;
  } else {
    html += `<div class="row"><span class="key">${t('winners')}</span><span class="val" style="color:var(--text-dim)">${lang === 'zh' ? '無' : 'None'}</span></div>`;
  }
  if (r.executed) {
    const execNames = r.executed.map(n => {
      const p = PLAYERS.find(x => x.name === n);
      return lang === 'zh' && p ? (p.name_zh || n) : n;
    });
    html += `<div class="row"><span class="key">${t('executed')}</span><span class="val" style="color:var(--danger)">${execNames.join(', ')}</span></div>`;
  }
  
  if (r.final_roles) {
    html += '<h3 style="margin-top:16px;">' + t('finalRoles') + '</h3>';
    for (const [name, role] of Object.entries(r.final_roles)) {
      const accent = getPlayerColor(name);
      const p = PLAYERS.find(x => x.name === name);
      const displayName = lang === 'zh' && p ? (p.name_zh || name) : name;
      const teamLabel = teamLabels[role.team] || role.team || '';
      html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${lang === 'zh' ? roleZh(role.current_role) : role.current_role} (${teamLabel})</span></div>`;
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel(true);

  // Show result banner
  showResultBanner(r.outcome, r.reason, r.winners);

  // Dim executed
  if (r.executed) {
    r.executed.forEach(name => {
      const idx = PLAYERS.findIndex(p => p.name === name);
      if (idx >= 0) dimCharacter(idx);
    });
  }
  
  // Show team colors on base + role in name tags
  showTeamColors(r.final_roles);
  
  // Trigger team animations: winners celebrate, losers sulk
  triggerTeamAnimations(r);
}

function triggerTeamAnimations(resolveData) {
  teamAnims = [];
  if (resolveData.winners && resolveData.winners.length > 0) {
    spawnConfetti(resolveData.winners);
  }
  const finalRoles = resolveData.final_roles || {};
  const winners = resolveData.winners || [];
  const executed = resolveData.executed || [];
  
  PLAYERS.forEach((p, i) => {
    if (executed.includes(p.name)) return; // dead players don't animate
    const isWinner = winners.includes(p.name);
    teamAnims.push({
      index: i,
      type: isWinner ? 'celebrate' : 'defeat',
      startTime: performance.now(),
      offset: i * 0.15 // stagger
    });
  });
}

function updateTeamAnims(t) {
  teamAnims.forEach(a => {
    if (!chars[a.index]) return;
    const elapsed = (t - a.startTime) / 1000 - a.offset;
    if (elapsed < 0) return;
    const g = chars[a.index];
    
    if (a.type === 'celebrate') {
      // Bounce up with joy
      g.position.y = SH + Math.abs(Math.sin(elapsed * 3)) * 0.25;
      g.rotation.y = g.userData._baseRotY + Math.sin(elapsed * 2) * 0.3;
      // Arms up — can't easily do this with current model, so just bounce
    } else {
      // Sulk — lean forward, head down
      g.position.y = SH - Math.min(elapsed * 0.15, 0.1);
      g.rotation.x = Math.min(elapsed * 0.3, 0.15);
    }
  });
}

function showPostgameInfo() {
  if (!gameData.postgame) return;
  const interviews = gameData.postgame.interviews || {};
  
  // Keep team colors from resolve
  if (gameData.resolve && gameData.resolve.final_roles) {
    showTeamColors(gameData.resolve.final_roles);
  }
  
  let html = '<div class="panel-section"><h3>' + t('postgame') + '</h3>';
  for (const [cat, items] of Object.entries(interviews)) {
    if (!items || items.length === 0) continue;
    const catLabels = { dead: t('deadExec'), winners: t('winLabel'), losers: t('loseLabel') };
    const catLabel = catLabels[cat] || cat;
    html += `<h3 style="margin-top:12px;">${catLabel}</h3>`;
    for (const i of items) {
      const p = PLAYERS.find(x => x.name === i.player_name);
      const accent = p ? getPlayerColor(p.name) : '#888';
      const displayName = p ? (lang === 'zh' ? (p.name_zh || p.name) : p.name) : i.player_name;
      const role = p ? '' : (i.role || '');
      html += `<div class="speech-entry active-replay-target" style="border-left-color:${accent}">`;
      html += `<div class="speaker" style="color:${accent}">${displayName}${role ? ' (' + role + ')' : ''}</div>`;
      html += `<div class="text">${formatGameText(i.quote || '')}</div>`;
      html += '</div>';
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel(true);

  // Cancel any leftover postgame bubbles from previous phase visit
  postgameTimeouts.forEach(id => clearTimeout(id));
  postgameTimeouts = [];

  // Build postgame replay sequence; actual playback handled by unified replay bar
  const all = [...(interviews.dead || []), ...(interviews.winners || []), ...(interviews.losers || [])];
  const seq = all.filter(i => i.quote).map(i => ({ speaker: i.player_name, text: i.quote }));
  startReplay(seq, lang === 'zh' ? '賽後' : 'Postgame');
}

function showGameInfo() {
  // Called after game loads — show info matching current phase
  const phase = currentPhase || 'day';
  if (phase === 'night') showNightInfo();
  else if (phase === 'day') showDayInfo();
  else if (phase === 'vote') showVoteInfo();
  else if (phase === 'resolve') showResolveInfo();
  else if (phase === 'postgame') showPostgameInfo();
}

function showAboutPanel() {
  // Called from Info button — show project description
  const isZh = lang === 'zh';
  let html = '<div class="panel-section">';
  html += '<h3>' + (isZh ? '關於' : 'About') + '</h3>';
  html += '<p style="font-size:13px;line-height:1.7;color:var(--text);">' + (isZh ? '6 個 AI 代理使用不同的 LLM，自主進行一夜終極狼人殺。每個決策——夜晚行動、白天辯論、投票——都由 AI 玩家在執行時自主做出，並非腳本演示。' : '6 AI agents running different LLMs play One Night Ultimate Werewolf autonomously. Every decision — night actions, daytime debate, voting — is made by the AI players themselves at runtime. Not scripted.') + '</p>';
  html += '<p style="font-size:12px;color:var(--text-dim);margin-top:12px;"><a href="https://github.com/ShawTim/endless-werewolf" target="_blank" style="color:var(--gold);">GitHub</a></p>';
  html += '</div>';
  const panelContent = document.getElementById('panel-content');
  panelContent.dataset.panelView = 'about';
  panelContent.innerHTML = html;
  openSidePanel();
  document.getElementById('side-panel').scrollTop = 0;
}

// ===== Complete Recorded Replay + Autonomy Proof =====
let storySteps = [];
let storyIndex = 0;
let storyPlaying = false;
let storyTimer = null;
let storySpeed = 1.5;
const STORY_PHASES = ['night', 'day', 'vote', 'resolve', 'postgame'];

function displayPlayerName(name) {
  const p = PLAYERS.find(x => x.name === name);
  return lang === 'zh' && p ? (p.name_zh || name) : name;
}

function storyActionText(event) {
  const actor = displayPlayerName(event.actor);
  const target = event.target !== undefined && event.target !== null
    ? (typeof event.target === 'string' ? displayPlayerName(event.target) : `${lang === 'zh' ? '中央牌' : 'center card'} ${event.target}`)
    : '';
  const targets = (event.targets || []).map(x => typeof x === 'string' ? displayPlayerName(x) : x).join(', ');
  const labels = {
    inspect_center: lang === 'zh' ? '查看了中央牌' : 'inspected the center',
    inspect_player: lang === 'zh' ? '查驗了' : 'inspected',
    rob: lang === 'zh' ? '偷換了' : 'robbed',
    swap: lang === 'zh' ? '交換了' : 'swapped',
    identify_wolves: lang === 'zh' ? '認出了狼人' : 'identified the werewolf',
    peek_wolves: lang === 'zh' ? '看見了狼人同伴' : 'saw the other werewolf',
    inspect_self: lang === 'zh' ? '查看了自己的牌' : 'checked their final card',
  };
  const label = labels[event.action] || event.action;
  return `${actor} ${label}${targets ? `: ${targets}` : target ? ` ${target}` : ''}.`;
}

function cleanStorySpeech(text) {
  return String(text || '')
    .replace(/^\[[^\]]+\]\s+[^:：]+[:：]\s*/u, '')
    .trim();
}

function storyStepDelay(step) {
  const text = step?.body || '';
  const cjkCount = (text.match(/[\u3400-\u9fff]/gu) || []).length;
  const wordCount = (text.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length;
  const readingMs = cjkCount * 85 + wordCount * 115;
  return THREE.MathUtils.clamp(3500 + readingMs, 4500, 14000) / storySpeed;
}

function storyPhaseLabel(phase) {
  const labels = lang === 'zh'
    ? { night: '夜晚', day: '白天討論', vote: '投票', resolve: '結算', postgame: '賽後' }
    : { night: 'Night', day: 'Day discussion', vote: 'Voting', resolve: 'Resolution', postgame: 'Postgame' };
  return labels[phase] || phase;
}

function recordedEventTitle(event) {
  const actor = displayPlayerName(event.actor);
  if (event.phase === 'night') {
    return lang === 'zh' ? `${actor} 的夜晚行動` : `Night action · ${actor}`;
  }
  if (event.phase === 'day') {
    if (event.type === 'speech') return lang === 'zh' ? `${actor} 發言` : `Discussion · ${actor}`;
    if (event.type === 'pass') return lang === 'zh' ? `${actor} 選擇不發言` : `Discussion · ${actor} passes`;
    return lang === 'zh' ? `${actor || '代理'} 的記錄事件` : `Recorded event · ${actor || 'agent'}`;
  }
  if (event.phase === 'vote') return lang === 'zh' ? `${actor} 投票` : `Vote · ${actor}`;
  if (event.phase === 'resolve') return lang === 'zh' ? '規則引擎結算' : 'Game-engine resolution';
  if (event.phase === 'postgame') return lang === 'zh' ? `${actor} 的賽後訪問` : `Postgame interview · ${actor}`;
  return storyPhaseLabel(event.phase);
}

function recordedEventBody(event) {
  const actor = displayPlayerName(event.actor);
  const target = displayPlayerName(event.target);
  if (event.phase === 'night') return storyActionText(event);
  if (event.phase === 'day') {
    if (event.type === 'speech') return cleanStorySpeech(event.text);
    if (event.type === 'pass') {
      return lang === 'zh' ? `${actor} 在這一輪選擇不發言。` : `${actor} passed without speaking in this turn.`;
    }
    return event.text || event.error || (lang === 'zh' ? '此事件已記錄於原始遊戲輸出。' : 'This event is recorded in the original game output.');
  }
  if (event.phase === 'vote') {
    return lang === 'zh' ? `${actor} 投票給 ${target}。` : `${actor} voted for ${target}.`;
  }
  if (event.phase === 'resolve') {
    const winners = (event.winners || []).map(displayPlayerName).join(', ');
    const executed = (event.executed || []).map(displayPlayerName).join(', ');
    const details = [];
    if (event.text) details.push(event.text);
    if (executed) details.push(`${lang === 'zh' ? '被處決' : 'Executed'}: ${executed}.`);
    if (winners) details.push(`${lang === 'zh' ? '勝出者' : 'Winners'}: ${winners}.`);
    return details.join(' ');
  }
  if (event.phase === 'postgame') return event.text || '';
  return event.text || event.error || event.type || '';
}

function buildRecordedReplay() {
  const roles = Object.entries(gameData.resolve?.final_roles || {}).map(([name, r]) => ({
    name, initial: r.initial_role, current: r.current_role,
  }));
  return (gameData.structuredTrace || []).map(event => ({
    ...event,
    title: recordedEventTitle(event),
    body: recordedEventBody(event),
    roleChanges: event.phase === 'resolve' ? roles : [],
  }));
}

function storyKicker(step) {
  const labels = lang === 'zh'
    ? {
        night: 'AI 夜晚決策',
        day: 'AI 桌上對話',
        vote: 'AI 投票決策',
        resolve: '規則引擎',
        postgame: 'AI 賽後訪問',
      }
    : {
        night: 'AI NIGHT DECISION',
        day: 'AI TABLE TALK',
        vote: 'AI VOTE',
        resolve: 'RULE ENGINE',
        postgame: 'AI POSTGAME',
      };
  return labels[step.phase] || (lang === 'zh' ? '已記錄事件' : 'RECORDED EVENT');
}

function buildStoryPhaseNav() {
  const nav = document.getElementById('story-phase-nav');
  nav.innerHTML = '';
  for (const phase of STORY_PHASES) {
    const count = storySteps.filter(step => step.phase === phase).length;
    if (!count) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.phase = phase;
    button.innerHTML = `${storyPhaseLabel(phase)} <span class="count">${count}</span>`;
    button.addEventListener('click', () => {
      const nextIndex = storySteps.findIndex(step => step.phase === phase);
      if (nextIndex < 0) return;
      stopStoryPlayback();
      storyIndex = nextIndex;
      renderStoryStep();
    });
    nav.appendChild(button);
  }
}

function renderStoryAvatar(step) {
  const box = document.getElementById('story-avatar');
  const image = document.getElementById('story-avatar-img');
  const icon = document.getElementById('story-avatar-icon');
  const player = PLAYERS.find(p => p.name === step.actor);
  box.classList.toggle('has-image', Boolean(player));
  if (player) {
    image.src = renderAvatarPortrait(player, 128);
    image.alt = displayPlayerName(player.name);
  } else {
    image.removeAttribute('src');
    image.alt = '';
    icon.textContent = step.phase === 'resolve' ? '⚙' : '◆';
  }
}

function renderStoryStep() {
  if (!storySteps.length) return;
  const step = storySteps[storyIndex];
  setPhase(step.phase);
  closeSidePanel();
  clearBubbles();
  replayControls.classList.remove('visible');
  document.getElementById('story-phase-badge').textContent = storyPhaseLabel(step.phase);
  document.getElementById('story-game-id').textContent =
    `${lang === 'zh' ? '遊戲' : 'GAME'} ${String(currentGame || '').replace('game_', '').replace('game-', '')}`;
  document.getElementById('story-kicker').textContent = storyKicker(step);
  document.getElementById('story-title').textContent = step.title || '';
  const body = document.getElementById('story-body');
  body.innerHTML = formatGameText(step.body || '');
  body.scrollTop = 0;
  renderStoryAvatar(step);
  const actor = step.actor ? displayPlayerName(step.actor) : (lang === 'zh' ? '遊戲規則引擎' : 'Game rules engine');
  const model = (step.model || '').split('/').pop();
  document.getElementById('story-agent-sub').textContent =
    [actor, model].filter(Boolean).join(' · ');
  const phaseSteps = storySteps.filter(s => s.phase === step.phase);
  const phaseIndex = phaseSteps.findIndex(s => s.id === step.id) + 1;
  document.getElementById('story-progress').textContent = lang === 'zh'
    ? `${storyPhaseLabel(step.phase)} ${phaseIndex}/${phaseSteps.length} · 第 ${storyIndex + 1}/${storySteps.length} 個已記錄事件`
    : `${storyPhaseLabel(step.phase)} ${phaseIndex}/${phaseSteps.length} · recorded event ${storyIndex + 1}/${storySteps.length}`;
  document.getElementById('story-progress-fill').style.width =
    `${((storyIndex + 1) / storySteps.length) * 100}%`;
  document.querySelectorAll('#story-phase-nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.phase === step.phase);
  });
  const rationale = document.getElementById('story-rationale');
  rationale.innerHTML = step.reasoning
    ? `<span class="label">${lang === 'zh' ? '記錄理由' : 'RECORDED RATIONALE'}</span>${formatGameText(step.reasoning)}`
    : '';
  rationale.classList.toggle('visible', Boolean(step.reasoning));
  const meta = [];
  if (step.thinking) meta.push(`thinking=${step.thinking}`);
  if (step.latencyMs !== null && step.latencyMs !== undefined) meta.push(`${step.latencyMs}ms`);
  meta.push(step.fallback
    ? (lang === 'zh' ? '回退／錯誤' : 'fallback/error')
    : step.source === 'game-engine'
      ? (lang === 'zh' ? '規則引擎' : 'rules engine')
      : (lang === 'zh' ? '已記錄的代理輸出' : 'recorded agent output'));
  const sourceHref = step.sourceFile ? `./data/games/${currentGame}/${step.sourceFile}` : '';
  document.getElementById('story-meta').innerHTML = `
    <span class="${step.fallback ? 'fallback' : ''}">${meta.join(' · ')}</span>
    ${sourceHref ? `<a href="${sourceHref}" target="_blank">${lang === 'zh' ? '查看原始記錄 ↗' : 'Raw record ↗'}</a>` : ''}
  `;
  const roleBox = document.getElementById('story-role-changes');
  roleBox.innerHTML = '';
  for (const r of step.roleChanges || []) {
    const changed = r.initial !== r.current;
    roleBox.innerHTML += `<div class="role-change${changed ? ' changed' : ''}">
      <span class="agent">${displayPlayerName(r.name)}</span>
      <span class="roles">${lang === 'zh' ? roleZh(r.initial) : r.initial}<span class="arrow">→</span>${lang === 'zh' ? roleZh(r.current) : r.current}</span>
    </div>`;
  }
  chars.forEach((_, i) => highlightCharacter(i, false));
  if (step.actor) {
    const idx = PLAYERS.findIndex(p => p.name === step.actor);
    if (idx >= 0) highlightCharacter(idx, true);
  }
}

function openStoryMode(autoPlay = false, startIndex = 0) {
  storySteps = buildRecordedReplay();
  if (!storySteps.length) return;
  storyIndex = THREE.MathUtils.clamp(startIndex, 0, storySteps.length - 1);
  storyPlaying = false;
  storySpeed = 1.5;
  document.getElementById('story-play').textContent = '▶';
  document.getElementById('story-speed').textContent = '1.5×';
  buildStoryPhaseNav();
  document.getElementById('story-mode').classList.add('visible');
  renderStoryStep();
  if (autoPlay) {
    storyPlaying = true;
    document.getElementById('story-play').textContent = '⏸';
    scheduleStoryStep();
  }
}

function stopStoryPlayback() {
  storyPlaying = false;
  document.getElementById('story-play').textContent = '▶';
  if (storyTimer) clearTimeout(storyTimer);
  storyTimer = null;
}

function closeStoryMode() {
  stopStoryPlayback();
  document.getElementById('story-mode').classList.remove('visible');
  chars.forEach((_, i) => highlightCharacter(i, false));
}

function scheduleStoryStep() {
  if (!storyPlaying) return;
  if (storyIndex >= storySteps.length - 1) {
    stopStoryPlayback();
    return;
  }
  storyTimer = setTimeout(() => {
    storyIndex += 1;
    renderStoryStep();
    scheduleStoryStep();
  }, storyStepDelay(storySteps[storyIndex]));
}

function showProofPanel() {
  closeStoryMode();
  document.getElementById('archive-panel').classList.remove('open');
  const meta = gameData.autonomy || buildAutonomyMetadata();
  const formatRecordedAt = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en-US');
  };
  let html = `<div class="panel-section"><h3>${lang === 'zh' ? '自主運行證據' : 'Autonomy Proof'}</h3>
    <div class="proof-badge">● ${lang === 'zh' ? '已記錄的自主遊戲' : 'Recorded autonomous run'}</div>
    <div class="row"><span class="key">Game ID</span><span class="val">${meta.gameId || '?'}</span></div>
    <div class="row"><span class="key">${lang === 'zh' ? '狀態' : 'Status'}</span><span class="val">${meta.status}</span></div>
    <div class="row"><span class="key">${lang === 'zh' ? '事件' : 'Trace events'}</span><span class="val">${meta.eventCount}</span></div>
    <div class="row"><span class="key">${lang === 'zh' ? '代理事件' : 'Agent events'}</span><span class="val">${meta.agentEvents}</span></div>
    <div class="row"><span class="key">${lang === 'zh' ? '回退／錯誤' : 'Fallbacks/errors'}</span><span class="val">${meta.fallbackEvents}</span></div>
    ${meta.createdAt ? `<div class="row"><span class="key">${lang === 'zh' ? '開始記錄' : 'Started'}</span><span class="val">${formatRecordedAt(meta.createdAt)}</span></div>` : ''}
    ${meta.completedAt ? `<div class="row"><span class="key">${lang === 'zh' ? '完成記錄' : 'Completed'}</span><span class="val">${formatRecordedAt(meta.completedAt)}</span></div>` : ''}
  </div>`;
  html += `<div class="panel-section"><h3>${lang === 'zh' ? '模型陣容' : 'Model Roster'}</h3>`;
  for (const agent of meta.roster || []) {
    html += `<div class="agent-trace-card"><strong>${displayPlayerName(agent.name)}</strong>
      <div class="meta">${agent.model} · thinking=${agent.thinking} · seat ${Number(agent.seat) + 1}</div></div>`;
  }
  html += '</div>';
  const base = `./data/games/${currentGame}/`;
  const localizedRecord = name => `${name}${lang === 'zh' ? '_zh' : ''}.json`;
  html += `<div class="panel-section"><h3>${lang === 'zh' ? '原始記錄' : 'Raw Records'}</h3>
    <p style="font-size:11px;line-height:1.6;color:var(--text-dim);">${lang === 'zh'
      ? '以下檔案是目前中文重播所使用的遊戲輸出。'
      : 'These are the original game outputs used to construct this replay.'}</p>
    <div class="raw-data-links">
      <a href="${base}manifest.json" target="_blank">manifest</a>
      <a href="${base}${localizedRecord('night_result')}" target="_blank">night</a>
      <a href="${base}${localizedRecord('day_result')}" target="_blank">day</a>
      <a href="${base}${localizedRecord('vote_result')}" target="_blank">vote</a>
      <a href="${base}${localizedRecord('resolve_result')}" target="_blank">resolve</a>
      <a href="${base}${localizedRecord('postgame_result')}" target="_blank">postgame</a>
    </div></div>`;
  const panel = document.getElementById('panel-content');
  panel.dataset.panelView = 'proof';
  panel.innerHTML = html;
  openSidePanel();
  document.getElementById('side-panel').scrollTop = 0;
}

// ===== Shared player data helpers (used by modal + gallery) =====
function gatherPlayerGameData(p) {
  let initialRole = '?', currentRole = '?', nightMem = '', nightActions = [];
  if (gameData.night && gameData.night.players) {
    for (const [, pd] of Object.entries(gameData.night.players)) {
      if (pd.name === p.name) {
        initialRole = lang === 'zh' ? roleZh(pd.initial_role || '?') : (pd.initial_role || '?');
        currentRole = lang === 'zh' ? roleZh(pd.current_role || '?') : (pd.current_role || '?');
        nightMem = pd.night_memory_text || (Array.isArray(pd.night_memory) ? pd.night_memory.join(' ') : pd.night_memory || '');
        nightActions = pd.night_actions || [];
        break;
      }
    }
  }
  const speeches = (gameData.day?.day_trace || []).filter(tr => tr.type === 'speech' && tr.player_name === p.name);
  const votedFor = gameData.vote?.votes?.[p.name] || '';
  let postgameQuote = null, postgameRole = '';
  if (gameData.postgame?.interviews) {
    for (const [, items] of Object.entries(gameData.postgame.interviews)) {
      const item = items.find(i => i.player_name === p.name);
      if (item) { postgameQuote = item.quote || ''; postgameRole = item.role || ''; break; }
    }
  }
  const trace = (gameData.structuredTrace || []).filter(e => e.actor === p.name);
  const voteEvent = trace.find(e => e.phase === 'vote');
  return { initialRole, currentRole, nightMem, nightActions, speeches, votedFor, postgameQuote, postgameRole, trace, voteEvent };
}

function buildGameSectionHTML(p, accent, displayName) {
  const d = gatherPlayerGameData(p);
  let html = `<div class="modal-section"><h3>${t('agentState')}</h3>
    <div class="row"><span class="key">Model</span><span class="val">${p.model || '?'}</span></div>
    <div class="row"><span class="key">${t('thinking')}</span><span class="val">${p.thinking || 'off'}</span></div>
    <div class="row"><span class="key">${lang === 'zh' ? '記錄事件' : 'Recorded events'}</span><span class="val">${d.trace.length}</span></div>
    ${d.voteEvent?.fallback ? `<div class="row"><span class="key">${lang === 'zh' ? '投票狀態' : 'Vote status'}</span><span class="val" style="color:var(--danger)">${lang === 'zh' ? '回退決策' : 'Fallback decision'}</span></div>` : ''}
  </div>`;
  html += `<div class="modal-section"><h3>${t('gameData')}</h3>
    <div class="row"><span class="key">${t('initialRole')}</span><span class="val">${d.initialRole}</span></div>
    <div class="row"><span class="key">${t('currentRole')}</span><span class="val">${d.currentRole}</span></div>`;
  if (d.nightMem) html += `<div class="row" style="display:block;"><span class="key">${t('nightMemory')}</span><span style="font-size:12px;color:var(--text);margin-top:4px;display:block;">${formatGameText(d.nightMem)}</span></div>`;
  if (d.votedFor) {
    const tp = PLAYERS.find(x => x.name === d.votedFor);
    const targetName = lang === 'zh' && tp ? (tp.name_zh || d.votedFor) : d.votedFor;
    html += `<div class="row"><span class="key">${t('vote')}</span><span class="val" style="color:${getPlayerColor(d.votedFor)}">→ ${targetName}</span></div>`;
  }
  html += '</div>';
  if (d.trace.length > 0) {
    html += `<div class="modal-section"><h3>${t('decisionTrace')}</h3>`;
    d.trace.forEach(e => {
      const summary = e.text || (e.action ? storyActionText(e) : e.target ? `→ ${displayPlayerName(e.target)}` : e.type);
      const latency = e.latencyMs !== null ? ` · ${e.latencyMs}ms` : '';
      const source = e.fallback ? (lang === 'zh' ? '回退' : 'fallback') : e.source;
      html += `<div class="agent-trace-card">
        <div class="meta">${e.phase} · ${source}${latency}</div>
        <div class="reason">${formatGameText(summary || '')}</div>
        ${e.reasoning ? `<div class="meta" style="margin-top:5px;">${lang === 'zh' ? '理由' : 'Rationale'}: ${formatGameText(e.reasoning)}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  }
  if (d.speeches.length > 0) {
    html += `<div class="modal-section"><h3>${t('speeches')} (${d.speeches.length})</h3>`;
    d.speeches.forEach(s => {
      html += `<div class="speech-entry" style="border-left-color:${accent}">`;
      if (s.target) html += `<div class="speaker" style="color:${accent}">${displayName} @${displayPlayerName(s.target)}</div>`;
      else html += `<div class="speaker" style="color:${accent}">${displayName}</div>`;
      html += `<div class="text">${formatGameText(s.speech||'')}</div>`;
      if (s.timestamp) html += `<div class="time">${s.timestamp}</div>`;
      html += '</div>';
    });
    html += '</div>';
  }
  if (d.postgameQuote) {
    html += `<div class="modal-section"><h3>${t('postgameLabel')}</h3>`;
    html += `<div class="speech-entry" style="border-left-color:${accent}"><div class="speaker" style="color:${accent}">${displayName} (${d.postgameRole})</div><div class="text">${formatGameText(d.postgameQuote)}</div></div>`;
    html += '</div>';
  }
  return html;
}

function showPlayerModal(playerId) {
  const p = PLAYERS.find(x => String(x.id) === String(playerId));
  if (!p) return;
  const accent = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
  const avatarUrl = renderAvatarPortrait(p, 256);
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;

  let html = `<div class="modal-header" style="border-bottom:1px solid var(--border);padding-bottom:16px;display:flex;gap:16px;align-items:center;">
    <div class="modal-avatar" style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:3px solid ${accent};flex-shrink:0;"><img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" /></div>
    <div>
      <div style="font-size:18px;font-weight:700;color:${accent};">${displayName}</div>
      <div style="font-size:11px;color:#666;margin-top:4px;">${(p.model||'').split('/').pop()}</div>
    </div>
  </div>`;

  html += `<div class="modal-section"><h3>${t('persona')}</h3><p style="font-size:13px;line-height:1.7;color:var(--text);">${formatGameText(p.persona||'')}</p></div>`;
  html += buildGameSectionHTML(p, accent, displayName);

  const modal = document.getElementById('player-modal');
  const modalContent = document.getElementById('player-modal-content');
  modalContent.innerHTML = html;
  modal.classList.add('visible');
}

function closePlayerModal() {
  document.getElementById('player-modal').classList.remove('visible');
}

// ===== Character Gallery Modal (large, with 3D model + tabs) =====
let gallery3DRenderer = null;
let gallery3DScene = null;
let gallery3DCamera = null;
let gallery3DAnimId = null;
let gallery3DChar = null;
let galleryCurrentIndex = 0;

function showGallery(playerId) {
  const idx = PLAYERS.findIndex(x => String(x.id) === String(playerId));
  if (idx < 0) return;
  galleryCurrentIndex = idx;
  updateGalleryContent();
  document.getElementById('gallery-modal').classList.add('visible');
  renderGallery3D(PLAYERS[idx]);
}

function updateGalleryContent() {
  const p = PLAYERS[galleryCurrentIndex];
  if (!p) return;
  const accent = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;

  // --- Persona tab ---
  let personaHtml = `<div class="modal-header">
    <div class="name" style="color:${accent}">${displayName}</div>
  </div>`;
  personaHtml += `<div class="modal-section"><h3>${t('persona')}</h3><p style="font-size:13px;line-height:1.7;color:var(--text);">${formatGameText(p.persona||'')}</p></div>`;
  personaHtml += `<div class="modal-section"><h3>${lang==='zh'?'模型':'Model'}</h3><div class="row"><span class="key">AI</span><span class="val">${(p.model||'').split('/').pop()}</span></div><div class="row"><span class="key">${t('thinking')}</span><span class="val">${p.thinking||'high'}</span></div></div>`;

  // --- Game tab (shared builder) ---
  let gameHtml = buildGameSectionHTML(p, accent, displayName);

  // Store and display
  const modal = document.getElementById('gallery-modal');
  const contentEl = document.getElementById('gallery-modal-content');
  modal._tabContent = { persona: personaHtml, game: gameHtml };
  modal._currentTab = 'persona';
  contentEl.innerHTML = personaHtml;

  // Update tab labels
  const tabs = modal.querySelectorAll('.modal-tab');
  tabs.forEach(tab => {
    const tabKey = tab.dataset.tab;
    tab.textContent = tabKey === 'persona' ? (lang === 'zh' ? '人物介紹' : 'Persona') : (lang === 'zh' ? '本局角色' : 'Game');
    tab.classList.toggle('active', tabKey === 'persona');
  });

  // Update nav buttons
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  if (prevBtn) prevBtn.disabled = galleryCurrentIndex === 0;
  if (nextBtn) nextBtn.disabled = galleryCurrentIndex >= PLAYERS.length - 1;
}

function renderGallery3D(player) {
  // Cleanup previous
  if (gallery3DAnimId) cancelAnimationFrame(gallery3DAnimId);
  if (gallery3DRenderer) {
    gallery3DRenderer.dispose();
    gallery3DRenderer = null;
  }
  if (gallery3DScene) {
    gallery3DScene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    gallery3DScene = null;
  }

  const canvas = document.getElementById('gallery-3d');
  if (!canvas) return;

  gallery3DRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  gallery3DRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  gallery3DRenderer.shadowMap.enabled = true;
  gallery3DRenderer.shadowMap.type = THREE.VSMShadowMap;
  gallery3DRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  gallery3DRenderer.toneMappingExposure = 1.12;
  gallery3DRenderer.outputColorSpace = THREE.SRGBColorSpace;

  gallery3DScene = new THREE.Scene();
  gallery3DScene.background = new THREE.Color(0x1a1520);

  gallery3DCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  gallery3DCamera.position.set(0, 2.0, 5.5);
  gallery3DCamera.lookAt(0, 1.1, 0);

  const amb = new THREE.HemisphereLight(0xdce8ff, 0x8c674a, 0.9);
  gallery3DScene.add(amb);
  const dir = new THREE.DirectionalLight(0xfff5e0, 1.05);
  dir.position.set(2, 4, 3);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.bias = -0.00025;
  dir.shadow.normalBias = 0.035;
  dir.shadow.radius = 3;
  dir.shadow.blurSamples = 12;
  gallery3DScene.add(dir);
  const fill = new THREE.DirectionalLight(0x6688ff, 0.2);
  fill.position.set(-2, 1, 1);
  gallery3DScene.add(fill);
  const rim = new THREE.DirectionalLight(0xff8844, 0.15);
  rim.position.set(0, 2, -3);
  gallery3DScene.add(rim);

  // Build full character in isolated scene
  gallery3DChar = buildCharacter(player, galleryCurrentIndex);
  gallery3DChar.position.set(0, SH, 0);
  gallery3DChar.rotation.y = 0;
  gallery3DScene.add(gallery3DChar);

  resizeGallery3D();

  const animate = () => {
    gallery3DAnimId = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;
    if (gallery3DChar) {
      gallery3DChar.rotation.y = Math.sin(t * 0.3) * 0.3;
      gallery3DChar.position.y = SH + Math.sin(t * 1.5) * 0.03;
    }
    if (gallery3DRenderer && gallery3DScene && gallery3DCamera) {
      gallery3DRenderer.render(gallery3DScene, gallery3DCamera);
    }
  };
  animate();
}

function resizeGallery3D() {
  const canvas = document.getElementById('gallery-3d');
  if (!canvas || !gallery3DRenderer) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(200, rect.width);
  const h = Math.max(300, rect.height);
  gallery3DRenderer.setSize(w, h, false);
  if (gallery3DCamera) {
    gallery3DCamera.aspect = w / h;
    gallery3DCamera.updateProjectionMatrix();
    // Adjust camera for narrow/mobile views to avoid head cropping
    if (h < 400) {
      gallery3DCamera.position.set(0, 2.2, 6.0);
      gallery3DCamera.lookAt(0, 1.0, 0);
    } else {
      gallery3DCamera.position.set(0, 2.0, 5.5);
      gallery3DCamera.lookAt(0, 1.1, 0);
    }
  }
}

function closeGallery() {
  const modal = document.getElementById('gallery-modal');
  modal.classList.remove('visible');
  if (gallery3DAnimId) cancelAnimationFrame(gallery3DAnimId);
  gallery3DAnimId = null;
  if (gallery3DRenderer) {
    gallery3DRenderer.dispose();
    gallery3DRenderer = null;
  }
  if (gallery3DScene) {
    gallery3DScene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    gallery3DScene = null;
  }
}

function galleryNav(dir) {
  const newIdx = galleryCurrentIndex + dir;
  if (newIdx < 0 || newIdx >= PLAYERS.length) return;
  galleryCurrentIndex = newIdx;
  updateGalleryContent();
  renderGallery3D(PLAYERS[newIdx]);
}

function showPlayerDetail(playerId) {
  const p = PLAYERS.find(x => String(x.id) === String(playerId));
  if (!p) return;
  const accent = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
  
  let html = `<div class="panel-section">
    <h3 style="color:${accent}">${displayName}</h3>
    <div class="row"><span class="key">${t('thinking')}</span><span class="val">${p.thinking || 'high'}</span></div>
  </div>`;
  
  html += `<div class="panel-section"><h3>${t('persona')}</h3><p style="font-size:12px;line-height:1.6;color:var(--text);">${formatGameText(p.persona || '')}</p></div>`;
  
  // Find this player's data in game
  if (gameData.night && gameData.night.players) {
    for (const [, pd] of Object.entries(gameData.night.players)) {
      if (pd.name === p.name) {
        html += `<div class="panel-section"><h3>${t('gameData')}</h3>`;
        html += `<div class="row"><span class="key">${t('initialRole')}</span><span class="val">${lang === 'zh' ? roleZh(pd.initial_role || '?') : (pd.initial_role || '?')}</span></div>`;
        html += `<div class="row"><span class="key">${t('currentRole')}</span><span class="val">${lang === 'zh' ? roleZh(pd.current_role || '?') : (pd.current_role || '?')}</span></div>`;
        const mem = pd.night_memory_text || (Array.isArray(pd.night_memory) ? pd.night_memory.join(' ') : pd.night_memory || '');
        if (mem) html += `<div class="row" style="display:block;"><span class="key">${t('nightMemory')}</span><span style="font-size:11px;color:var(--text);margin-top:4px;display:block;">${formatGameText(mem)}</span></div>`;
        html += '</div>';
        break;
      }
    }
  }

  // Find speeches
  if (gameData.day && gameData.day.day_trace) {
    const speeches = gameData.day.day_trace.filter(tr => tr.type === 'speech' && tr.player_name === p.name);
    if (speeches.length > 0) {
      html += `<div class="panel-section"><h3>${t('speeches')}</h3>`;
      speeches.forEach(s => {
        html += `<div class="speech-entry" style="border-left-color:${accent}">`;
        if (s.target) html += `<div class="speaker" style="color:${accent}">${displayName} @${displayPlayerName(s.target)}</div>`;
        else html += `<div class="speaker" style="color:${accent}">${displayName}</div>`;
        html += `<div class="text">${formatGameText(s.speech || '')}</div>`;
        if (s.timestamp) html += `<div class="time">${s.timestamp}</div>`;
        html += '</div>';
      });
      html += '</div>';
    }
  }

  // Find vote
  if (gameData.vote && gameData.vote.votes && gameData.vote.votes[p.name]) {
    const target = gameData.vote.votes[p.name];
    const tp = PLAYERS.find(x => x.name === target);
    const targetName = lang === 'zh' && tp ? (tp.name_zh || target) : target;
    html += `<div class="panel-section"><h3>${t('vote')}</h3>`;
    html += `<div class="row"><span class="key">${t('voteFor')}</span><span class="val" style="color:${getPlayerColor(target)}">→ ${targetName}</span></div>`;
    html += '</div>';
  }

  // Find postgame quote
  if (gameData.postgame && gameData.postgame.interviews) {
    for (const [cat, items] of Object.entries(gameData.postgame.interviews)) {
      const item = items.find(i => i.player_name === p.name);
      if (item) {
        html += `<div class="panel-section"><h3>${t('postgameLabel')} (${cat})</h3>`;
        html += `<div class="speech-entry" style="border-left-color:${accent}">`;
        html += `<div class="speaker" style="color:${accent}">${displayName} (${item.role})</div>`;
        html += `<div class="text">${formatGameText(item.quote || '')}</div>`;
        html += '</div></div>';
      }
    }
  }

  document.getElementById('panel-content').innerHTML = html;
  openSidePanel(true);
}

// ===== Generic Replay (used by day, night, postgame) =====
let replaySeq = [];      // [{speaker, text, panelEntrySelector?}] — entries to play
let replayLabel = '';    // shown in bar: "Day", "Night", "Postgame"
let replayIndex = 0;
let replayPlaying = false;
let replayTimer = null;

function startReplay(seq, label) {
  stopReplay();
  replaySeq = seq || [];
  replayLabel = label || '';
  replayIndex = 0;
  if (replaySeq.length === 0) {
    replayControls.classList.remove('visible');
    return;
  }
  replayControls.classList.add('visible');
  updateReplayProgress();
  showReplayAt(0);
}

function showReplayAt(idx) {
  clearBubbles();
  if (idx < 0 || idx >= replaySeq.length) return;
  const entry = replaySeq[idx];
  if (entry.speaker) {
    const pi = PLAYERS.findIndex(p => p.name === entry.speaker);
    if (pi >= 0) showBubble(pi, entry.text, 6000);
  } else if (entry.text) {
    // fallback: show on first player
    showBubble(0, entry.text, 6000);
  }
  replayIndex = idx;
  updateReplayProgress();
  highlightReplayPanelEntry(idx);
}

function highlightReplayPanelEntry(seqIdx) {
  const panel = document.getElementById('panel-content');
  if (!panel) return;
  panel.querySelectorAll('.speech-entry.active-replay').forEach(el => el.classList.remove('active-replay'));
  const entries = panel.querySelectorAll('.speech-entry.active-replay-target');
  const target = entries[seqIdx];
  if (target) {
    target.classList.add('active-replay');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateReplayProgress() {
  const el = document.getElementById('replay-progress');
  if (el) el.textContent = `${replayLabel ? replayLabel + ' · ' : ''}${replayIndex + 1} / ${replaySeq.length}`;
}

function playReplay() {
  if (replaySeq.length === 0) return;
  if (replayIndex >= replaySeq.length - 1) replayIndex = -1;
  replayPlaying = true;
  document.getElementById('btn-play').textContent = '⏸';
  nextReplayStep();
}

function nextReplayStep() {
  if (!replayPlaying) return;
  if (replayIndex + 1 >= replaySeq.length) { stopReplay(); return; }
  showReplayAt(replayIndex + 1);
  replayTimer = setTimeout(nextReplayStep, 5000);
}

function stopReplay() {
  replayPlaying = false;
  const btn = document.getElementById('btn-play');
  if (btn) btn.textContent = '▶';
  if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
}

// Legacy wrapper for day panel — now just builds a speech-only sequence
function startSpeechReplay(speeches) {
  const seq = (gameData.day?.day_trace || [])
    .filter(tr => tr.type === 'speech')
    .map(tr => ({ speaker: tr.player_name, text: tr.speech }));
  startReplay(seq, lang === 'zh' ? '日間' : 'Day');
}

// ===== UI Setup =====
function toggleLanguage() {
  const panelContent = document.getElementById('panel-content');
  const openPanelView = document.getElementById('side-panel').classList.contains('open')
    ? panelContent.dataset.panelView : '';
  const restoreStory = document.getElementById('story-mode').classList.contains('visible');
  const savedStoryIndex = storyIndex;
  lang = lang === 'en' ? 'zh' : 'en';
  updateUIText();
  if (archiveGames.length > 0) buildArchiveList(archiveGames);
  buildNameTags();
  if (currentGame) {
    const savedPhase = currentPhase;
    loadGame(currentGame).then(loaded => {
      if (!loaded) return;
      if (restoreStory) openStoryMode(false, savedStoryIndex);
      else if (openPanelView === 'about') showAboutPanel();
      else if (openPanelView === 'proof') showProofPanel();
      else setPhase(savedPhase);
    });
  } else if (gameData.night) {
    const savedPhase = currentPhase;
    if (restoreStory) openStoryMode(false, savedStoryIndex);
    else if (openPanelView === 'about') showAboutPanel();
    else if (openPanelView === 'proof') showProofPanel();
    else setPhase(savedPhase);
  }
}

function setupUI() {
  buildNameTags();
  updateUIText();

  // Welcome overlay
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const dismissWelcome = () => welcomeOverlay.classList.add('hidden');
  document.getElementById('welcome-btn').addEventListener('click', () => {
    dismissWelcome();
    const launchStoryWhenReady = () => {
      if (gameData.night) openStoryMode(true);
      else setTimeout(launchStoryWhenReady, 150);
    };
    setTimeout(launchStoryWhenReady, 250);
  });
  document.getElementById('welcome-explore').addEventListener('click', dismissWelcome);
  document.getElementById('welcome-lang').addEventListener('click', toggleLanguage);
  // Dismiss on Escape or click outside the card
  welcomeOverlay.addEventListener('click', (e) => {
    if (e.target === welcomeOverlay) dismissWelcome();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !welcomeOverlay.classList.contains('hidden')) {
      dismissWelcome();
    }
  });

  // Phase steps
  document.querySelectorAll('.phase-step').forEach(el => {
    el.addEventListener('click', () => setPhase(el.dataset.phase));
  });

  // Buttons
  document.getElementById('btn-night').addEventListener('click', e => {
    const btn = e.currentTarget;
    const n = !btn.classList.contains('active');
    btn.classList.toggle('active', n);
    setNight(n);
  });

  document.getElementById('btn-rotate').addEventListener('click', e => {
    autoRotate = !autoRotate;
    e.currentTarget.classList.toggle('active', autoRotate);
  });

  document.getElementById('btn-archive').addEventListener('click', () => {
    const archivePanel = document.getElementById('archive-panel');
    const opening = !archivePanel.classList.contains('open');
    archivePanel.classList.toggle('open', opening);
    if (opening) closeSidePanel();
  });
  document.getElementById('btn-archive-close').addEventListener('click', () => {
    document.getElementById('archive-panel').classList.remove('open');
  });

  document.getElementById('btn-info').addEventListener('click', () => {
    document.getElementById('archive-panel').classList.remove('open');
    showAboutPanel();
  });
  document.getElementById('btn-story').addEventListener('click', () => openStoryMode(false));
  document.getElementById('btn-proof').addEventListener('click', showProofPanel);
  document.getElementById('btn-panel-close').addEventListener('click', () => {
    closeSidePanel();
  });

  document.getElementById('btn-lang').addEventListener('click', toggleLanguage);

  document.getElementById('story-prev').addEventListener('click', () => {
    stopStoryPlayback();
    storyIndex = Math.max(0, storyIndex - 1);
    renderStoryStep();
  });
  document.getElementById('story-next').addEventListener('click', () => {
    stopStoryPlayback();
    storyIndex = Math.min(storySteps.length - 1, storyIndex + 1);
    renderStoryStep();
  });
  document.getElementById('story-play').addEventListener('click', () => {
    if (storyPlaying) {
      stopStoryPlayback();
      return;
    }
    if (storyIndex >= storySteps.length - 1) storyIndex = 0;
    storyPlaying = true;
    document.getElementById('story-play').textContent = '⏸';
    renderStoryStep();
    scheduleStoryStep();
  });
  document.getElementById('story-speed').addEventListener('click', () => {
    const speeds = [1, 1.5, 2];
    storySpeed = speeds[(speeds.indexOf(storySpeed) + 1) % speeds.length];
    document.getElementById('story-speed').textContent = `${storySpeed}×`;
    if (storyPlaying) {
      if (storyTimer) clearTimeout(storyTimer);
      scheduleStoryStep();
    }
  });
  document.getElementById('story-close').addEventListener('click', closeStoryMode);

  // Small modal close
  document.getElementById('player-modal-close').addEventListener('click', closePlayerModal);
  document.getElementById('player-modal').addEventListener('click', e => {
    if (e.target.id === 'player-modal') closePlayerModal();
  });

  // Gallery modal (large)
  document.getElementById('btn-gallery').addEventListener('click', () => {
    if (PLAYERS.length === 0) return;
    showGallery(PLAYERS[0].id);
  });
  document.getElementById('gallery-modal-close').addEventListener('click', closeGallery);
  document.getElementById('gallery-modal').addEventListener('click', e => {
    if (e.target.id === 'gallery-modal') closeGallery();
  });
  document.getElementById('gallery-prev').addEventListener('click', () => galleryNav(-1));
  document.getElementById('gallery-next').addEventListener('click', () => galleryNav(1));

  // Gallery tab switching
  document.querySelectorAll('#gallery-modal-tabs .modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const modal = document.getElementById('gallery-modal');
      const tabKey = tab.dataset.tab;
      if (!modal._tabContent || !modal._tabContent[tabKey]) return;
      document.querySelectorAll('#gallery-modal-tabs .modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      modal._currentTab = tabKey;
      document.getElementById('gallery-modal-content').innerHTML = modal._tabContent[tabKey];
    });
  });

  // Replay controls
  document.getElementById('btn-prev').addEventListener('click', () => {
    stopReplay();
    if (replayIndex > 0) showReplayAt(replayIndex - 1);
  });
  document.getElementById('btn-play').addEventListener('click', () => {
    if (replayPlaying) stopReplay();
    else playReplay();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    stopReplay();
    if (replayIndex < replaySeq.length - 1) showReplayAt(replayIndex + 1);
  });
}

function updateUIText() {
  document.querySelector('.brand').innerHTML = t('brand') + ' <span class="sub">' + t('sub') + '</span>';
  document.getElementById('btn-gallery').innerHTML = (lang === 'zh' ? 'AI 代理' : 'AI Agents');
  document.getElementById('btn-story').innerHTML = t('story');
  document.getElementById('btn-proof').innerHTML = t('proof');
  document.getElementById('btn-archive').innerHTML = t('archive');
  document.getElementById('btn-info').innerHTML = t('info');
  document.getElementById('btn-night').innerHTML = t('night');
  document.getElementById('btn-night').classList.toggle('active', isNight);
  document.getElementById('btn-rotate').innerHTML = t('autoRotate');
  document.getElementById('btn-lang').innerHTML = t('langLabel');
  document.getElementById('welcome-lang').textContent = t('langLabel');
  document.getElementById('loading').textContent = t('loadingVillage');
  // Welcome overlay
  document.getElementById('welcome-title').textContent = t('brand');
  document.getElementById('welcome-sub').textContent = t('sub');
  document.getElementById('welcome-eyebrow').textContent =
    lang === 'zh' ? '已記錄的自主遊戲' : 'RECORDED AUTONOMOUS GAME';
  document.getElementById('welcome-desc').textContent = lang === 'zh'
    ? '觀看六個 AI 代理在沒有真人操控的情況下虛張聲勢、推理並投票。'
    : 'Watch six AI agents bluff, reason, and vote with no human player controlling the table.';
  document.getElementById('welcome-fact-agents').textContent = lang === 'zh' ? '6 個 AI 代理' : '6 AI agents';
  document.getElementById('welcome-fact-models').textContent = lang === 'zh' ? '使用不同 LLM' : 'Different LLMs';
  document.getElementById('welcome-fact-trace').textContent = lang === 'zh' ? '完整決策軌跡' : 'Full decision trace';
  document.getElementById('welcome-btn').textContent = lang === 'zh' ? '觀看導覽重播' : 'Watch guided replay';
  document.getElementById('welcome-explore').textContent = lang === 'zh' ? '探索遊戲桌' : 'Explore the table';
  document.getElementById('welcome-trust').textContent = lang === 'zh'
    ? '所有已記錄事件均完整保留。你可以在「證據」中查看原始遊戲輸出。'
    : 'Every recorded event is preserved. Raw game outputs are available in Proof.';
  document.getElementById('welcome-gh').textContent =
    lang === 'zh' ? '在 GitHub 查看原始碼 ↗' : 'View source on GitHub ↗';
  // Update phase labels
  const phaseLabels = { night: t('nightPhase'), day: t('dayDiscussion'), vote: t('voting'), resolve: t('resolution'), postgame: t('postgame') };
  document.querySelectorAll('.phase-step').forEach(el => {
    const label = el.querySelector('.label');
    if (label) label.textContent = phaseLabels[el.dataset.phase] || '';
  });
  // Archive title
  const archiveH3 = document.querySelector('#archive-panel h3');
  if (archiveH3) archiveH3.textContent = t('gameArchive');
  // Controls hint
  const hint = document.getElementById('controls-hint');
  if (hint) hint.innerHTML = lang === 'zh'
    ? '🖱️ 拖=旋轉 · 滾輪=縮放<br>⌨️ WASD/方向鍵=移動<br>👆 角色點擊=詳情'
    : '🖱️ Drag=rotate · Wheel=zoom<br>⌨️ WASD/Arrows=pan<br>👆 Click character=details';
}

let sidePanelOpen = false;
function applyPanelOffset() {
  const panelW = sidePanelOpen && innerWidth > 768 ? 380 : 0;
  if (panelW > 0) {
    targetV.x = -1.2;
    // Pull back significantly so all 6 characters fit in the narrower visible area
    dist = Math.max(17, dist);
  } else {
    targetV.x = 0;
    // On mobile, pull back to fit everything
    dist = innerWidth <= 768 ? Math.min(Math.max(dist, 18), 28) : Math.min(dist, 14);
  }
  updateCam();
}
function openSidePanel(auto) {
  // auto-open from phase change: skip on mobile
  // manual open (from button): always allow
  if (auto && innerWidth <= 768) return;
  document.getElementById('side-panel').classList.add('open');
  sidePanelOpen = true;
  applyPanelOffset();
}
function closeSidePanel() {
  document.getElementById('side-panel').classList.remove('open');
  sidePanelOpen = false;
  applyPanelOffset();
}

// ===== Helpers =====
function getPlayerColor(name) {
  const p = PLAYERS.find(x => x.name === name);
  if (!p) return '#e8c468';
  return '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
}


function formatGameText(text) {
  // Escape HTML first, then convert markup to styled spans
  const div = document.createElement('div');
  div.textContent = text || '';
  let html = div.innerHTML;
  // Unicode-aware: letters (all scripts), CJK, Hangul, Hiragana/Katakana, fullwidth, emoji
  const CHAR = '[\\p{L}\\p{M}\\p{N}\\u3000-\\u9FFF\\uAC00-\\uD7AF\\u3040-\\u30FF\\uFF00-\\uFFEF\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}]';
  const NAME = CHAR + '(?:' + CHAR + '| )*?' + CHAR + '?';
  // &lt;Role&gt; -> role highlight (escaped angle brackets from textContent)
  const roleRe = new RegExp('&lt;(' + NAME + ')&gt;', 'gu');
  html = html.replace(roleRe, (m, inner) => '<span class="role-highlight">' + inner + '</span>');
  // [Player Name] -> player highlight (square brackets survive textContent escape)
  const playerRe = new RegExp('\\[(' + NAME + ')\\]', 'gu');
  html = html.replace(playerRe, (m, inner) => '<span class="player-highlight">' + inner + '</span>');
  return html;
}




// ===== Speaking Animation =====
let speakingStates = []; // [{index, intensity, startTime}]

function setSpeaking(index, active) {
  const existing = speakingStates.find(s => s.index === index);
  if (active && !existing) {
    speakingStates.push({ index, intensity: 0, startTime: performance.now() });
  } else if (!active && existing) {
    speakingStates = speakingStates.filter(s => s !== existing);
  }
}

function updateSpeakingAnims(t) {
  speakingStates.forEach(s => {
    if (!chars[s.index]) return;
    const g = chars[s.index];
    // Ramp up intensity
    s.intensity = Math.min(s.intensity + 0.05, 1);
    // Head bob — small rapid movement (animate head group so face features follow)
    const bob = Math.sin(t * 8) * 0.04 * s.intensity;
    const sway = Math.sin(t * 3) * 0.06 * s.intensity;
    g.children.forEach(child => {
      if (child.position.y > 0.9 && child.position.y < 1.2 && child.isGroup) {
        child.position.y = (child.userData._baseY || child.position.y) + bob;
        if (!child.userData._baseY) child.userData._baseY = child.position.y - bob;
        child.rotation.z = sway * 0.3;
      }
    });
    // Slight forward lean
    g.rotation.x = -0.03 * s.intensity;
  });
  // Fade out when stopped
  speakingStates = speakingStates.filter(s => s.intensity > 0.01 || performance.now() - s.startTime < 999999);
}


// ===== Confetti =====
let confettiSystem = null;
function spawnConfetti(winners) {
  if (confettiSystem) { scene.remove(confettiSystem.points); confettiSystem = null; }
  const count = 200;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const winnerIndices = winners.map(n => PLAYERS.findIndex(p => p.name === n)).filter(i => i >= 0);

  for (let i = 0; i < count; i++) {
    const wIdx = winnerIndices[i % winnerIndices.length] || 0;
    const pos3 = sp(wIdx);
    pos[i*3] = pos3[0] + (Math.random() - 0.5) * 0.5;
    pos[i*3+1] = SH + 1.5 + Math.random() * 0.5;
    pos[i*3+2] = pos3[2] + (Math.random() - 0.5) * 0.5;
    // Burst upward + outward
    vel[i*3] = (Math.random() - 0.5) * 0.08;
    vel[i*3+1] = 0.05 + Math.random() * 0.08;
    vel[i*3+2] = (Math.random() - 0.5) * 0.08;
    // Random festive color
    const palette = [[1,0.8,0.2], [0.2,1,0.4], [0.3,0.6,1], [1,0.3,0.5], [0.9,0.9,0.9]];
    const c = palette[i % palette.length];
    colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.1, vertexColors: true, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  confettiSystem = { points, vels: vel, count, startTime: performance.now(), duration: 4000 };
}

function updateConfetti(tMs) {
  if (!confettiSystem) return;
  const elapsed = tMs - confettiSystem.startTime;
  if (elapsed > confettiSystem.duration) {
    scene.remove(confettiSystem.points);
    confettiSystem.points.geometry.dispose();
    confettiSystem.points.material.dispose();
    confettiSystem = null;
    return;
  }
  const pos = confettiSystem.points.geometry.attributes.position.array;
  const vels = confettiSystem.vels;
  for (let i = 0; i < confettiSystem.count; i++) {
    pos[i*3] += vels[i*3];
    pos[i*3+1] += vels[i*3+1];
    pos[i*3+2] += vels[i*3+2];
    // Gravity
    vels[i*3+1] -= 0.002;
  }
  confettiSystem.points.geometry.attributes.position.needsUpdate = true;
  // Fade out
  const fadeT = 1 - elapsed / confettiSystem.duration;
  confettiSystem.points.material.opacity = Math.min(1, fadeT * 2);
}

// ===== Camera Intro Animation =====
let introAnim = null;
function startIntroAnim() {
  introAnim = { startTime: performance.now(), duration: 2000, done: false };
  // Start high and far
  dist = 30; theta = PI / 4;
}

function updateIntroAnim() {
  if (!introAnim || introAnim.done) return;
  const elapsed = performance.now() - introAnim.startTime;
  const t = Math.min(elapsed / introAnim.duration, 1);
  // Ease out cubic
  const e = 1 - Math.pow(1 - t, 3);
  // Descend from 30 to target dist
  const targetDist = innerWidth <= 768 ? 20 : 12;
  dist = 30 + (targetDist - 30) * e;
  // Rotate slightly during descent
  theta = PI / 4 + (0 - PI / 4) * e;
  phi = PI / 3.5; // keep constant
  updateCam();
  if (t >= 1) { introAnim.done = true; introAnim = null; }
}

// ===== Animation Loop =====
function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  const tMs = performance.now();

  // Idle bob (only for characters not in death/team anims)
  const inDeathAnim = new Set(deathAnims.map(d => d.index));
  const inTeamAnim = new Set(teamAnims.map(a => a.index));
  chars.forEach((g, i) => {
    if (!inDeathAnim.has(i) && !inTeamAnim.has(i)) {
      g.position.y = SH + Math.sin(t * 1.5 + i) * 0.03;
      // Breathing — subtle body scale + head micro-sway
      const breath = 1 + Math.sin(t * 1.2 + i * 0.7) * 0.012;
      g.scale.set(1, breath, 1);
      // Head micro-sway
      const head = g.children.find(c => c.isGroup && c.position.y > 0.5);
      if (head) {
        head.rotation.z = Math.sin(t * 0.8 + i * 1.3) * 0.04;
        head.rotation.x = Math.sin(t * 0.6 + i * 0.5) * 0.025;
      }
    }
  });

  // Flame flicker
  if (flame) {
    flame.scale.y = 1 + Math.sin(t * 8) * 0.15;
    flame.scale.x = 1 + Math.sin(t * 7) * 0.1;
    flame.position.y = 0.72 + Math.sin(t * 8) * 0.01;
  }

  // Intro animation (overrides auto-rotate)
  if (introAnim && !introAnim.done) { updateIntroAnim(); }
  else if (autoRotate) { theta += 0.003; updateCam(); }

  // Night/day light transition
  updateNightTransition();
  updateParticles(t);

  // Per-frame updates for overlays
  updateKeyboardPan();
  updateNameTags();
  updateAllBubbles();
  if (activeVotes) redrawVoteArrows();
  updateDeathAnims(tMs);
  updateTeamAnims(tMs);
  updateSpeakingAnims(t);
  updateConfetti(tMs);

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

// ===== Resize =====
window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applyPanelOffset();
  resizeGallery3D();
});

// ===== Start =====
init();
