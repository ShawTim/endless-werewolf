/* ===== Endless Werewolf — 3D Village Table ===== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CACHE_VERSION = '20260913-p1p2-sky-webp-gable';
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
    story: 'Replay Latest', rules: 'Rules', proof: 'Proof',
    agentState: 'Agent State', decisionTrace: 'Decision Trace',
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
    story: '重播最新遊戲', rules: '規則', proof: '證據',
    agentState: '代理狀態', decisionTrace: '決策軌跡',
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
let skyUniforms, envGround, flameGlow;
// Image-based lighting. pmrem bakes the procedural sky into a small env map so
// PBR surfaces pick up sky tint and go properly dark at night.
let pmrem = null, envScene = null, envRT = null;
let envIntensity = 0.5;
let mistSprites = [];
let smokePuffs = [];
let composer, renderPass, bloomPass, smaaPass;
let chars = [];
let isNight = false;
let autoRotate = false; // cinematic camera (orbit + speaker focus) — OFF by default; Auto button enables
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

// ===== Figure proportions =====
// Shared by the main scene, the portrait renderer and the gallery viewer so the
// three stay in sync. The original build had a 1.31:1 head-to-torso ratio
// (head = 42% of figure height) with the head sunk straight into the torso;
// these bring it to roughly 34% with a neck between.
const HEAD_Y = 1.15;      // head-group centre (was 0.98)
const HEAD_S = 0.79;      // head scale (was 0.86 — the 3.4:1 head:body ratio read as a bobblehead)
const TORSO_H = 0.69;     // tapered torso height (was 0.55)
const TORSO_Y = 0.42;     // torso centre (was 0.35)
const NECK_Y = 0.80;

// Skull radius and the base radius every hair shell is measured from. Hair used
// to be authored per-branch with arbitrary radii (0.340 to 0.380 against a 0.36
// skull): several shells sat inside the skull or within a few thousandths of it,
// which read as bald patches and z-fighting speckle rather than as hair.
const HEAD_R = 0.36;
// Outline shells scale by 1.018, so hair must clear that inflated skin surface
// (0.3665) by a real margin, not a nominal one. Two faceted spheres only a few
// thousandths apart interpenetrate, which is what produced the speckled bald
// patches on the old hair.
const HAIR_R = 0.396;     // base hair shell radius (~0.035 of visible loft)
const NAPE_R = 0.392;     // slightly tighter, tucks under the main cap

// A whole hairstyle as ONE continuous sheet of hair.
//
// The previous attempts failed for a specific reason worth recording: the shell
// was a sphere CONCENTRIC with the skull, so it had a constant thickness and no
// volume anywhere. That reads as a swim cap, not hair, no matter how the edges
// are cut. Hair needs thickness that varies — thin at the temples, massed at the
// back of the skull, and pushed forward over the brow.
//
// So the radius here is a function of position, not a constant:
//   backOut    extra thickness over the occiput
//   fringeOut  forward bulge toward the brow (this is what stops it looking
//              like a painted-on cap; the fringe stands off the forehead)
//
// The face is left clear because each COLUMN of the sheet stops at its own
// theta. Frontal columns stop high (exposing the brow) while side and rear
// columns carry on down (a bob's length). The boundary those stops trace IS the
// hairline, and because it is continuous in phi it curves instead of notching.
// A small periodic wobble makes the fringe uneven rather than laser-cut.
//
// Non-indexed + flat normals gives every facet its own lighting, which is the
// low-poly language that reads as cut hair. Smooth normals on a surface this
// simple just look like moulded plastic.
function hairShellGeo(base, {
  thetaTop = 0.0, thetaBottom = 1.80,
  openBelow = 1.20, wobble = 0.10,
  backOut = 0.030, fringeOut = 0.050,
  flare = 0.0, asym = 0.0,
  segU = 72, segV = 18,
} = {}) {
  const FRONT = PI / 2;
  const c01 = v => Math.min(1, Math.max(0, v));

  // Front columns stop at openBelow; rear columns run to thetaBottom.
  const thetaCut = (phi) => {
    const fr = sin(phi);                    // +1 at the face, -1 at the nape
    let k = c01((fr + 0.30) / 1.20);        // how "frontal" this column is
    k = k * k * (3 - 2 * k);
    let t = thetaBottom * (1 - k) + openBelow * k;
    t += wobble * fr * cos(3 * phi);        // uneven fringe, front only
    // A parting: shift the frontier sideways so one side sweeps across the brow.
    t += asym * cos(phi);
    return t;
  };
  const rAt = (theta, phi, tCut) => {
    const fr = sin(phi);
    let r = base;
    r += backOut * c01(-fr);                                   // mass at the nape
    const nearRim = c01((theta - (tCut - 0.55)) / 0.55);       // 0 up top, 1 at the rim
    r += fringeOut * c01(fr) * nearRim;                        // brow stands proud
    // Tips push outward. Without this the sheet closes back toward the chin and
    // the style tapers to a point instead of hanging with weight.
    r += flare * nearRim * nearRim;
    return r;
  };
  const P = (theta, phi) => {
    const r = rAt(theta, phi, thetaCut(phi));
    const st = sin(theta), ct = cos(theta);
    return [-cos(phi) * st * r, ct * r, sin(phi) * st * r];
  };

  const pos = [];
  for (let i = 0; i <= segU; i++) {
    const phi = FRONT + (i / segU) * TAU;
    const tCut = thetaCut(phi);
    for (let j = 0; j <= segV; j++) {
      const theta = thetaTop + (tCut - thetaTop) * (j / segV);
      pos.push(...P(theta, phi));
    }
  }
  const row = segV + 1;
  const at = (i, j) => i * row + j;
  const idx = [];
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  geo.dispose();
  return flat;
}

// Direction on the hair sphere. phi runs around the head (PI/2 faces forward),
// theta runs down from +Y (0 = crown, PI/2 = ear line, > PI/2 = below the ear).
function hairDir(phi, theta) {
  return new THREE.Vector3(
    -cos(phi) * sin(theta),
     cos(theta),
     sin(phi) * sin(theta)
  ).normalize();
}

// A bun / top-knot: a squashed sphere on the surface. `phi` defaults to the
// back of the head (3PI/2) — a bun belongs on the occiput, not the side of the
// skull where phi=PI would put it.
function hairKnot(mat, theta, size, depth = 0.9, phi = PI * 1.5) {
  const dir = hairDir(phi, theta);
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 18), mat);
  m.scale.set(1, 1, depth);
  m.position.copy(dir).multiplyScalar(HAIR_R + size * 0.30);
  m.castShadow = true;
  return m;
}

// Hair/tint material for a player. Shared so the in-scene build and the portrait
// renderer cannot disagree about what colour someone's hair is.
// DoubleSide: the shell is a single sheet, so the inside of a fringe or the
// underside of a fringe would otherwise be see-through.
function hairMatFor(player, dark = false) {
  // Hair colours sit within a few points of black, so under candlelight the head
  // collapsed into a silhouette against the dark sky and stopped reading as a
  // head at all. Lifting the colour 12% toward a warm grey keeps it dark hair
  // but leaves enough value for the toon bands to describe the volume. A cel rim
  // was tried first and aliased into a dotted silhouette: the shell is
  // flat-shaded, so a rim thin enough to look like a sheen lands on single
  // triangles instead of a continuous edge.
  const base = new THREE.Color(dark ? 0x1a1a2e : (player.hair ?? 0x2a1a0a));
  if (!dark) base.lerp(new THREE.Color(0x8a7a68), 0.12);
  const mat = new THREE.MeshToonMaterial({
    color: base,
    gradientMap: TOON_GRADIENT,
    side: THREE.DoubleSide,
  });
  return mat;
}

// ===== Hair =====
// Every hairstyle is defined once, here, and used by both the in-scene build and
// the portrait renderer. Previously each persona's hair was written out twice
// (scene + portrait) and the two copies drifted — the portrait carried its own
// copy of the buried-shell and squashed-crown bugs.
//
// Each style is ONE shell, but the numbers make genuinely different shapes:
//   base       radius off the skull (volume)
//   thetaBottom how far the sides/back reach (1.60 = ear, 2.35 = past jaw)
//   openBelow  where the FRONT stops; front rim lands at base*cos(openBelow)
//   backOut    thickness massed on the occiput
//   fringeOut  forward bulge of the fringe over the brow (kills the cap look)
//   flare      tips splay outward, so long styles hang rather than taper
//   asym       sideways parting offset
//   wobble     unevenness of the fringe line
//
//   Prosecutor   slicked back: short, high line, tight, strongly parted
//   Therapist    bob: past the jaw, big volume, flared, bun on the occiput
//   Statistician neat: mid, high line, thin, one-sided parting
//   Chaos Agent  spikes riding a short shell
//   Gut Player   bandana over a short shell
//   Underdog     bowl: long, low, wide, uneven fringe
const HAIR_STYLES = {
  'The Prosecutor':   { base: 0.390, thetaBottom: 1.58, openBelow: 0.98, backOut: 0.022, fringeOut: 0.030, flare: 0.000, asym: 0.13, wobble: 0.05 },
  'Blaze':            { base: 0.390, thetaBottom: 1.58, openBelow: 0.98, backOut: 0.022, fringeOut: 0.030, flare: 0.000, asym: 0.13, wobble: 0.05 },
  'The Therapist':    { base: 0.402, thetaBottom: 2.36, openBelow: 1.24, backOut: 0.045, fringeOut: 0.052, flare: 0.055, asym: 0.00, wobble: 0.12 },
  'SafetySam':        { base: 0.402, thetaBottom: 2.36, openBelow: 1.24, backOut: 0.045, fringeOut: 0.052, flare: 0.055, asym: 0.00, wobble: 0.12 },
  'The Statistician': { base: 0.392, thetaBottom: 1.80, openBelow: 1.10, backOut: 0.026, fringeOut: 0.034, flare: 0.010, asym: 0.22, wobble: 0.05 },
  'Dr. Pizza':        { base: 0.392, thetaBottom: 1.80, openBelow: 1.10, backOut: 0.026, fringeOut: 0.034, flare: 0.010, asym: 0.22, wobble: 0.05 },
  'The Chaos Agent':  { base: 0.394, thetaBottom: 1.68, openBelow: 1.16, backOut: 0.034, fringeOut: 0.040, flare: 0.020, asym: 0.08, wobble: 0.18 },
  'Twister':          { base: 0.394, thetaBottom: 1.68, openBelow: 1.16, backOut: 0.034, fringeOut: 0.040, flare: 0.020, asym: 0.08, wobble: 0.18 },
  'The Gut Player':   { base: 0.392, thetaBottom: 1.72, openBelow: 1.14, backOut: 0.030, fringeOut: 0.036, flare: 0.012, asym: 0.00, wobble: 0.06 },
  'ConspiBro':        { base: 0.392, thetaBottom: 1.72, openBelow: 1.14, backOut: 0.030, fringeOut: 0.036, flare: 0.012, asym: 0.00, wobble: 0.06 },
  'The Underdog':     { base: 0.400, thetaBottom: 2.02, openBelow: 1.22, backOut: 0.038, fringeOut: 0.046, flare: 0.040, asym: 0.00, wobble: 0.22 },
  'EasyBake':         { base: 0.400, thetaBottom: 2.02, openBelow: 1.22, backOut: 0.038, fringeOut: 0.046, flare: 0.040, asym: 0.00, wobble: 0.22 },
};
// Fallback for roster members without a bespoke style.
const HAIR_STYLE_DEFAULT = { base: 0.394, thetaBottom: 1.74, openBelow: 1.14, backOut: 0.030, fringeOut: 0.036, flare: 0.014, asym: 0.00, wobble: 0.08 };

function buildHair(head, player) {
  const mat = hairMatFor(player);
  // The camera sits ~39° above the eye line, so hair that reaches the brow is
  // not "a fringe" from up here — it is the whole face. Clamp the front of the
  // shell to a high hairline, calm the wobble that dips a clump over the eye,
  // and stop the brow rim bulging forward into the sightline.
  const st = { ...(HAIR_STYLES[player.name] || HAIR_STYLE_DEFAULT) };
  st.openBelow = Math.min(st.openBelow, 1.16) - 0.20;
  st.fringeOut *= 0.42;
  st.wobble *= 0.45;
  st.asym *= 0.35;

  const shell = new THREE.Mesh(hairShellGeo(st.base, st), mat);
  shell.castShadow = true;
  head.add(shell);

  switch (player.name) {
    // ---- bob: a low bun on the occiput ----
    case 'The Therapist': case 'SafetySam':
      head.add(hairKnot(mat, 1.16, 0.098));
      break;

    // ---- wild spikes: tall, uneven, riding the shell ----
    case 'The Chaos Agent': case 'Twister':
      for (let k = 0; k < 11; k++) {
        const phi = (k / 11) * TAU + 0.35;
        const theta = 0.28 + (k % 4) * 0.19;
        const len = 0.20 + ((k * 7) % 5) * 0.045;
        head.add(hairSpike(mat, phi, theta, len, 0.048 + (k % 3) * 0.008));
      }
      break;

    // ---- bandana: band across the brow, crown covered, knot + tail behind ----
    case 'The Gut Player': case 'ConspiBro': {
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.4 });
      const capMat = new THREE.MeshStandardMaterial({ color: 0x8a9797, roughness: 0.5 });
      // Wraps the skull at brow height (head radius there is ~0.346).
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.352, 0.048, 12, 40), bandMat);
      band.position.set(0, 0.115, 0); band.rotation.x = PI / 2; band.scale.set(1, 1, 0.92);
      band.castShadow = true;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.402, 44, 26, 0, TAU, 0, PI * 0.40), capMat
      );
      cap.position.set(0, 0.005, 0); cap.castShadow = true;
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.095, 0.075), bandMat);
      knot.position.set(0, 0.075, -0.385); knot.rotation.z = 0.5;
      knot.castShadow = true;
      head.add(band, cap, knot);
      const scar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.01), new THREE.MeshStandardMaterial({ color: 0xaa3333 }));
      scar.position.set(-0.15, -0.03, 0.35); scar.rotation.z = 0.2;
      head.add(scar);
      break;
    }

    // ---- messy bowl: two tufts breaking the line ----
    case 'The Underdog': case 'EasyBake':
      head.add(hairSpike(mat, PI / 2 + 0.62, 0.20, 0.15, 0.040));
      head.add(hairSpike(mat, PI / 2 - 0.22, 0.30, 0.11, 0.035));
      break;

    default:
      break;
  }
}

// Spikes and stranded styles ride the same sphere, aimed outward along the
// normal so they stick out of the skull instead of being buried inside it.
function hairSpike(mat, phi, theta, len, radius = 0.055) {
  const dir = hairDir(phi, theta);
  const m = new THREE.Mesh(new THREE.ConeGeometry(radius, len, 6), mat);
  m.position.copy(dir).multiplyScalar(HAIR_R * 0.94);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  m.castShadow = true;
  return m;
}

// ===== Face texture =====
// The face is painted once into a canvas and mapped onto the head sphere,
// instead of being assembled from ~16 floating primitives (eye discs, pupil
// spheres, a cone nose, a torus mouth, brow boxes, blush balls). A drawn face
// holds up both at the ~40px the characters occupy during play and at gallery
// close-up, and it deletes more meshes than it adds.
//
// UV convention: on THREE.SphereGeometry the character's forward (+Z) axis is
// u = 0.25, and v = 1 is the crown — so the canvas top row is the top of the
// head. The head group is scaled at runtime, but UVs are scale-independent, so
// every constant below is in the original head-local units (radius 0.36).
const FACE_STYLES = {
  'The Prosecutor':   { browTilt:  0.30, mouth: -0.10, eye: 0.94 }, // stern
  'Blaze':            { browTilt:  0.30, mouth: -0.10, eye: 0.94 },
  'The Therapist':    { browTilt:  0.00, mouth:  0.22, eye: 1.00 },
  'SafetySam':        { browTilt:  0.00, mouth:  0.22, eye: 1.00 },
  'The Chaos Agent':  { browTilt: -0.26, mouth:  0.60, eye: 1.06 }, // manic grin
  'Twister':          { browTilt: -0.26, mouth:  0.60, eye: 1.06 },
  'The Gut Player':   { browTilt:  0.34, mouth: -0.06, eye: 0.92 }, // suspicious
  'ConspiBro':        { browTilt:  0.34, mouth: -0.06, eye: 0.92 },
  'The Statistician': { browTilt:  0.06, mouth:  0.12, eye: 1.00 },
  'Dr. Pizza':        { browTilt:  0.06, mouth:  0.12, eye: 1.00 },
  'The Underdog':     { browTilt: -0.22, mouth:  0.06, eye: 1.08 }, // wide-eyed, worried
  'EasyBake':         { browTilt: -0.22, mouth:  0.06, eye: 1.08 },
};

function makeFaceTexture(player) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const hex = (v) => '#' + (v >>> 0).toString(16).padStart(6, '0');
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const R = 0.36;
  const S = W / (TAU * R);            // px per head-local unit at the equator
  const FRONT = W * 0.25;             // u = 0.25 is the character's +Z side
  const yPix = (y) => (Math.acos(cl(y / R, -1, 1)) / PI) * H;
  const xPix = (x, y) => {
    const z = Math.sqrt(Math.max(0, R * R - x * x - y * y));
    return FRONT + (Math.atan2(x, z) / TAU) * W;
  };

  const skinHex  = player.skin ?? 0xd4a574;
  const accent   = player.color ?? 0x8a6a4a;
  const irisBase = mixHexColors(accent, 0x1a1a2e, 0.35);
  const ink      = hex(mixHexColors(player.hair ?? 0x2a1a0a, 0x000000, 0.45));
  const iris     = hex(irisBase);
  const irisLit  = hex(mixHexColors(irisBase, 0xffffff, 0.38));
  const irisDeep = hex(mixHexColors(irisBase, 0x000000, 0.45));

  ctx.fillStyle = hex(skinHex);
  ctx.fillRect(0, 0, W, H);

  // Soft vertical falloff so the painted skin is not one flat fill once the
  // toon gradient multiplies it.
  const skinGrad = ctx.createLinearGradient(0, yPix(0.34), 0, yPix(-0.34));
  skinGrad.addColorStop(0.00, 'rgba(255,238,220,0.30)');
  skinGrad.addColorStop(0.55, 'rgba(255,238,220,0)');
  skinGrad.addColorStop(1.00, 'rgba(110,60,40,0.16)');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, W, H);

  const st = FACE_STYLES[player.name] || { browTilt: 0, mouth: 0.10, eye: 1.0 };

  // --- blush ---
  for (const s of [-1, 1]) {
    const bx = xPix(s * 0.205, -0.055), by = yPix(-0.055);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, 0.10 * S);
    g.addColorStop(0, 'rgba(226,132,116,0.32)');
    g.addColorStop(1, 'rgba(226,132,116,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, 0.10 * S, 0, TAU); ctx.fill();
  }

  // --- nose: a soft cel shadow rather than a geometry wedge ---
  {
    const nx = xPix(0, -0.05), ny = yPix(-0.062);
    ctx.fillStyle = 'rgba(120,64,44,0.18)';
    ctx.beginPath(); ctx.ellipse(nx, ny, 0.031 * S, 0.023 * S, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(96,50,34,0.40)';
    ctx.lineWidth = 0.011 * S;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(nx, ny - 0.010 * S, 0.027 * S, 0.16 * PI, 0.84 * PI); ctx.stroke();
  }

  // --- mouth ---
  {
    const mx = xPix(0, -0.130), my = yPix(-0.130);
    const halfW = 0.066 * S;
    const lift = st.mouth * 0.05 * S;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(122,58,52,0.92)';
    ctx.lineWidth = 0.016 * S;
    ctx.beginPath();
    ctx.moveTo(mx - halfW, my - lift * 0.35);
    ctx.quadraticCurveTo(mx, my + lift, mx + halfW, my - lift * 0.35);
    ctx.stroke();
    if (st.mouth > 0.35) {
      // Slightly open grin for the wildcard personas.
      ctx.fillStyle = 'rgba(70,28,30,0.92)';
      ctx.beginPath();
      ctx.moveTo(mx - halfW * 0.86, my - lift * 0.30);
      ctx.quadraticCurveTo(mx, my + lift * 1.5, mx + halfW * 0.86, my - lift * 0.30);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,252,248,0.95)';
      ctx.fillRect(mx - halfW * 0.70, my - lift * 0.32, halfW * 1.40, 0.017 * S);
    } else {
      ctx.strokeStyle = 'rgba(255,225,210,0.28)';
      ctx.lineWidth = 0.010 * S;
      ctx.beginPath();
      ctx.moveTo(mx - halfW * 0.70, my + lift * 0.50 + 0.020 * S);
      ctx.quadraticCurveTo(mx, my + lift + 0.029 * S, mx + halfW * 0.70, my + lift * 0.50 + 0.020 * S);
      ctx.stroke();
    }
  }

  // --- eyes + brows ---
  for (const s of [-1, 1]) {
    const ex = xPix(s * 0.125, 0.025), ey = yPix(0.025);
    const rx = 0.070 * st.eye * S;
    const ry = 0.060 * st.eye * S;

    // lid shadow
    ctx.fillStyle = 'rgba(120,66,46,0.15)';
    ctx.beginPath(); ctx.ellipse(ex, ey - ry * 0.52, rx * 1.02, ry * 0.72, 0, 0, TAU); ctx.fill();

    // sclera
    ctx.fillStyle = '#fffaf4';
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU); ctx.fill();

    // iris
    const ig = ctx.createRadialGradient(ex, ey - ry * 0.15, ry * 0.10, ex, ey, rx * 0.62);
    ig.addColorStop(0, irisLit);
    ig.addColorStop(0.62, iris);
    ig.addColorStop(1, irisDeep);
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.ellipse(ex, ey, rx * 0.60, ry * 0.74, 0, 0, TAU); ctx.fill();

    // pupil
    ctx.fillStyle = '#120e14';
    ctx.beginPath(); ctx.ellipse(ex, ey, rx * 0.28, ry * 0.40, 0, 0, TAU); ctx.fill();

    // catchlights
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(ex - rx * 0.30, ey - ry * 0.34, rx * 0.19, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(ex + rx * 0.30, ey + ry * 0.30, rx * 0.10, 0, TAU); ctx.fill();

    // upper lash line
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = ry * 0.34;
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 1.06 * PI, 1.94 * PI); ctx.stroke();

    // lower lid
    ctx.strokeStyle = 'rgba(150,90,70,0.32)';
    ctx.lineWidth = ry * 0.16;
    ctx.beginPath(); ctx.ellipse(ex, ey, rx * 0.96, ry * 0.96, 0, 0.12 * PI, 0.88 * PI); ctx.stroke();

    // brow — the tilt is what gives each persona its expression
    const bxx = xPix(s * 0.128, 0.115), byy = yPix(0.115);
    const halfB = 0.062 * S;
    const innerX = bxx - s * halfB;
    const outerX = bxx + s * halfB;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.019 * S;
    ctx.beginPath();
    ctx.moveTo(innerX, byy + st.browTilt * halfB * 1.25);
    ctx.quadraticCurveTo((innerX + outerX) / 2, byy - halfB * 0.55, outerX, byy - st.browTilt * halfB * 0.60);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

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
      // A thresholded band (smoothstep) turned the rim into a dashed white
      // line along the sleeve and hem at real view size: wherever the band
      // edge crossed a facet or a bump-perturbed normal the term flicked
      // between on and off. Dropping the threshold and keeping a plain power
      // curve keeps the same shape but varies continuously, so the edge reads
      // as a soft light wrap instead of a dotted outline.
      float rim = pow(rimDot, uRimPower);
       gl_FragColor.rgb += uRimColor * rim * uRimStrength;
       #include <dithering_fragment>`
    );
  };
  material.needsUpdate = true;
}

// ===== Resource disposal =====
// Geometry and materials live on the GPU. Removing a mesh from the scene does
// not free them, so anything rebuilt at runtime (characters are rebuilt on
// every game load) has to be disposed explicitly or VRAM grows without bound.
function disposeSubtree(root) {
  root.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    const m = obj.material;
    if (!m) return;
    // Shared materials (outlines, wall/roof textures) are disposed more than
    // once across rebuilds; dispose() is idempotent in three, so that is safe.
    if (Array.isArray(m)) m.forEach(x => x.dispose());
    else m.dispose();
  });
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
let bubbleGeneration = 0;
let deathAnims = [];     // [{index, startTime, duration, baseY}]
let teamAnims = [];      // [{index, type: 'celebrate'|'defeat', startTime}]

// --- DOM refs ---
const canvas = document.getElementById('c');
const speakerFocusEl = document.getElementById('speaker-focus');
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
  if (skyUniforms) skyUniforms.uNightMix.value = preset.skyMix;
  if (skyUniforms && skyUniforms.uHaze) skyUniforms.uHaze.value.copy(scene.fog.color);
  setEnvMix(preset.skyMix, true);
  if (envGround) envGround.material.color.setHex(preset.ground);
  if (window.__houseWinMats) for (const m of window.__houseWinMats) m.opacity = preset.winOpacity;
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

// ===== Image-based lighting =====
// A tiny gradient dome is baked through PMREMGenerator into an env map, so the
// MeshStandardMaterial surfaces (ground, stone, timber, roofs) pick up sky tint
// and genuine ambient occlusion-ish falloff instead of flat hemisphere fill.
// MeshToonMaterial ignores scene.environment, so the cel-shaded characters are
// unaffected and keep their hand-tuned bands.
function initEnvironmentLighting() {
  if (!renderer || pmrem) return;
  pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  envScene = new THREE.Scene();
  const uniforms = { uMix: { value: isNight ? 1 : 0 }, uGain: { value: envIntensity } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uMix;
      uniform float uGain;
      varying vec3 vDir;
      void main() {
        vec3 sd = normalize(vDir);
        float h = clamp(sd.y, -1.0, 1.0);
        vec3 dayTop   = vec3(0.28, 0.50, 0.86);
        vec3 dayHor   = vec3(0.72, 0.82, 0.90);
        vec3 dayBot   = vec3(0.50, 0.48, 0.40);
        vec3 nightTop = vec3(0.010, 0.014, 0.045);
        vec3 nightHor = vec3(0.100, 0.075, 0.210);
        vec3 nightBot = vec3(0.020, 0.020, 0.040);
        vec3 top = mix(dayTop, nightTop, uMix);
        vec3 hor = mix(dayHor, nightHor, uMix);
        vec3 bot = mix(dayBot, nightBot, uMix);
        float g = pow(clamp(h, 0.0, 1.0), 0.42);
        vec3 col = mix(hor, top, g);
        col = mix(col, bot, smoothstep(0.0, -0.35, h));
        gl_FragColor = vec4(col * uGain, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat));
  envScene.userData.uniforms = uniforms;

  setEnvMix(uniforms.uMix.value, true);
}

let _lastEnvBake = 0;
function setEnvMix(mix, force = false) {
  if (!pmrem || !envScene) return;
  envScene.userData.uniforms.uMix.value = mix;
  // Baking is cheap at this resolution but not free — throttle during the
  // 600ms day/night crossfade, and always force the final bake.
  const now = performance.now();
  if (!force && now - _lastEnvBake < 90) return;
  _lastEnvBake = now;

  const rt = pmrem.fromScene(envScene, 0.04, 0.1, 100);
  if (envRT) envRT.dispose();
  envRT = rt;
  // The intensity gain is baked into the env map above rather than pushed onto
  // each material's envMapIntensity, so materials created later (characters,
  // confetti) inherit it automatically.
  scene.environment = rt.texture;
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
  const stoneTex = texLoader.load('./tex-stone.webp');
  stoneTex.anisotropy = maxAnisotropy;
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
  stoneTex.repeat.set(4, 4);

  const woodTex = texLoader.load('./tex-wood.webp');
  woodTex.anisotropy = maxAnisotropy;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 2);

  // Sky — ONE procedural dome drives everything: gradient, sun, clouds, stars
  // and moon. It replaces the old pair of domes (a gradient shader plus an
  // AI-generated panorama crossfaded by opacity), which made the stars and moon
  // read as decals pasted on a photograph and cost a 457KB texture download.
  skyUniforms = {
    uNightMix: { value: 0 },
    uTime: { value: 0 },
    // Working-space (linear) fog colour of the current phase. Driven from
    // NIGHT_PRESETS so the haze below the horizon, the scene fog and the
    // background can never drift apart into a seam during the crossfade.
    // Note: new THREE.Color(hex) already converts sRGB -> linear in r158.
    uHaze: { value: new THREE.Color(0x0a0a18) },
    // Matches the key DirectionalLight so the disc, the cloud lighting and the
    // cast shadows all agree on where the sun is.
    uSunDir: { value: new THREE.Vector3(5, 10, 5).normalize() },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uNightMix;
      uniform float uTime;
      uniform vec3 uHaze;
      uniform vec3 uSunDir;
      varying vec3 vDir;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
                   mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
        return v;
      }

      void main() {
        vec3 sd = normalize(vDir);
        float h = clamp(sd.y, -1.0, 1.0);
        float night = uNightMix;
        float day = 1.0 - night;

        // Gradient palettes (pushed slightly saturated — ACES desaturates)
        vec3 dayTop = vec3(0.28, 0.50, 0.86);
        vec3 dayHor = vec3(0.72, 0.82, 0.90);
        vec3 nightTop = vec3(0.010, 0.014, 0.045);
        vec3 nightHor = vec3(0.100, 0.075, 0.210);
        float grad = pow(clamp(h, 0.0, 1.0), 0.42);
        vec3 col = mix(mix(dayHor, nightHor, night), mix(dayTop, nightTop, night), grad);
        // Below-horizon haze — driven from NIGHT_PRESETS (see uHaze) so the
        // ground's far edge always dissolves into the current fog colour.
        col = mix(col, uHaze, smoothstep(0.0, -0.25, h));

        // Stars (night only) — dense cells, per-star position, size and twinkle
        vec2 suv = vec2(atan(sd.z, sd.x) / 6.2831853 + 0.5, asin(h) / 3.14159265 + 0.5);
        vec2 sg = suv * vec2(220.0, 110.0);
        vec2 cell = floor(sg);
        vec2 f = fract(sg);
        float sh = hash12(cell);
        vec2 spos = vec2(hash12(cell + 17.31), hash12(cell + 41.77));
        float star = smoothstep(0.085, 0.0, length(f - spos)) * step(0.90, sh);
        star *= 0.65 + 0.35 * sin(uTime * 2.2 + sh * 43.0);
        star *= smoothstep(0.02, 0.25, h) * night;
        col += vec3(0.9, 0.93, 1.0) * star * 0.85;

        // Sun disc + glow, plus warm scatter around the horizon
        float sdot = dot(sd, uSunDir);
        vec3 sunCol = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.96, 0.90), clamp(h, 0.0, 1.0));
        float disc = smoothstep(0.99955, 0.99988, sdot);
        float glow = pow(max(sdot, 0.0), 240.0) * 0.9 + pow(max(sdot, 0.0), 22.0) * 0.16;
        col += sunCol * (disc * 3.4 + glow) * day;

        // Cloud deck — one fbm layer projected onto a virtual plane, so it
        // converges to the horizon instead of tiling like a billboard.
        if (h > 0.004) {
          vec2 cuv = sd.xz / max(sd.y, 0.055) * 0.42 + vec2(uTime * 0.0035, uTime * 0.0011);
          float shape = fbm(cuv) * 0.72 + fbm(cuv * 2.7 + 11.3) * 0.38;
          float cover = smoothstep(0.46, 0.78, shape) * smoothstep(0.004, 0.10, h);
          if (cover > 0.001) {
            float ndl = clamp(dot(normalize(vec3(sd.x, 0.28, sd.z)), uSunDir) * 0.5 + 0.5, 0.0, 1.0);
            vec3 cDark = mix(vec3(0.36, 0.40, 0.50), vec3(0.035, 0.040, 0.070), night);
            vec3 cLit  = mix(vec3(0.99, 0.98, 0.96), vec3(0.16, 0.18, 0.30), night);
            vec3 cc = mix(cDark, cLit, pow(ndl, 1.15));
            cc += sunCol * pow(ndl, 6.0) * 0.35 * day;   // silver lining toward the sun
            col = mix(col, cc, cover * 0.92);
          }
        }

        // Moon + halo (night only) — hangs low over the village rooftops
        vec3 moonDir = normalize(vec3(-5.0, 1.9, 5.0));
        float mdot = dot(sd, moonDir);
        float moonDisc = smoothstep(0.9978, 0.9989, mdot);
        float shade = dot(normalize(sd - moonDir + 1e-6), normalize(vec3(0.6, -0.5, 0.0))) * 0.5 + 0.5;
        vec3 moonCol = mix(vec3(1.0, 0.98, 0.90), vec3(0.72, 0.74, 0.82), shade * 0.55);
        float halo = pow(clamp(mdot, 0.0, 1.0), 220.0) * 0.5 + pow(clamp(mdot, 0.0, 1.0), 40.0) * 0.12;
        col += (moonCol * moonDisc * 1.6 + vec3(0.75, 0.78, 1.0) * halo) * night;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyGeo = new THREE.SphereGeometry(40, 64, 32);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.renderOrder = -1;
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 9, 9);
  if (renderPass) { renderPass.scene = scene; renderPass.camera = camera; }

  // Hemispheric fill preserves form on faces and clothing instead of applying
  // the same flat brightness to every surface.
  amb = new THREE.HemisphereLight(0xdce8ff, 0x8c674a, 0.8);
  scene.add(amb);

  dir = new THREE.DirectionalLight(0xfff5e0, 0.85);
  // ~24 deg elevation: a late-afternoon key. The old 55 deg put the sun almost
  // overhead, which hid the disc above the frame in any near-horizontal view
  // and flattened every surface it lit.
  dir.position.set(5, 3.0, 5);
  dir.castShadow = true;
  const shadowMapSize = compactViewport ? 1024 : 2048;
  dir.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  dir.shadow.bias = -0.00025;
  dir.shadow.normalBias = 0.035;
  dir.shadow.radius = 3;
  dir.shadow.blurSamples = compactViewport ? 8 : 16;
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 32;
  // Wider than the old +-6 because a low sun throws much longer shadows.
  dir.shadow.camera.left = -9; dir.shadow.camera.right = 9;
  dir.shadow.camera.top = 9; dir.shadow.camera.bottom = -9;
  scene.add(dir);
  // The sky's sun disc reads the key light's direction so the visible sun and
  // the shadow-casting light can never disagree.
  if (skyUniforms && skyUniforms.uSunDir) skyUniforms.uSunDir.value.copy(dir.position).normalize();

  moonPoint = new THREE.PointLight(0x7080ff, 0, 20);
  moonPoint.position.set(-5, 6, 5);
  scene.add(moonPoint);

  candlePoint = new THREE.PointLight(0xFFD700, 1.5, 10);
  candlePoint.position.set(0, 1.42, 0);
  scene.add(candlePoint);

  // Rim/key light: cool blue from high to make characters pop from background
  const rimLight = new THREE.DirectionalLight(0x9fc4ff, 0.62);
  rimLight.position.set(-3, 8, -5);
  scene.add(rimLight);

  // 4 braziers standing on the dais deck at the rim of the council — they frame
  // each player from behind instead of crowding the table, and their unseen
  // side lights every coat and shoulder with warm bounce.
  const brazierMat = new THREE.MeshStandardMaterial({
    color: 0x6b4a2a, roughness: 0.5, metalness: 0.5,
    emissive: 0x341a0a, emissiveIntensity: 0.4,
  });
  const brazierEmber = new THREE.MeshStandardMaterial({ color: 0xff8c3a, emissive: 0xff5a12, emissiveIntensity: 1.8 });
  const brazierFlameMat = new THREE.MeshStandardMaterial({
    color: 0xffc46b, emissive: 0xff7a1e, emissiveIntensity: 2.2, transparent: true, opacity: 0.92,
  });
  // The bowl's cap. A closed cylinder has one, and in daylight — when the fire is
  // switched off — that cap was the brightest thing on the fixture: a pale disc on
  // a fat stem, which from the 39 degree camera read as a mushroom. Proportions had
  // to change, not just the colour: a wide shallow bowl loses its walls at that
  // angle and is *only* a disc. So the fixture is a squat pot on a plinth that is
  // wider than the pot — the base is the widest part from above, and the vessel's
  // lid is an ash bed instead of a lid.
  const brazierAsh = new THREE.MeshStandardMaterial({
    color: 0x3e352c, roughness: 1, metalness: 0,
  });
  // Track brazier components so we can toggle on/off for day/night
  const brazierEmbers = [];
  const brazierLights = [];
  // The deck is at 0.42. Plinth 0.42–0.52 (0.48 wide), pot 0.50–0.74 (0.34 wide).
  const stemGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.10, 12);
  const bowlGeo = new THREE.CylinderGeometry(0.17, 0.145, 0.24, 14);
  for (let i = 0; i < 4; i++) {
    const a = (i + 0.5) * (TAU / 4) + PI / 4; // offset 45° so they sit between character slots
    const bx = cos(a) * (R + 0.45);
    const bz = sin(a) * (R + 0.45);
    // Bowl
    // Material order on a CylinderGeometry is side, top, bottom: only the top
    // face becomes the ash bed, so the bowl's walls keep the patinated metal.
    const bowl = new THREE.Mesh(bowlGeo, [brazierMat, brazierAsh, brazierMat]);
    bowl.position.set(bx, 0.62, bz);
    bowl.castShadow = true;
    scene.add(bowl);
    // Plinth — the bowl's foot sinks 2 cm into it, so no two faces are coplanar.
    const stem = new THREE.Mesh(stemGeo, brazierMat);
    stem.position.set(bx, 0.47, bz);
    stem.castShadow = true;
    scene.add(stem);
    // Ember bed + a short flame so the bowl reads as fire, not a red pin
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 7), brazierEmber);
    ember.position.set(bx, 0.72, bz);
    scene.add(ember);
    brazierEmbers.push(ember);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), brazierFlameMat);
    fire.position.set(bx, 0.86, bz);
    scene.add(fire);
    brazierEmbers.push(fire);
    // Point light — the warm fill now that the fixtures are above the deck
    const bl = new THREE.PointLight(0xff7a30, 1.15, 4.6, 1.6);
    bl.position.set(bx, 0.95, bz);
    scene.add(bl);
    brazierLights.push(bl);
  }
  // Expose for day/night toggling
  window.__brazierEmbers = brazierEmbers;
  window.__brazierLights = brazierLights;

  // Floor — stone with darker outer ring for natural vignette
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, color: 0xc0b49b })
  );
  floor.rotation.x = -PI / 2; floor.position.y = -0.6; floor.receiveShadow = true;
  scene.add(floor);

  // Council dais — two tiers of stone that the table and every player pedestal
  // actually stand on. Before this the pedestals (bottom y = 0.42) hovered a
  // clear metre above the ground plane at y = -0.6, so the whole table read as
  // a floating chess set no matter how good the lighting got.
  const daisTexA = stoneTex.clone();
  daisTexA.needsUpdate = true;
  daisTexA.wrapS = daisTexA.wrapT = THREE.RepeatWrapping;
  daisTexA.repeat.set(9, 9);
  const daisTexB = stoneTex.clone();
  daisTexB.needsUpdate = true;
  daisTexB.wrapS = daisTexB.wrapT = THREE.RepeatWrapping;
  daisTexB.repeat.set(6, 6);
  const daisMatA = new THREE.MeshStandardMaterial({
    map: daisTexA, color: 0xe8dcc2, roughness: 0.93,
    bumpMap: daisTexA, bumpScale: 0.03,
  });
  const daisMatB = new THREE.MeshStandardMaterial({
    map: daisTexB, color: 0xe2d6bb, roughness: 0.91,
    bumpMap: daisTexB, bumpScale: 0.022,
  });
  // buildCharacter skins each figure's seat step with the same stone: a
  // flat-coloured disc at the dais's nominal tint renders about twice as bright
  // as the textured dais once the sun hits a horizontal face, so the seat glared
  // as a white plate. Exposing the base texture lets the seat clone it with its
  // own repeat (and its own material, so the team-colour flash can't paint the
  // whole dais).
  window.__stoneTex = stoneTex;
  const daisA = new THREE.Mesh(new THREE.CylinderGeometry(4.28, 4.40, 0.6, 96), daisMatA);
  daisA.position.y = -0.3;
  // castShadow is deliberately off: the dais sits flush on the floor (no gap to
  // show), and a large flat cap that both casts and receives under VSM shadows
  // self-shadows across its whole top face, which turned the dais into a black
  // disc that read darker than the ground around it.
  daisA.receiveShadow = true; daisA.castShadow = false;
  scene.add(daisA);

  const daisB = new THREE.Mesh(new THREE.CylinderGeometry(3.94, 4.06, 0.42, 96), daisMatB);
  daisB.position.y = 0.21;
  daisB.receiveShadow = true; daisB.castShadow = false;
  scene.add(daisB);

  // Gold inlay where the upper tier meets the lower one — the eye needs one
  // deliberate line to read the step as architecture instead of a stack.
  const daisTrim = new THREE.Mesh(
    new THREE.TorusGeometry(3.95, 0.017, 8, 120),
    new THREE.MeshStandardMaterial({ color: 0xe8c468, metalness: 0.6, roughness: 0.34 })
  );
  daisTrim.position.y = 0.414; daisTrim.rotation.x = -PI / 2;
  scene.add(daisTrim);

  // Grass tufts — one instanced draw instead of 60 separate cones. The tuft
  // geometry is a unit-height cone, so the previous per-tuft random height
  // becomes a per-instance Y scale.
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.9 });
  const grassCount = 60;
  const grassGeo = new THREE.ConeGeometry(0.04, 1, 4);
  const grassTufts = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < grassCount; i++) {
      const a = Math.random() * TAU;
      const r = 4 + Math.random() * 8;
      const h = 0.08 + Math.random() * 0.12;
      dummy.position.set(cos(a) * r, -0.55, sin(a) * r);
      dummy.rotation.set(Math.random() * 0.3, Math.random() * TAU, Math.random() * 0.3);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      grassTufts.setMatrixAt(i, dummy.matrix);
    }
    grassTufts.instanceMatrix.needsUpdate = true;
    grassTufts.frustumCulled = false;
    scene.add(grassTufts);
  }

  // Table
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(TR, TR, 0.12, 48),
    new THREE.MeshStandardMaterial({
      map: woodTex, color: 0xc2a077, roughness: 0.58, metalness: 0.04,
      bumpMap: woodTex, bumpScale: 0.024,
    })
  );
  // Same VSM self-shadow problem as the dais: the table top receives the
  // players' and cards' shadows, but must not cast onto itself.
  tableTop.position.y = 0.79; tableTop.receiveShadow = true; tableTop.castShadow = false;
  scene.add(tableTop);

  const tableRing = new THREE.Mesh(
    new THREE.RingGeometry(TR - 0.012, TR + 0.022, 96),
    new THREE.MeshStandardMaterial({ color: 0xe8c468, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.3 })
  );
  tableRing.position.y = 0.83; tableRing.rotation.x = -PI / 2;
  scene.add(tableRing);

  // Central plinth: the table now sits at waist height on the dais instead of
  // hovering below the players' feet, so it needs a real column under it.
  const tablePed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.82, 0.31, 40),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.72, metalness: 0.05 })
  );
  tablePed.position.y = 0.575; tablePed.castShadow = true;
  scene.add(tablePed);

  // Candle — a brass dish plus a slender taper. The previous stubby cylinder
  // (0.3 tall, cold 0xE8D8B8) read as a grey tub from the 39-degree camera:
  // too short to have a silhouette and too pale to read as wax. A 45cm taper on
  // a dish is unmistakable at any distance and gives the warmth a focal point.
  const candleDish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.135, 0.022, 28),
    new THREE.MeshStandardMaterial({ color: 0xd8a94e, metalness: 0.72, roughness: 0.32 })
  );
  candleDish.position.y = 0.861;
  candleDish.castShadow = true; candleDish.receiveShadow = true;
  scene.add(candleDish);
  // Drip pan lip — one thin ring is enough to sell stamped brass
  const candleLip = new THREE.Mesh(
    new THREE.TorusGeometry(0.112, 0.011, 8, 36),
    new THREE.MeshStandardMaterial({ color: 0xe8c468, metalness: 0.7, roughness: 0.28 })
  );
  candleLip.position.y = 0.872; candleLip.rotation.x = -PI / 2;
  scene.add(candleLip);

  const candlePts = [
    new THREE.Vector2(0.050, 0.000),
    new THREE.Vector2(0.048, 0.020),
    new THREE.Vector2(0.046, 0.120),
    new THREE.Vector2(0.045, 0.260),
    new THREE.Vector2(0.044, 0.360),
    new THREE.Vector2(0.045, 0.418),
    new THREE.Vector2(0.036, 0.428),
    new THREE.Vector2(0.022, 0.421),
  ];
  const candle = new THREE.Mesh(
    new THREE.LatheGeometry(candlePts, 26),
    new THREE.MeshStandardMaterial({ color: 0xf8eed8, roughness: 0.72, metalness: 0.0, emissive: 0xffc78a, emissiveIntensity: 0.07 })
  );
  candle.position.y = 0.872;
  candle.castShadow = true;
  scene.add(candle);
  // Wick — a couple of centimetres of near-black that ties flame to wax
  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.008, 0.04, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2119, roughness: 0.9 })
  );
  wick.position.y = 1.300;
  scene.add(wick);

  // Flame — an outer teardrop plus a hot core child. Emissive intensity is the
  // day/night knob (see NIGHT_PRESETS.flame), so the cone has to stay a
  // MeshStandardMaterial; the core inherits the parent's scale and flicker.
  flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.042, 0.165, 14),
    new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff7a12, emissiveIntensity: 0.8 })
  );
  flame.position.y = 1.395;
  const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.020, 0.088, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xffe08a, emissiveIntensity: 1.6 })
  );
  flameCore.position.y = -0.034;
  flame.add(flameCore);
  scene.add(flame);

  // Candle flame glow sprite — softens the cone into a real light source
  flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xffb84d, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  flameGlow.scale.set(0.7, 0.7, 1);
  flameGlow.position.set(0, 1.45, 0);
  scene.add(flameGlow);

  initParticles();
  buildEnvironment();
  initEnvironmentLighting();
}

// ===== Village Environment (silhouettes, ground, mist) =====
// The ground disc has to outrun the day fog (fogFar 100) or its rim stays
// visible when zoomed out. The grass tiling is derived from the radius so the
// blades keep their world-space size instead of stretching with the disc.
const GROUND_RADIUS = 140;
const GROUND_CANVAS = 1024;
const GROUND_TILES = Math.round(12 * GROUND_RADIUS / 46);   // ~4m per tile

function paintGroundCanvas(ctx, tex, grassImg) {
  const S = GROUND_CANVAS;
  if (grassImg) {
    const step = S / GROUND_TILES;
    for (let ty = 0; ty < GROUND_TILES; ty++) for (let tx = 0; tx < GROUND_TILES; tx++) {
      ctx.drawImage(grassImg, tx * step, ty * step, step, step);
    }
  } else {
    ctx.fillStyle = '#86905f';
    ctx.fillRect(0, 0, S, S);
  }
  // Gentle radial darkening toward the horizon
  ctx.globalCompositeOperation = 'multiply';
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, '#e8e8e8');
  grad.addColorStop(0.75, '#b8b8b8');
  grad.addColorStop(1, '#989898');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'source-over';
  tex.needsUpdate = true;
}

function buildEnvironment() {
  // Outer ground — extends far past the stone plaza so the horizon is a
  // fog-blended tree line instead of a floating disc edge
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = GROUND_CANVAS; groundCanvas.height = GROUND_CANVAS;
  const gctx = groundCanvas.getContext('2d');
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  paintGroundCanvas(gctx, groundTex, null); // flat fallback until grass loads
  const grassImg = new Image();
  grassImg.onload = () => paintGroundCanvas(gctx, groundTex, grassImg);
  grassImg.src = './tex-grass.webp';

  // Radius must exceed the day fog distance (fogFar 100), otherwise the disc's
  // rim is still visible when zoomed out and cuts a faint arc across the sky.
  envGround = new THREE.Mesh(
    new THREE.CircleGeometry(GROUND_RADIUS, 64),
    new THREE.MeshStandardMaterial({
      color: 0xdcdcd2, roughness: 1, map: groundTex,
    })
  );
  envGround.rotation.x = -PI / 2;
  envGround.position.y = -0.63;
  scene.add(envGround);

  const envTexLoader = new THREE.TextureLoader();
  const cottageTex = envTexLoader.load('./tex-cottage.webp');
  cottageTex.colorSpace = THREE.SRGBColorSpace;
  const roofTex = envTexLoader.load('./tex-roof.webp');
  roofTex.colorSpace = THREE.SRGBColorSpace;
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
  roofTex.repeat.set(3, 1);

  const pineMats = [0x2d4a34, 0x29452f, 0x33503a].map(col =>
    new THREE.MeshStandardMaterial({ color: col, roughness: 1 }));
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2c1e, roughness: 0.95 });
  const wallMat = new THREE.MeshStandardMaterial({ map: cottageTex, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.9 });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.8 });
  const winFrameMat = new THREE.MeshBasicMaterial({ color: 0x2a1c12 });
  window.__houseWinMats = [winMat];

  // Pines are by far the most numerous props (60 trees x 4 parts = 240 meshes
  // before), so they are drawn with instancing instead: the three foliage tiers
  // are merged into one geometry, and each tint gets a single InstancedMesh.
  // Combined with one shared trunk mesh that is 4 draw calls for every tree.
  const PINE_TIERS = [[0.5, 0.7, 0.55], [0.4, 0.65, 0.95], [0.27, 0.55, 1.3]];
  const pineFoliageGeo = mergeGeometries(PINE_TIERS.map(([r, h, y]) => {
    const g = new THREE.ConeGeometry(r, h, 7);
    g.translate(0, y, 0);
    return g;
  }));
  const pineTrunkGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6);
  pineTrunkGeo.translate(0, 0.2, 0);
  const pineMatsByTint = pineMats.map(() => []);
  const pineTrunkMatrices = [];
  const pinePlacements = [];
  // sxz (width) and sy (height) vary independently. Uniform scaling made all 60
  // trees identical clones; decoupling them yields slim spires and broad bushy
  // trees from one geometry, which reads as a real forest at no extra draw cost.
  function addPine(a, r, scale, tint) {
    pinePlacements.push({
      a, r, scale, tint,
      rotY: Math.random() * TAU,
      sxz: 0.72 + Math.random() * 0.56,
      sy: 0.82 + Math.random() * 0.46,
    });
  }
  function buildPineInstances() {
    const dummy = new THREE.Object3D();
    for (const p of pinePlacements) {
      dummy.position.set(cos(p.a) * p.r, -0.6, sin(p.a) * p.r);
      dummy.rotation.set(0, p.rotY, 0);
      dummy.scale.set(p.scale * p.sxz, p.scale * p.sy, p.scale * p.sxz);
      dummy.updateMatrix();
      pineMatsByTint[p.tint].push(dummy.matrix.clone());
      pineTrunkMatrices.push(dummy.matrix.clone());
    }
    const add = (geo, mat, matrices) => {
      if (!matrices.length) return;
      const im = new THREE.InstancedMesh(geo, mat, matrices.length);
      matrices.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      // Instances ring the whole village, so a single bounding sphere is a poor
      // fit — skipping the cull costs less than a wrong mid-frame pop.
      im.frustumCulled = false;
      scene.add(im);
    };
    pineMats.forEach((mat, i) => add(pineFoliageGeo, mat, pineMatsByTint[i]));
    add(pineTrunkGeo, trunkMat, pineTrunkMatrices);
  }

  // Gable roof built from real geometry: two sloped slabs with an eaves
  // overhang, closed at both ends by gable triangles. The previous roof was a
  // 4-sided cone, which read as a plain pyramid block from every angle.
  const ROOF_OVERHANG = 0.22;
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.85 });
  function buildGableRoof(w, h, d, roofH) {
    const roofGroup = new THREE.Group();
    const halfSpan = w / 2 + ROOF_OVERHANG;
    const slopeLen = Math.sqrt(halfSpan * halfSpan + roofH * roofH);
    const angle = Math.atan2(roofH, halfSpan);
    for (const s of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.08, d + ROOF_OVERHANG * 2), roofMat);
      slab.position.set(s * halfSpan / 2, roofH / 2, 0);
      slab.rotation.z = -s * angle;
      slab.castShadow = true;
      roofGroup.add(slab);
    }
    // Gable ends — the triangular wall filling the space under each slope.
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, roofH);
    shape.closePath();
    const gableGeo = new THREE.ShapeGeometry(shape);
    // ShapeGeometry emits UVs in shape-space, which would clamp the cottage
    // texture across the gable. Remap them to a clean 0..1 range.
    {
      const pos = gableGeo.attributes.position;
      const uv = gableGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / roofH);
      }
      uv.needsUpdate = true;
    }
    for (const s of [-1, 1]) {
      const end = new THREE.Mesh(gableGeo, wallMat);
      end.position.set(0, 0, s * (d / 2));
      if (s < 0) end.rotation.y = PI;
      end.castShadow = true;
      roofGroup.add(end);
    }
    return roofGroup;
  }

  function buildHouse(w, h, d, chimney) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2; g.add(body);
    body.castShadow = true;

    const roofH = h * 0.66;
    const roof = buildGableRoof(w, h, d, roofH);
    roof.position.y = h;
    g.add(roof);

    if (chimney) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), roofMat);
      ch.position.set(w * 0.28, h + h * 0.42, 0); g.add(ch);
    }
    // Door — gives the facade a focal point and a sense of scale
    const door = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.22, h * 0.44), doorMat);
    door.position.set(0, h * 0.22, d / 2 + 0.008); g.add(door);
    // Small framed windows — warm dots of life, not glowing billboards
    for (const wx of [-w * 0.24, w * 0.24]) {
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.19, h * 0.26), winFrameMat);
      frame.position.set(wx, h * 0.52, d / 2 + 0.009); g.add(frame);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.14, h * 0.2), winMat);
      win.position.set(wx, h * 0.52, d / 2 + 0.011); g.add(win);
    }
    return g;
  }

  // Houses — close enough to stay anchored in front of the tree line
  const houses = [
    { a: 0.55, r: 18.0, w: 2.4, h: 1.9, d: 2.0, ch: false },
    { a: 1.75, r: 20.0, w: 3.0, h: 2.3, d: 2.5, ch: true },
    { a: 3.05, r: 18.5, w: 2.2, h: 1.7, d: 1.9, ch: false },
    { a: 4.35, r: 20.5, w: 2.8, h: 2.1, d: 2.3, ch: true },
    { a: 5.50, r: 18.0, w: 2.0, h: 1.6, d: 1.8, ch: false },
    // Second row, tucked into the gaps of the first. Five houses left the
    // horizon looking like one lone cottage decided to watch the council; nine
    // reads as a village that surrounds it, and the depth staggering keeps the
    // roofline from landing on a single arc.
    { a: 1.15, r: 16.5, w: 2.1, h: 1.7, d: 1.9, ch: false },
    { a: 2.40, r: 21.5, w: 2.6, h: 2.0, d: 2.2, ch: false },
    { a: 3.70, r: 17.0, w: 2.3, h: 1.8, d: 1.9, ch: true },
    { a: 4.92, r: 22.0, w: 2.9, h: 2.2, d: 2.4, ch: false },
  ];
  for (const hs of houses) {
    const house = buildHouse(hs.w, hs.h, hs.d, hs.ch);
    house.position.set(cos(hs.a) * hs.r, -0.6, sin(hs.a) * hs.r);
    house.lookAt(0, -0.6, 0);
    scene.add(house);
    // Record chimney-top world positions for the smoke particle columns
    if (hs.ch) {
      const top = new THREE.Vector3(hs.w * 0.28, hs.h + hs.h * 0.42 + 0.35, 0);
      house.updateMatrixWorld(true);
      house.localToWorld(top);
      initSmokeColumn(top);
    }
  }

  // Inner pines — scattered between plaza edge and houses
  let placed = 0, guard = 0;
  while (placed < 16 && guard++ < 300) {
    const a = Math.random() * TAU;
    const r = 15.5 + Math.random() * 6;
    if (houses.some(hs => Math.abs(((a - hs.a + PI * 3) % TAU) - PI) < 0.32 && Math.abs(r - hs.r) < 3.5)) continue;
    addPine(a, r, 0.6 + Math.random() * 0.7, placed % pineMats.length);
    placed++;
  }

  // Forest ring — a dense tree line that masks the ground's fade-out zone
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * TAU + Math.random() * 0.14;
    const r = 24 + Math.random() * 8;
    addPine(a, r, 1.3 + Math.random() * 1.1, i % pineMats.length);
  }
  buildPineInstances();

  // Standing stones — a broken ring at the plaza's outer edge. The band
  // between the dais (r 4.3) and the nearest pines (r 15.5) was a flat empty
  // skirt, so the council looked like it had been dropped in a field. The ring
  // gives that gap a silhouette, a scale reference and something for the low
  // key light to rake across.
  const megalithTex = new THREE.TextureLoader().load('./tex-stone.webp');
  megalithTex.wrapS = megalithTex.wrapT = THREE.RepeatWrapping;
  megalithTex.repeat.set(2, 3);
  // A pale albedo is deliberate: the key light only reaches 24° so every
  // vertical face picks up little more than hemisphere fill, and a mid-grey
  // stone authored at 0xa7 read as a black slab.
  const megalithMat = new THREE.MeshStandardMaterial({
    map: megalithTex, color: 0xe9dfcd, roughness: 0.95,
    bumpMap: megalithTex, bumpScale: 0.05,
  });
  for (let i = 0; i < 9; i++) {
    // Uneven spacing and two collapsed slots keep the ring hand-set ruins
    // instead of a machined fence.
    const a = (i / 9) * TAU + (Math.random() - 0.5) * 0.2;
    const r = 8.4 + (Math.random() - 0.5) * 0.7;
    const ruined = i === 2 || i === 6;
    const h = ruined ? 0.32 + Math.random() * 0.22 : 1.15 + Math.random() * 0.95;
    const w = 0.28 + Math.random() * 0.1;
    // Tapered hexagonal prisms instead of boxes — a box at this size reads as
    // a crate, and the six facets give the low sun somewhere to break.
    const st = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.82, w, h, 6), megalithMat);
    st.position.set(cos(a) * r, -0.6 + h / 2, sin(a) * r);
    st.rotation.set(
      (Math.random() - 0.5) * 0.05,
      Math.random() * TAU,
      (Math.random() - 0.5) * 0.1
    );
    st.castShadow = true; st.receiveShadow = true;
    scene.add(st);
    // Fallen rubble at the foot of every stone
    const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.1, 0), megalithMat);
    rubble.position.set(cos(a) * (r - 0.5), -0.55, sin(a) * (r - 0.5));
    rubble.rotation.set(Math.random(), Math.random(), Math.random());
    rubble.scale.y = 0.5;
    rubble.castShadow = true; rubble.receiveShadow = true;
    scene.add(rubble);
  }
  // Ground mist — soft sprites drifting slowly around the plaza
  const mistTex = makeMistTexture();
  for (let i = 0; i < 6; i++) {
    const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mistTex, transparent: true, opacity: 0, depthWrite: false,
    }));
    const sx = 9 + Math.random() * 4, sy = 2.5 + Math.random() * 1.5;
    sp2.scale.set(sx, sy, 1);
    sp2.userData = {
      a0: Math.random() * TAU,
      r: 6 + Math.random() * 6.5,
      y: 0.1 + Math.random() * 0.5,
      speed: (Math.random() > 0.5 ? 1 : -1) * (0.008 + Math.random() * 0.012),
      op: 0.05 + Math.random() * 0.04,
    };
    mistSprites.push(sp2);
    scene.add(sp2);
  }
}

function makeSmokeTexture() {
  // Denser, lumpier blob than the mist texture — smoke needs real presence
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const lumps = [[64, 70, 44], [44, 60, 30], [86, 58, 28], [58, 46, 26]];
  for (const [x, y, r] of lumps) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(235,235,242,0.72)');
    grad.addColorStop(0.55, 'rgba(225,225,235,0.34)');
    grad.addColorStop(0.85, 'rgba(220,220,230,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function initSmokeColumn(base) {
  // A looping column of soft puffs rising from a chimney
  const tex = makeSmokeTexture();
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xd0d0da, transparent: true, opacity: 0, depthWrite: false,
    }));
    sp.userData = {
      base, phase: i / 6,
      driftX: (Math.random() - 0.5) * 0.9, driftZ: (Math.random() - 0.5) * 0.9,
      op: 0.55 + Math.random() * 0.15,
    };
    smokePuffs.push(sp);
    scene.add(sp);
  }
}

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(220,225,240,0.30)');
  grad.addColorStop(0.5, 'rgba(200,210,230,0.12)');
  grad.addColorStop(1, 'rgba(200,210,230,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function updateEnvironment(t) {
  if (skyUniforms) skyUniforms.uTime.value = t;
  for (const m of mistSprites) {
    const ud = m.userData;
    const a = ud.a0 + t * ud.speed;
    m.position.set(cos(a) * ud.r, ud.y, sin(a) * ud.r);
    const target = isNight ? ud.op : 0.02;
    m.material.opacity += (target - m.material.opacity) * 0.03;
  }
  // Drifting clouds now live in the sky shader itself (see buildSky), so the
  // old billboard sprites are gone. Chimney smoke — always on, dimmer at night.
  for (const sm of smokePuffs) {
    const ud = sm.userData;
    const cycle = (t * 0.09 + ud.phase) % 1; // 0 birth → 1 gone
    sm.position.set(
      ud.base.x + ud.driftX * cycle + sin(t * 0.8 + ud.phase * 9) * 0.15 * cycle,
      ud.base.y + cycle * 2.8,
      ud.base.z + ud.driftZ * cycle,
    );
    const s = 0.35 + cycle * 1.9;
    sm.scale.set(s, s * 0.8, 1);
    // Quick fade-in keeps the column attached to the chimney; slow fade-out
    const target = Math.min(cycle * 8, 1) * (1 - cycle) * ud.op * (isNight ? 0.45 : 1);
    sm.material.opacity += (target - sm.material.opacity) * 0.1;
  }
  if (flameGlow) {
    const target = isNight ? 0.55 : 0;
    const base = (flameGlow.userData.base ?? 0) + (target - (flameGlow.userData.base ?? 0)) * 0.05;
    flameGlow.userData.base = base;
    flameGlow.material.opacity = base * (0.85 + 0.15 * sin(t * 9.3));
  }
}


function initParticles() {
  // ---- Fireflies (night) ----
  const ffCount = 36;
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(ffCount * 3);
  const ffPhase = new Float32Array(ffCount);
  const ffRadius = new Float32Array(ffCount);
  for (let i = 0; i < ffCount; i++) {
    const a = Math.random() * TAU;
    const r = 3.5 + Math.random() * 7;
    ffPos[i*3] = cos(a) * r;
    ffPos[i*3+1] = 1.0 + Math.random() * 2.2;
    ffPos[i*3+2] = sin(a) * r;
    ffPhase[i] = Math.random() * TAU;
    ffRadius[i] = r;
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({
    color: 0xFFE066, size: 0.13, transparent: true, opacity: 0,
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

// Six identical models on a perfect circle at one height read as six copies of
// a single figure, not as a village. These offsets are fixed per seat (not
// random) so a replay always renders the same crowd.
const FIG_JITTER = [
  { dr:  0.00, k: 1.000, yaw:  0.000 },
  { dr: -0.12, k: 0.974, yaw:  0.055 },
  { dr:  0.14, k: 1.028, yaw: -0.045 },
  { dr: -0.06, k: 0.986, yaw:  0.065 },
  { dr:  0.10, k: 1.038, yaw: -0.060 },
  { dr: -0.14, k: 1.014, yaw:  0.030 },
];
function sp(i) {
  const a = (i / 6) * TAU - PI / 2;
  const r = R + FIG_JITTER[i % 6].dr;
  return [cos(a) * r, SH, sin(a) * r];
}
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

// A tapered capsule spanning two points — the primitive every limb segment is
// built from, so joints can actually bend instead of one rigid tube.
const _boneUp = new THREE.Vector3(0, 1, 0);
function bone(from, to, r, mat, outlineScale = 1) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const m = new THREE.Mesh(
    new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 2), 6, 14),
    mat
  );
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(_boneUp, dir.clone().normalize());
  m.castShadow = true;
  if (outlineScale > 1) addOutline(m, outlineScale);
  return m;
}

function buildCharacter(player, index){
  const g=new THREE.Group();
  const fj = FIG_JITTER[index % 6];
  const pos = sp(index);
  // Height variation scales the whole figure, which moves the foot point: lift
  // the group by exactly what the scale would sink or float it, so the seat
  // plinth stays welded to the dais at every height.
  const FOOT_LOCAL = -0.18;
  g.position.set(pos[0], SH + FOOT_LOCAL * (1 - fj.k), pos[2]);
  g.scale.setScalar(fj.k);
  const ang=sa(index); g.rotation.y=-ang-PI/2+fj.yaw;
  scene.add(g);
  // Rig bookkeeping (see "=== Rig ===" below): resting hip lean, the persona
  // prop and the parts that belong to the legs rather than the upper body.
  let baseLean = 0;
  let prop = null;
  const lowerParts = [];

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
  // Apply cel rim to body materials (skin & hair excluded — soft / dark surfaces).
  // The power is the band width now that the shader has no threshold: rim falls
  // off as pow(1 - N·V, power), so 6.0 keeps the highlight to the last ~15
  // degrees before the silhouette instead of washing the whole side of the coat.
  applyToonRim(bodyMat, 0xfff0d0, 6.0, 0.34);
  applyToonRim(accMat, 0xffe0a0, 5.5, 0.32);

  // === Torso ===
  // Taller than the original 0.55 so the head stops dominating the silhouette,
  // and finished with a neck + collar so the head no longer sinks into the body.
  // Lathed coat profile — flared hem, nipped waist, square shoulder line.
  // The straight cylinder was the single biggest reason the figures read as
  // clay tubes: no waist, no hem, no shoulder.
  const coatPts = [
    new THREE.Vector2(0.001, -TORSO_H * 0.5),
    new THREE.Vector2(0.370, -TORSO_H * 0.5),
    new THREE.Vector2(0.382, -TORSO_H * 0.43),
    new THREE.Vector2(0.330, -TORSO_H * 0.29),
    new THREE.Vector2(0.296, -TORSO_H * 0.10),
    new THREE.Vector2(0.291, TORSO_H * 0.07),
    new THREE.Vector2(0.315, TORSO_H * 0.27),
    new THREE.Vector2(0.332, TORSO_H * 0.43),
    new THREE.Vector2(0.298, TORSO_H * 0.50),
    new THREE.Vector2(0.001, TORSO_H * 0.50),
  ];
  const torso=new THREE.Mesh(
    new THREE.LatheGeometry(coatPts, 36),
    bodyMat
  );
  torso.position.y=TORSO_Y; torso.castShadow=true; g.add(torso);
  // No outline shell on the torso: a uniform scale of a waisted lathe cuts the
  // dark outline back through the coat wherever the profile is concave, which
  // showed up as black blotches and a floating diamond on the chest.

  // No epaulettes. A dark cap on the shoulder line lands exactly where the eye
  // expects a neckline, and from the 39° camera it read as a hole punched in
  // the chest — the same failure mode as the old standing collar. The chest
  // buttons below already carry the tailoring cue; a shoulder needs nothing.
  // Neck — bridges torso top to head, removing the old bare intersection
  const neck=new THREE.Mesh(
    new THREE.CylinderGeometry(0.135,0.165,0.24,16),
    skinMat
  );
  neck.position.y=NECK_Y; neck.castShadow=true; g.add(neck);

  // Shoulders — slight width
  // Shoulder yoke — wider and flatter than before so the figure has a real
  // top line for the arms to hang from.
  const shoulders=new THREE.Mesh(
    new THREE.SphereGeometry(0.3,28,18),
    bodyMat
  );
  shoulders.position.y=0.685; shoulders.scale.set(1.12,0.44,0.86); shoulders.castShadow=true; g.add(shoulders);
  addOutline(shoulders, 1.025);

  // Shoulder caps — the sleeve used to begin as a bare capsule stub floating
  // beside the torso.
  for (const s of [-1, 1]) {
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.118,22,16),bodyMat);
    cap.position.set(s*0.315,0.645,0); cap.castShadow=true; g.add(cap);
  }

  // No standing collar. Every version of it — flared or hugging — read as a
  // cone of shame around the neck from this camera: a ring the figure is
  // wearing rather than a garment edge. The neck and shoulder yoke already meet
  // cleanly, so the silhouette is better with nothing there at all.
  // Buttons — three brass studs down the coat front. From above they are what
  // tells the eye the coat is tailored instead of a turned cone.

  const buttonMat = new THREE.MeshToonMaterial({ color: 0xd8b468, gradientMap: TOON_GRADIENT });
  buttonMat.dithering = true;
  // Interpolates the real coat profile, so the studs sit on the cloth instead
  // of floating in front of the nipped waist.
  const coatR = (ly) => {
    for (let i = 1; i < coatPts.length; i++) {
      const a = coatPts[i - 1], b = coatPts[i];
      if (ly >= a.y && ly <= b.y) {
        const t = (ly - a.y) / Math.max(1e-6, b.y - a.y);
        return a.x + (b.x - a.x) * t;
      }
    }
    return 0.30;
  };
  for (let i = 0; i < 3; i++) {
    const by = 0.545 + i * 0.075;
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 9), buttonMat);
    btn.position.set(0, by, coatR(by - TORSO_Y) + 0.004);
    g.add(btn);
  }

  // === Arms === (sleeves in accent color, hands in skin). Raised with the taller
  // torso so they still hang from the shoulder line rather than mid-body.
  // Arms — two segments with an elbow, built from the shoulder pivot down.
  // A single capsule read as a tube glued to the body; a real upper arm +
  // forearm gives the silhouette a joint, a taper and a wrist.
  const armL = new THREE.Group();
  armL.position.set(-0.315, 0.66, 0);
  g.add(armL);
  const armR = new THREE.Group();
  armR.position.set(0.315, 0.66, 0);
  g.add(armR);

  const buildArm = (group, s) => {
    const shoulder = new THREE.Vector3(0, 0, 0);
    const elbow = new THREE.Vector3(s * 0.062, -0.185, 0.015);
    const wrist = new THREE.Vector3(s * 0.104, -0.345, 0.032);
    // No outline shell on the sleeve segments. The other parts of the figure
    // keep one, but on two overlapping capsules a uniform 1.045 inflation makes
    // the upper arm's shell poke back through the forearm and the elbow sphere
    // as a hard black seam running down the middle of the arm.
    const upper = bone(shoulder, elbow, 0.088, bodyMat, 1.0);
    group.add(upper);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.086, 20, 14), bodyMat);
    joint.position.copy(elbow); joint.castShadow = true; group.add(joint);
    const fore = bone(elbow, wrist, 0.074, bodyMat, 1.0);
    group.add(fore);
    // Cuff — the sleeve's hem, long enough to swallow the top of the hand. The
    // bare skin ball used to sit out below it as a separate object.
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.080, 0.089, 0.105, 18), darkMat);
    cuff.position.copy(wrist).add(new THREE.Vector3(0, 0.030, 0));
    cuff.castShadow = true; group.add(cuff);
    // Hand — smaller, flatter, and tucked under the cuff hem.
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.074, 18, 13), skinMat);
    hand.position.copy(wrist).add(new THREE.Vector3(s * 0.004, -0.049, 0.006));
    hand.scale.set(1, 0.86, 0.9);
    hand.castShadow = true; group.add(hand);
    return hand;
  };
  const handL = buildArm(armL, -1);
  const handR = buildArm(armR, 1);

  // Grip points — the centre of each fist, in arm-group space (wrist + the hand's
  // own offset, see buildArm). Persona props hang off these instead of being
  // placed in figure space: a fixed figure-space position cannot follow the
  // shoulder, so once the arms gained a shoulder pivot every prop ended up a
  // hand's width away from the body with nothing touching it.
  const GRIP_L = new THREE.Vector3(-0.108, -0.394, 0.038);
  const GRIP_R = new THREE.Vector3( 0.108, -0.394, 0.038);

  // === Legs === (pants in deep accent color)
  const legL=limb(0.12,0.3,player.accent);
  legL.position.set(-0.14,-0.1,0); g.add(legL);
  addOutline(legL, 1.04);
  const legR=limb(0.12,0.3,player.accent);
  legR.position.set(0.14,-0.1,0); g.add(legR);
  addOutline(legR, 1.04);
  lowerParts.push(legL, legR);

  // Shoes — the legs used to stop at a capsule tip above the pedestal.
  for (const s of [-1, 1]) {
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.165,0.095,0.24),darkMat);
    // Sit the shoe on the pedestal top (y = -0.10); lower and the figure
    // appeared to stand on air in the portrait renderer.
    shoe.position.set(s*0.145,-0.128,0.035);
    shoe.castShadow=true; shoe.receiveShadow=true; g.add(shoe);
    lowerParts.push(shoe);
  }

  // === Head (parented group so face features follow head bob) ===
  const head=new THREE.Group();
  head.position.y=HEAD_Y; head.scale.setScalar(HEAD_S); g.add(head);
  // Yaw first, then pitch: a listener turns to the speaker and then nods,
  // instead of the nod axis swinging round with the turn.
  head.rotation.order='YXZ';

  // The face is painted into a texture, so the head is a single mesh. The old
  // build spent ~16 meshes on separate eye/nose/mouth/brow/blush primitives.
  const headSphere=new THREE.Mesh(
    new THREE.SphereGeometry(0.36,48,32),
    new THREE.MeshToonMaterial({ color:0xffffff, map:makeFaceTexture(player), gradientMap:TOON_GRADIENT_SOFT })
  );
  headSphere.castShadow=true; head.add(headSphere);
  addOutline(headSphere, 1.018);

  // Hair is defined once in buildHair() and shared with the portrait renderer.
  buildHair(head, player);

  // Positions are local to the (scaled) head group

  // Ears
  const earGeo=new THREE.SphereGeometry(0.06,16,10);
  const earL=new THREE.Mesh(earGeo,skinMat); earL.position.set(-0.35,-0.01,0); earL.scale.set(0.5,1,0.8); earL.castShadow=true; head.add(earL);
  const earR=new THREE.Mesh(earGeo,skinMat); earR.position.set(0.35,-0.01,0); earR.scale.set(0.5,1,0.8); earR.castShadow=true; head.add(earR);

  // Eyes, brows, nose, mouth, chin and blush are painted into the head texture
  // (see makeFaceTexture) — there are no face meshes to place here. Persona
  // expression comes from FACE_STYLES, so the old smile/brow tweaks are gone.

  // === Persona-specific accessories ===
  switch(player.name){
    case 'The Prosecutor': case 'Blaze': // Suit / fire theme
      // Suit collar — V shape
      const collar=new THREE.Mesh(
        new THREE.ConeGeometry(0.22,0.15,4),
        accMat
      );
      collar.position.set(0,0.72,0.30); collar.rotation.x=PI; collar.rotation.y=PI/4;
      g.add(collar);
      // Tie
      const tie=new THREE.Mesh(
        new THREE.ConeGeometry(0.05,0.2,4),
        new THREE.MeshStandardMaterial({color:0xc0392b})
      );
      tie.position.set(0,0.5,0.3); tie.rotation.x=-PI/2+0.3;
      g.add(tie);
      // Gavel — gripped in the right fist with the head up. Handle and head are
      // one group on the arm; in world space the two parts sat 8 cm apart and
      // neither of them was anywhere near the hand.
      const gavel=new THREE.Group();
      // Leaned outboard so the head clears the sleeve silhouette. Held vertically
      // it disappeared behind the forearm from every camera outside the ring,
      // which is the only place the camera ever is.
      gavel.position.copy(GRIP_R).add(new THREE.Vector3(0.046,-0.015,0.050));
      gavel.rotation.set(-0.14,0,-0.45);
      // The head is a bar, not a drum — and a bar seen from a 39 degree camera has
      // to be a box. The old drum was a cylinder lying on its side: from above, the
      // only face the camera ever sees of it is a circle, so no amount of slimming
      // stopped it reading as a round cap on a stem. A box presents a long
      // rectangle to the same view, which is the whole silhouette of a mallet head.
      const gavelHandle=new THREE.Mesh(
        new THREE.CylinderGeometry(0.013,0.016,0.30,10),
        new THREE.MeshStandardMaterial({color:0xc9a06a,roughness:0.55})
      );
      gavelHandle.position.y=0.060; gavel.add(gavelHandle);
      const gavelHead=new THREE.Mesh(
        new THREE.BoxGeometry(0.190,0.050,0.062),
        new THREE.MeshStandardMaterial({color:0x5e3722,roughness:0.62})
      );
      gavelHead.position.y=0.200; gavel.add(gavelHead);
      armR.add(gavel); prop=gavel;
      // Hair comes from buildHair() — no per-branch hair geometry.
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
      // Clipboard — carried at the left hip beside the fist, angled like the
      // tablet: the clip at the top is what makes it read as a clipboard, and the
      // outboard turn keeps the face visible from outside the ring.
      const clipboard=new THREE.Group();
      clipboard.position.copy(GRIP_L).add(new THREE.Vector3(-0.070,0.075,0.075));
      clipboard.rotation.set(-0.18,-0.70,0.08);
      const board=new THREE.Mesh(
        new THREE.BoxGeometry(0.185,0.235,0.02),
        new THREE.MeshStandardMaterial({color:0xF5F0E0,roughness:0.7})
      );
      clipboard.add(board);
      const clip=new THREE.Mesh(
        new THREE.BoxGeometry(0.10,0.032,0.014),
        new THREE.MeshStandardMaterial({color:0x9aa3a8,metalness:0.6,roughness:0.35})
      );
      clip.position.set(0,0.113,0.014); clipboard.add(clip);
      armL.add(clipboard); prop=clipboard;
      // Hair comes from buildHair() — no per-branch hair geometry.
      break;

    case 'The Chaos Agent': case 'Twister': // Wild hair + mask
      // Wild spiky hair. The old spikes sat at radius 0.25 while the skull's
      // Spikes and the under-shell come from buildHair().
      // Mask on a stick (drama!) — gripped in the right fist. Stick and mask are
      // one group hung off the arm, so the mask stays on the end of the stick as
      // the shoulder moves. Placed in world space they floated beside the arm.
      const maskProp=new THREE.Group();
      maskProp.position.copy(GRIP_R).add(new THREE.Vector3(0.048,0.002,0.062));
      maskProp.rotation.set(-0.14,0,-0.28);
      const stick=new THREE.Mesh(
        new THREE.CylinderGeometry(0.014,0.016,0.32,8),
        new THREE.MeshStandardMaterial({color:0x6B4226})
      );
      stick.position.y=0.115; maskProp.add(stick);
      const mask=new THREE.Mesh(
        new THREE.SphereGeometry(0.1,16,10),
        accMat
      );
      mask.position.y=0.29; mask.scale.set(0.8,1,0.3);
      maskProp.add(mask);
      armR.add(maskProp); prop=maskProp;
      // The wide "wildcard" grin is painted by FACE_STYLES.
      break;

    case 'The Gut Player': case 'ConspiBro': // Bandana + muscular / suspicious
      // Bandana. The old torus had a main radius of 0.34 against a 0.36 skull,
      // so it sank into the cheeks; the top cap only swept 0.32*PI and left a
      // ring of bare scalp between cap and band. Both now ride HAIR_R and meet.
      const bandana=new THREE.Mesh(
        new THREE.TorusGeometry(HAIR_R - 0.012, 0.052, 12, 40),
        new THREE.MeshStandardMaterial({color:0x7f8c8d,roughness:0.4})
      );
      bandana.position.set(0,0.10,0); bandana.rotation.x=PI/2; bandana.scale.set(1,1,0.86);
      bandana.castShadow = true;
      head.add(bandana);
      // Bandana knot
      const knot=new THREE.Mesh(
        new THREE.BoxGeometry(0.07,0.09,0.07),
        new THREE.MeshStandardMaterial({color:0x7f8c8d})
      );
      knot.position.set(0,0.09,-0.355); head.add(knot);
      // Crown cap — sweep widened so it seals against the band with no gap.
      const bandanaTop=new THREE.Mesh(
        new THREE.SphereGeometry(HAIR_R - 0.006, 40, 24, 0, TAU, 0, PI*0.44),
        new THREE.MeshStandardMaterial({color:0x8a9797,roughness:0.5})
      );
      bandanaTop.position.set(0,0.005,0); bandanaTop.castShadow=true; head.add(bandanaTop);
      // Bigger arms (muscular)
      armL.scale.set(1.24,1.16,1.24); armR.scale.set(1.24,1.16,1.24);
      // Fist pose — both arms lean forward onto the table. Hands are children
      // of the arm groups now, so rotating the shoulder is the whole gesture.
      armL.rotation.x=-0.42; armR.rotation.x=-0.42;
      armL.rotation.z=0.10; armR.rotation.z=-0.10;
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
      // Tablet — carried at the left hip beside the fist. Two things decide
      // whether it reads at all: square to the chest it hides behind the figure
      // (the camera only ever orbits outside the ring), and turned fully outboard
      // it presents nothing but its edge. About 25 degrees out plus a lighter
      // casing and a brighter screen so the slab is not a black notch at night.
      const tablet=new THREE.Group();
      tablet.position.copy(GRIP_L).add(new THREE.Vector3(-0.070,0.055,0.085));
      tablet.rotation.set(-0.28,-0.45,0.05);
      const slab=new THREE.Mesh(
        new THREE.BoxGeometry(0.17,0.235,0.016),
        new THREE.MeshStandardMaterial({color:0x2a3550,roughness:0.3,metalness:0.45})
      );
      tablet.add(slab);
      // Screen glow — sits just proud of the slab's front face.
      const screen=new THREE.Mesh(
        new THREE.PlaneGeometry(0.148,0.205),
        new THREE.MeshStandardMaterial({color:0x2980b9,emissive:0x2980b9,emissiveIntensity:0.55})
      );
      screen.position.z=0.0095; tablet.add(screen);
      armL.add(tablet); prop=tablet;
      // Hair (including the side part) comes from buildHair().
      break;

    case 'The Underdog': case 'EasyBake': // Messy hair + lucky charm
      // Hair (bowl + cowlick) comes from buildHair().
      // Lucky charm (four-leaf clover) pinched in the right fist. It hangs off
      // the arm group so it rides the shoulder pose; the old world-space position
      // at (0.48, 0.15) left it hovering beside the hand with nothing touching it.
      const clover=new THREE.Group();
      clover.position.copy(GRIP_R).add(new THREE.Vector3(0.012,0.030,0.070));
      const leafMat=new THREE.MeshStandardMaterial({color:0x27ae60,roughness:0.4});
      for(let k=0;k<4;k++){
        const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.04,10,7), leafMat);
        const a2=k/4*TAU+PI/4;
        leaf.position.set(cos(a2)*0.048, sin(a2)*0.048, 0);
        leaf.scale.set(1,1.5,0.5);
        leaf.rotation.z=a2-PI/2;
        clover.add(leaf);
      }
      const cloverStem=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.06,6), leafMat);
      cloverStem.position.y=-0.055; clover.add(cloverStem);
      armR.add(clover); prop=clover;
      // Worried expression comes from FACE_STYLES (browTilt), not mesh tweaks
      // Nervous posture — slightly leaning back. Applied at the hip by the rig
      // (a root tilt also tipped the seat stone, and was wiped by every reset).
      baseLean=-0.05;
      break;
  }

  // Nape volume now lives in buildHair(), so this pass only handles the clothing
  // trim.
  // Collar + belt trim — clothing reads as clothing. The collar sits at the base
  // of the new neck and the belt cinches the actual waist.
  const collarTrim=new THREE.Mesh(new THREE.TorusGeometry(0.175,0.038,10,40),accMat);
  collarTrim.position.y=0.70; collarTrim.rotation.x=PI/2; g.add(collarTrim);
  // Belt — a slim band on the narrow part of the coat (profile local y -0.069,
  // world 0.351), not a fat hoop around the hem. The old 0.04 tube sat on the
  // flared skirt at y 0.20 and read as a rubber ring; this one hugs the waist.
  const belt=new THREE.Mesh(new THREE.TorusGeometry(0.302,0.021,10,56),accMat);
  belt.position.y=0.351; belt.rotation.x=PI/2; g.add(belt);

  // === Seat plinth ===
  // Segments raised from 24: these rims are right under the camera and were
  // visibly faceted at close range.
  // Tinted toward the dais stone and skinned with the same stone texture: a
  // flat-coloured disc at the dais's nominal tint renders about twice as bright
  // as the textured dais once the sun hits a horizontal face, so it read as a
  // white plate parked on the stone. Sharing the grain fixes tone and material
  // at once. The player colour survives on the thin ring below, which is enough
  // to identify who is who.
  const baseColor = new THREE.Color(player.color).lerp(new THREE.Color(0xe2d6bb), 0.62);
  const seatStone = window.__stoneTex;
  let baseMat;
  if (seatStone) {
    const seatTex = seatStone.clone();
    seatTex.needsUpdate = true;
    seatTex.wrapS = seatTex.wrapT = THREE.RepeatWrapping;
    // The dais runs 6 tiles over 8 m (0.75 tiles/m); this disc is 1.1 m across,
    // so just under one tile keeps the same grain size.
    seatTex.repeat.set(0.85, 0.85);
    baseMat = new THREE.MeshStandardMaterial({
      map: seatTex, bumpMap: seatTex, bumpScale: 0.02,
      color: baseColor, roughness: 0.92, metalness: 0
    });
  } else {
    baseMat = new THREE.MeshStandardMaterial({color:baseColor,roughness:0.92,metalness:0});
  }
  const base=new THREE.Mesh(
    new THREE.CylinderGeometry(0.5,0.55,0.08,48),
    baseMat
  );
  base.position.y=-0.14; base.receiveShadow=true; g.add(base);

  // A painted circle inlaid in the stone step, not a band around its edge: at
  // 0.5-0.58 the old band overhung the 0.5 m plinth and floated a centimetre
  // above the dais, and a saturated accent plus emissive at that size read as a
  // glowing rim. Toning the accent into the stone keeps a hint of the player
  // colour without turning the seat back into a coaster.
  const seatAccent = new THREE.Color(player.accent).lerp(new THREE.Color(0xb9ad96), 0.34);
  const ringMat = new THREE.MeshStandardMaterial({
    color:seatAccent, side:THREE.DoubleSide, roughness:0.85, metalness:0,
    emissive:seatAccent, emissiveIntensity:0.05
  });
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(0.408,0.452,64),
    ringMat
  );
  ring.position.y=-0.098; ring.rotation.x=-PI/2; g.add(ring);

  
  // Highlight ring (for active speaker)
  const highlight = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.7, 64),
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

  // === Rig ===
  // Two pivot groups, so animation addresses parts by reference instead of
  // guessing which child is the head from its height:
  //   body  — everything standing on the plinth, pivoting at the soles. A death
  //           fall or a celebration hop moves the figure, never the seat stone.
  //   upper — coat, arms, head and trim, pivoting at the hip. Breathing, weight
  //           shifts, leans and torso turns bend the figure at the waist.
  // The seat (plinth, inlay ring, highlight) stays on the root group. Pivots
  // are pure translations, so re-parenting only offsets each child's y.
  const RIG_FOOT_Y = -0.15, RIG_HIP_Y = 0.15;
  const body = new THREE.Group();
  body.name = 'rig-body';
  body.position.y = RIG_FOOT_Y;
  const upper = new THREE.Group();
  upper.name = 'rig-upper';
  upper.position.y = RIG_HIP_Y - RIG_FOOT_Y;
  body.add(upper);
  const seatParts = new Set([base, ring, highlight]);
  const lowerSet = new Set(lowerParts);
  for (const child of [...g.children]) {
    if (seatParts.has(child)) continue;
    if (lowerSet.has(child)) { child.position.y -= RIG_FOOT_Y; body.add(child); }
    else { child.position.y -= RIG_HIP_Y; upper.add(child); }
  }
  g.add(body);
  upper.rotation.x = baseLean;
  const rig = {
    body, upper, head, armL, armR, handL, handR, prop,
    bodyBaseY: body.position.y,
    upperBaseY: upper.position.y,
    headBaseY: head.position.y,
    baseLean,
    armBase: {
      L: { x: armL.rotation.x, y: armL.rotation.y, z: armL.rotation.z },
      R: { x: armR.rotation.x, y: armR.rotation.y, z: armR.rotation.z },
    },
  };

  // Store refs
  g.userData = { player, index, highlight, baseMat, ringMat, _originalBaseColor: baseColor.getHex(), _originalRingColor: seatAccent.getHex(), _originalRingGlow: 0.05, _baseRotY: g.rotation.y, baseY: g.position.y, baseScale: fj.k, rig, life: makeLifeState(index) };
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
  // Framed off the shared head constant so raising the head can never leave the
  // portrait aiming at the old neck height.
  avCam.position.set(0, HEAD_Y + 0.02, 2.2);
  avCam.lookAt(0, HEAD_Y, 0);

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

  // Head — one textured mesh, matching the in-scene build (see makeFaceTexture)
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  head.scale.setScalar(HEAD_S);
  avScene.add(head);

  const headSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 48, 32),
    new THREE.MeshToonMaterial({ color:0xffffff, map:makeFaceTexture(player), gradientMap:TOON_GRADIENT_SOFT })
  );
  head.add(headSphere);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.06, 16, 10);
  const earL = new THREE.Mesh(earGeo, skinMat); earL.position.set(-0.35, -0.01, 0); earL.scale.set(0.5, 1, 0.8); head.add(earL);
  const earR = new THREE.Mesh(earGeo, skinMat); earR.position.set(0.35, -0.01, 0); earR.scale.set(0.5, 1, 0.8); head.add(earR);

  // Face features are painted into the head texture.
  // Same hair as the in-scene character.
  buildHair(head, player);

  // Neck + shoulders/torso — kept in proportion with the scene build
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.165, 0.24, 16), skinMat);
  neck.position.y = NECK_Y; avScene.add(neck);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, TORSO_H, 24), bodyMat);
  torso.position.y = TORSO_Y; avScene.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), bodyMat);
  shoulders.position.y = 0.65; shoulders.scale.set(1, 0.5, 0.8); avScene.add(shoulders);

  // Persona-specific accessories (simplified for portrait)
  addAvatarAccessories(avScene, head, player, skinMat, bodyMat, accMat, darkMat);

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

function addAvatarAccessories(scene, head, player, skinMat, bodyMat, accMat, darkMat) {
  // Accessories ONLY — hair is added by buildHair(), shared with the in-scene
  // build so the portrait cannot drift from the character it depicts.
  switch(player.name) {
    case 'The Prosecutor': case 'Blaze': {
      const collar = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.15, 4), accMat);
      collar.position.set(0, 0.72, 0.30); collar.rotation.x = PI; collar.rotation.y = PI/4; scene.add(collar);
      const tie = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), new THREE.MeshStandardMaterial({color:0xc0392b}));
      tie.position.set(0, 0.5, 0.3); tie.rotation.x = -PI/2+0.3; scene.add(tie);
      break;
    }
    case 'The Therapist': case 'SafetySam': {
      const glassL = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 12, 24), new THREE.MeshStandardMaterial({color:0x333333, metalness:0.5, roughness:0.2}));
      glassL.position.set(-0.12, 0.02, 0.32); head.add(glassL);
      const glassR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 12, 24), new THREE.MeshStandardMaterial({color:0x333333, metalness:0.5, roughness:0.2}));
      glassR.position.set(0.12, 0.02, 0.32); head.add(glassR);
      break;
    }
    case 'The Chaos Agent': case 'Twister': {
      break;
    }
    case 'The Gut Player': case 'ConspiBro': {
      const scar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.01), new THREE.MeshStandardMaterial({color:0xaa3333}));
      scar.position.set(-0.15, -0.03, 0.35); scar.rotation.z = 0.2; head.add(scar);
      break;
    }
    case 'The Statistician': case 'Dr. Pizza': {
      const sgL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 12, 24), new THREE.MeshStandardMaterial({color:0x2980b9, metalness:0.4, roughness:0.2}));
      sgL.position.set(-0.12, 0.02, 0.32); head.add(sgL);
      const sgR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 12, 24), new THREE.MeshStandardMaterial({color:0x2980b9, metalness:0.4, roughness:0.2}));
      sgR.position.set(0.12, 0.02, 0.32); head.add(sgR);
      break;
    }
    case 'The Underdog': case 'EasyBake': {
      break;
    }
  }
}

// ===== Camera Controls =====
let theta = 0, phi = PI / 2.4;
// Narrow mobile viewports need more distance to keep the full circle visible.
// A tighter default hero framing: at dist 10 the whole dais fit in shot and the
// six figures occupied a tenth of it.
// Portrait also has a far narrower horizontal FOV (aspect ~0.46), so the tight
// mobile default cropped the outer two players off both edges. 19 keeps the
// dais at ~78% of the width and matches the resize clamp below.
let dist = (innerWidth <= 768) ? 22 : 12;
// Aimed just above the head so full figures stay in frame when zoomed in.
// Derived from HEAD_Y (the old build used a flat 1.1, which left the taller
// figures' heads outside the top of the frame at close zoom).
const targetV = new THREE.Vector3(0, HEAD_Y + 0.12, 0);
let isDrag = false, isPan = false, px = 0, py = 0;
let userInteracting = false; // true while mouse/touch drag is active — pauses auto-rotate
let dragDist = 0; // pixels moved during current drag — used to suppress click-after-drag
const DIST_MIN = 3, DIST_MAX = 40;

const TARGET_MAX_RADIUS = 25; // keep the view target inside the village
function clampTarget() {
  const r = Math.hypot(targetV.x, targetV.z);
  if (r > TARGET_MAX_RADIUS) {
    targetV.x *= TARGET_MAX_RADIUS / r;
    targetV.z *= TARGET_MAX_RADIUS / r;
  }
}

function updateCam() {
  // Orbit around targetV (not the origin): panning moves camera and look-at

// Tighter default framing: at dist 10 the whole dais fit in frame and the six
// figures occupied a tenth of it. Pulling in reads as a director's setup rather
// than a camera left on wide.
  // point together, so the view direction stays fixed — a true parallel pan.
  const x = targetV.x + dist * sin(phi) * cos(theta);
  const y = targetV.y + dist * cos(phi) - 0.6; // -0.6 preserves the original default framing
  const z = targetV.z + dist * sin(phi) * sin(theta);
  camera.position.set(x, y, z);
  camera.lookAt(targetV);
}

// Ground-plane pan (RTS style): screen-right → camera-right, screen-down →
// camera-forward projected onto the floor. The view angle never changes.
function panCameraGround(dx, dy, factor) {
  const ps = factor * dist;
  const right = new THREE.Vector3();
  camera.getWorldDirection(right);
  right.cross(new THREE.Vector3(0, 1, 0)).normalize(); // camera-right (always horizontal)
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); else fwd.normalize();
  targetV.addScaledVector(right, -dx * ps);
  targetV.addScaledVector(fwd, dy * ps);
  clampTarget();
}

function setAutoRotate(v) {
  autoRotate = v;
  const btn = document.getElementById('btn-rotate');
  if (btn) btn.classList.toggle('active', v);
}

function setupCameraControls() {
  // Debug/testing hook — read live camera state from the console
  window.__cam = () => ({ theta, phi, dist, autoRotate, camFollow, followSuspended, isDrag, dragDist, userInteracting, intro: !!introAnim, speaker: speakerFocusIndex, phase: currentPhase, target: [targetV.x, targetV.y, targetV.z], camY: camera.position.y });
  canvas.addEventListener('mousedown', e => { isDrag = true; isPan = e.button === 2; px = e.clientX; py = e.clientY; userInteracting = true; dragDist = 0; introAnim = null; speakerCameraAnim = null; });
  window.addEventListener('mouseup', () => { isDrag = false; isPan = false; userInteracting = false; });
  window.addEventListener('mousemove', e => {
    if (!isDrag) return;
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    dragDist += Math.abs(dx) + Math.abs(dy);
    // First real drag takes manual control — stop auto-rotate and suspend
    // story camera-follow so the view stays where the user leaves it
    if (dragDist > 4) {
      if (autoRotate) setAutoRotate(false);
      followSuspended = true;
    }
    if (isPan) {
      panCameraGround(dx, dy, 0.01);
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
    userInteracting = true;
    introAnim = null; // any touch cancels the intro flight immediately
    speakerCameraAnim = null; // and any in-progress speaker flight
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
      if (autoRotate) setAutoRotate(false); // first touch-drag takes manual control
      followSuspended = true;
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

      // Two-finger drag also pans the view target across the floor
      const newMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const newMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const panDx = newMidX - touchState.midX;
      const panDy = newMidY - touchState.midY;
      panCameraGround(panDx, panDy, 0.008);
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
      userInteracting = false;
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
          const rawColor = p.color || p.accent || 0xe74c3c;
          const hex = hexColor(rawColor);
          const readableHex = hexColor(readableAccent(rawColor));
          const avatarUrl = renderAvatarPortrait(p, 96);
          const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
          hoverCard.innerHTML = `
            <div class="avatar-img" style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:2px solid ${hex};flex-shrink:0;"><img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" /></div>
            <div class="name" style="color:${readableHex}">${displayName}</div>
            <div class="desc">${p.persona}</div>
            <div class="trait" style="margin-top:6px;font-size:11px;color:#999;">${(p.model || '').split('/').pop()}</div>
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
    if (dragDist > 6) return; // that was a camera drag, not a tap on a character
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
  if (moved) { clampTarget(); updateCam(); }
}

// ===== Night Mode (with smooth transition) =====
let nightTransition = null; // {fromVals, toVals, startTime, duration}
const NIGHT_PRESETS = {
  // Keep daytime fog beyond the floor. The previous 14–32 range blended the
  // platform into the bright day fog and looked like a large white reflection,
  // especially at wider zoom levels.
  day: {
    bg:0x8fb4d4, fogColor:0xc8d8e8, fogNear:40, fogFar:100,
    // Ambient carries the shadow side. The old 1.25 flooded every surface evenly
    // and made the daylight table read as grey plastic; 0.66 went too far the
    // other way — with the sun this low, the long raking shadows went near black
    // and the stone outside the dais read as dusk. The key comes down as the fill
    // comes up, so lit stone keeps its value while the shadow side stays readable.
    amb:1.02, dir:1.52, dirColor:0xffd49c, moon:0, candle:0, flame:0.9,
    skyMix:0, ground:0xdcdcd2, winOpacity:0.12,
  },
  night: {
    bg:0x0a0a18, fogColor:0x0a0a18, fogNear:18, fogFar:52,
    amb:0.20, dir:0.30, dirColor:0x6677ff, moon:0.9, candle:5.2, flame:2.6,
    skyMix:1, ground:0x4a5a50, winOpacity:0.85,
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
    skyMix: skyUniforms ? skyUniforms.uNightMix.value : (n ? 0 : 1),
    groundR: envGround ? envGround.material.color.r : 0,
    groundG: envGround ? envGround.material.color.g : 0,
    groundB: envGround ? envGround.material.color.b : 0,
    winOpacity: (window.__houseWinMats && window.__houseWinMats[0]) ? window.__houseWinMats[0].opacity : 0,
  };
  nightTransition = { from, target, startTime: performance.now(), duration: 600 };

  // Day mode hides brazier embers + lights (no fire during daylight)
  if (window.__brazierEmbers && window.__brazierLights) {
    const showBraziers = n;
    for (const e of window.__brazierEmbers) e.visible = showBraziers;
    for (const l of window.__brazierLights) l.intensity = showBraziers ? 0.35 : 0;
  }
  directCamera(n ? 'night' : 'day');
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

  // Sky shader blend + environment ground tint + house window glow
  if (skyUniforms) {
    const skyMixV = f.skyMix + (tgt.skyMix - f.skyMix) * e;
    skyUniforms.uNightMix.value = skyMixV;
    // Haze follows the actual fog colour of this frame, and the tiny env map is
    // re-baked along the crossfade so PBR surfaces darken with the sky.
    if (skyUniforms.uHaze) skyUniforms.uHaze.value.copy(scene.fog.color);
    setEnvMix(skyMixV, t >= 1);
  }
  if (envGround) {
    const gT = tgt.ground;
    envGround.material.color.setRGB(
      f.groundR + (((gT >> 16 & 0xff)/255) - f.groundR) * e,
      f.groundG + (((gT >> 8 & 0xff)/255) - f.groundG) * e,
      f.groundB + (((gT & 0xff)/255) - f.groundB) * e
    );
  }
  if (window.__houseWinMats) {
    for (const m of window.__houseWinMats) m.opacity = f.winOpacity + (tgt.winOpacity - f.winOpacity) * e;
  }

  if (t >= 1) nightTransition = null;
}

// ===== Name Tags =====
let tagEls = [];

const LABEL_SURFACE = 0x050812;

function hexColor(value) {
  return `#${Number(value).toString(16).padStart(6, '0')}`;
}

function mixHexColors(from, to, amount) {
  const mixChannel = shift => Math.round(
    ((from >> shift) & 0xff) + ((((to >> shift) & 0xff) - ((from >> shift) & 0xff)) * amount),
  );
  return (mixChannel(16) << 16) | (mixChannel(8) << 8) | mixChannel(0);
}

function colorLuminance(color) {
  const channel = shift => {
    const value = ((color >> shift) & 0xff) / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  return (0.2126 * channel(16)) + (0.7152 * channel(8)) + (0.0722 * channel(0));
}

function colorContrast(first, second) {
  const firstLum = colorLuminance(first);
  const secondLum = colorLuminance(second);
  return (Math.max(firstLum, secondLum) + 0.05) / (Math.min(firstLum, secondLum) + 0.05);
}

function readableAccent(color, background = LABEL_SURFACE, targetContrast = 7) {
  if (colorContrast(color, background) >= targetContrast) return color;
  for (let step = 1; step <= 40; step += 1) {
    const candidate = mixHexColors(color, 0xffffff, step / 40);
    if (colorContrast(candidate, background) >= targetContrast) return candidate;
  }
  return mixHexColors(color, 0xffffff, 0.75);
}

function buildNameTags() {
  tagsContainer.innerHTML = '';
  tagEls = [];
  PLAYERS.forEach(p => {
    const d = document.createElement('div');
    d.className = 'tag';
    const accent = p.color || p.accent || 0xe74c3c;
    const accentHex = hexColor(accent);
    const readableHex = hexColor(readableAccent(accent));
    d.style.border = `1px solid ${accentHex}99`;
    d.style.setProperty('--tag-accent', accentHex);
    d.style.setProperty('--tag-text', readableHex);
    const main = lang === 'zh' ? (p.name_zh || p.name) : p.name;
    d.innerHTML = `<div class="tag-name">${main}</div><div class="speaking-label"></div><div class="tag-sub-row">${modelBadgeHTML(p.model, 'tag-model')}<span class="role-sub"></span></div>`;
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
        styleRoleTag(roleSub, teamColor);
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
      chars[i].userData.ringMat.emissiveIntensity = chars[i].userData._originalRingGlow ?? 0.05;
    }
    if (tagEls[i]) {
      const roleSub = tagEls[i].querySelector('.role-sub');
      if (roleSub) roleSub.textContent = '';
      tagEls[i].classList.remove('role-changed', 'role-transitioning');
    }
  });
}

function updateNameTags() {
  const w = innerWidth, h = innerHeight;
  PLAYERS.forEach((p, i) => {
    const pos = sp(i);
    // Lower the tag for foreground characters (closer to camera bottom) to avoid covering faces
    // Clearance above the head, which now sits higher (see HEAD_Y).
    const worldPos = new THREE.Vector3(pos[0], pos[1] + 1.75, pos[2]);
    const screenPos = worldPos.clone().project(camera);
    const isForeground = screenPos.y < -0.2; // lower half of screen = foreground
    const yOffset = isForeground ? 2.10 : 1.75;
    const v = new THREE.Vector3(pos[0], pos[1] + yOffset, pos[2]);
    v.project(camera);
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    const d = camera.position.distanceTo(new THREE.Vector3(pos[0], pos[1] + 1.75, pos[2]));
    const minScale = innerWidth <= 768 ? 0.92 : 0.82;
    const s = Math.max(minScale, Math.min(1.2, 8 / d));
    if (tagEls[i]) {
      const halfWidth = (tagEls[i].offsetWidth * s) / 2;
      const clampedX = THREE.MathUtils.clamp(x, halfWidth + 6, w - halfWidth - 6);
      tagEls[i].style.left = clampedX + 'px';
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
  const generation = bubbleGeneration;
  const accent = p.color || p.accent || 0xe74c3c;
  const hex = hexColor(accent);
  const readableHex = hexColor(readableAccent(accent));
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;

  const el = document.createElement('div');
  el.className = 'bubble';
  el.style.borderColor = hex;
  // The full transcript lives in the side panel (explore) or the replay card
  // (story), so the in-world bubble only carries a short excerpt — it marks
  // who is talking without becoming a third copy of the same paragraph.
  const plain = String(text || '');
  const isCJK = /[\u3400-\u9fff]/.test(plain);
  const BUBBLE_MAX = isCJK ? (innerWidth <= 768 ? 46 : 64) : (innerWidth <= 768 ? 110 : 150);
  const excerpt = plain.length > BUBBLE_MAX
    ? plain.slice(0, BUBBLE_MAX).replace(/\s+\S*$/, '').replace(/[<\[][^>\]]*$/, '').trimEnd() + '…'
    : plain;
  el.innerHTML = `
    <div class="speaker" style="color:${readableHex}">${displayName} ${modelBadgeHTML(p.model, 'mini')}</div>
    <div class="text">${formatGameText(excerpt)}</div>
    <div class="arrow" style="border-top-color:${hex}"></div>
  `;
  bubblesContainer.appendChild(el);

  // Highlight speaker + start speaking animation
  if (chars[playerIndex] && chars[playerIndex].userData.highlight) {
    chars[playerIndex].userData.highlight.material.opacity = 0.6;
  }
  setSpeaking(playerIndex, true);
  if (currentPhase === 'day') setSpeakerFocus(playerIndex, true);

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
    if (generation !== bubbleGeneration) return;
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
    activeBubblesData = activeBubblesData.filter(b => b !== bubbleData);
    if (chars[playerIndex] && chars[playerIndex].userData.highlight) {
      chars[playerIndex].userData.highlight.material.opacity = 0;
    }
    setSpeaking(playerIndex, false);
    if (!activeBubblesData.some(b => b.playerIndex === playerIndex)) {
      clearSpeakerFocus();
    }
  }, duration);
}

function updateBubblePosition(b) {
  const p = PLAYERS[b.playerIndex];
  if (!p) return;
  const pos = sp(b.playerIndex);
  const v = new THREE.Vector3(pos[0], pos[1] + 1.8, pos[2]);
  v.project(camera);
  const projectedX = (v.x * 0.5 + 0.5) * innerWidth;
  // The player's name tag is anchored at +1.75 (+2.10 in the foreground) and the
  // bubble's bottom edge used to land at +1.8 — the tag's own centre line — so a
  // speaker's bubble sat on top of the name it belongs to. Lift the anchor by
  // half the tag's painted height (it scales with distance) plus a gap, in screen
  // pixels, so the bubble clears its owner's tag.
  const tagEl = tagEls[b.playerIndex];
  let tagLift = 0;
  if (tagEl && tagEl.offsetHeight) {
    const scaleMatch = /scale\(([\d.]+)\)/.exec(tagEl.style.transform || '');
    const tagScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    tagLift = (tagEl.offsetHeight * tagScale) / 2 + (innerWidth <= 768 ? 6 : 8);
  }
  const projectedY = (-v.y * 0.5 + 0.5) * innerHeight - tagLift;
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
  bubbleGeneration += 1;
  bubblesContainer.innerHTML = '';
  activeBubblesData = [];
  speakingStates = [];
  clearSpeakerFocus();
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
// Vote arrow elements are created once, then only coordinates updated per frame.
// Player names already appear in the overhead tags and voting panel, so the
// arrows deliberately avoid adding a second, overlapping name label.
let voteArrowEls = []; // [{pathUnderlay, path, head, voter, target, laneOffset, decisive}]
let voteArrowSettleTimer = null;

function showVoteArrows(votes) {
  activeVotes = votes;
  if (voteArrowSettleTimer) clearTimeout(voteArrowSettleTimer);
  voteOverlay.innerHTML = '';
  voteOverlay.classList.remove('revealed', 'settled');
  voteArrowEls = [];
  if (!activeVotes) return;
  directCamera('vote');

  const entries = Object.entries(activeVotes);
  const targetGroups = new Map();
  entries.forEach(([voter, target]) => {
    if (!targetGroups.has(target)) targetGroups.set(target, []);
    targetGroups.get(target).push(voter);
  });
  const executed = new Set(gameData.vote?.executed || []);

  for (const [order, [voter, target]] of entries.entries()) {
    const vi = PLAYERS.findIndex(p => p.name === voter);
    const ti = PLAYERS.findIndex(p => p.name === target);
    if (vi < 0 || ti < 0) continue;
    pointAt(vi, ti, 1900, 300 + order * 75); // voter points as its arrow draws in

    const voterP = PLAYERS.find(x => x.name === voter);
    const voterAccent = voterP?.color || voterP?.accent || 0xe74c3c;
    const voterColor = hexColor(readableAccent(voterAccent));
    const targetVoters = targetGroups.get(target) || [];
    const targetIndex = targetVoters.indexOf(voter);
    const laneOffset = (targetIndex - ((targetVoters.length - 1) / 2)) * 11;
    const decisive = executed.has(target);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `vote-arrow-svg ${decisive ? 'decisive' : 'secondary'}`);
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    svg.style.setProperty('--vote-delay', `${order * 75}ms`);

    const pathUnderlay = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathUnderlay.setAttribute('class', 'vote-arrow-underlay');
    pathUnderlay.setAttribute('stroke', '#050812');
    pathUnderlay.setAttribute('stroke-width', decisive ? '6' : '4.5');
    pathUnderlay.setAttribute('stroke-dasharray', '6,4');
    pathUnderlay.setAttribute('fill', 'none');
    svg.appendChild(pathUnderlay);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'vote-arrow-path');
    path.setAttribute('stroke', voterColor);
    path.setAttribute('stroke-width', decisive ? '3' : '2');
    path.setAttribute('stroke-dasharray', '6,4');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('class', 'vote-arrow-head');
    head.setAttribute('fill', voterColor);
    head.setAttribute('stroke', '#050812');
    head.setAttribute('stroke-width', '2');
    svg.appendChild(head);

    voteOverlay.appendChild(svg);

    voteArrowEls.push({
      pathUnderlay,
      path,
      head,
      voter,
      target,
      laneOffset,
      decisive,
    });
  }
  redrawVoteArrows();
  requestAnimationFrame(() => voteOverlay.classList.add('revealed'));
  voteArrowSettleTimer = setTimeout(() => {
    voteOverlay.classList.add('settled');
  }, 1350);
}

function redrawVoteArrows() {
  if (!activeVotes || voteArrowEls.length === 0) return;
  const centerProjected = new THREE.Vector3(0, 0.5, 0).project(camera);
  const centerX = (centerProjected.x * 0.5 + 0.5) * innerWidth;
  const centerY = (-centerProjected.y * 0.5 + 0.5) * innerHeight;
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
    let sx = (startScreen.x * 0.5 + 0.5) * innerWidth;
    let sy = (-startScreen.y * 0.5 + 0.5) * innerHeight;
    let ex = (endScreen.x * 0.5 + 0.5) * innerWidth;
    let ey = (-endScreen.y * 0.5 + 0.5) * innerHeight;

    let dx = ex - sx;
    let dy = ey - sy;
    let len = Math.sqrt(dx*dx + dy*dy);
    if (len < 10) {
      va.pathUnderlay.setAttribute('d', '');
      va.path.setAttribute('d', '');
      continue;
    }

    // Keep arrows clear of the character bodies and separate arrows that share
    // a target, so simultaneous voting remains legible.
    const dirX = dx / len;
    const dirY = dy / len;
    sx += dirX * 18;
    sy += dirY * 18;
    ex -= dirX * 24;
    ey -= dirY * 24;

    const targetRadialX = ex - centerX;
    const targetRadialY = ey - centerY;
    const targetRadialLen = Math.sqrt(
      (targetRadialX * targetRadialX) + (targetRadialY * targetRadialY),
    ) || 1;
    ex += (-targetRadialY / targetRadialLen) * va.laneOffset;
    ey += (targetRadialX / targetRadialLen) * va.laneOffset;

    dx = ex - sx;
    dy = ey - sy;
    len = Math.sqrt(dx*dx + dy*dy);
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    let routeX = midX - centerX;
    let routeY = midY - centerY;
    let routeLen = Math.sqrt((routeX * routeX) + (routeY * routeY));
    if (routeLen < 24) {
      const clockwiseDistance = (ti - vi + PLAYERS.length) % PLAYERS.length;
      const routeSign = clockwiseDistance <= PLAYERS.length / 2 ? 1 : -1;
      routeX = (-dy / Math.max(1, len)) * routeSign;
      routeY = (dx / Math.max(1, len)) * routeSign;
      routeLen = 1;
    }
    routeX /= routeLen;
    routeY /= routeLen;
    const routeBend = THREE.MathUtils.clamp(44 + (len * 0.16), 54, 112);
    const routeLane = va.laneOffset * 0.7;
    const controlX = midX + (routeX * routeBend) + ((-dy / Math.max(1, len)) * routeLane);
    const controlY = midY + (routeY * routeBend) + ((dx / Math.max(1, len)) * routeLane);
    const c1x = sx + ((controlX - sx) * 0.64);
    const c1y = sy + ((controlY - sy) * 0.64);
    const c2x = ex + ((controlX - ex) * 0.64);
    const c2y = ey + ((controlY - ey) * 0.64);
    const pathData = `M ${sx},${sy} C ${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;
    va.pathUnderlay.setAttribute('d', pathData);
    va.path.setAttribute('d', pathData);

    // Arrowhead tangent at end of curve
    const tdx = ex - c2x, tdy = ey - c2y;
    const tlen = Math.sqrt(tdx*tdx + tdy*tdy) || 1;
    const tangentAngle = Math.atan2(tdy / tlen, tdx / tlen);
    const headLen = va.decisive ? 15 : 11;
    const hx1c = ex - headLen * Math.cos(tangentAngle - 0.4);
    const hy1c = ey - headLen * Math.sin(tangentAngle - 0.4);
    const hx2c = ex - headLen * Math.cos(tangentAngle + 0.4);
    const hy2c = ey - headLen * Math.sin(tangentAngle + 0.4);
    va.head.setAttribute('points', `${ex},${ey} ${hx1c},${hy1c} ${hx2c},${hy2c}`);

  }
}

function clearVoteArrows() {
  if (voteArrowSettleTimer) clearTimeout(voteArrowSettleTimer);
  voteArrowSettleTimer = null;
  activeVotes = null;
  voteOverlay.innerHTML = '';
  voteOverlay.classList.remove('revealed', 'settled');
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
  directCamera('result');
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

// ===== Day Speaker Focus =====
let speakerFocusIndex = -1;
let speakerCameraAnim = null;
// Cinematic story-follow: the camera flies to each speaker as the game
// progresses. Any manual drag suspends it; the next phase change (or the
// Auto button) re-engages it so the camera keeps rolling with the story.
let camFollow = true;
let followSuspended = false;

function focusSpeakerCamera(index) {
  if (!camFollow || followSuspended) return;
  const seatAngle = (index / 6) * TAU - PI / 2;
  const desiredTheta = seatAngle + PI - 0.55;
  const delta = Math.atan2(
    Math.sin(desiredTheta - theta),
    Math.cos(desiredTheta - theta),
  );
  speakerCameraAnim = {
    from: theta,
    to: theta + delta,
    startTime: performance.now(),
    duration: 1100,
  };
}

function setSpeakerFocus(index, active) {
  tagEls.forEach(tag => tag.classList.remove('speaking'));
  if (!active || currentPhase !== 'day' || index < 0 || !chars[index]) {
    speakerFocusIndex = -1;
    speakerFocusEl.classList.remove('visible');
    return;
  }

  speakerFocusIndex = index;
  focusSpeakerCamera(index);
  speakerFocusEl.classList.add('visible');
  if (tagEls[index]) {
    tagEls[index].classList.add('speaking');
    const label = tagEls[index].querySelector('.speaking-label');
    if (label) label.textContent = lang === 'zh' ? '發言中' : 'SPEAKING';
  }
  updateSpeakerFocus();
}

function clearSpeakerFocus() {
  speakerCameraAnim = null;
  setSpeakerFocus(-1, false);
}

function updateSpeakerCamera(t) {
  if (!speakerCameraAnim) return;
  const progress = Math.min((t - speakerCameraAnim.startTime) / speakerCameraAnim.duration, 1);
  // Ease in-out: a whip-pan start read as a cut, not a camera move.
  const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  theta = speakerCameraAnim.from + (speakerCameraAnim.to - speakerCameraAnim.from) * eased;
  updateCam();
  if (progress >= 1) speakerCameraAnim = null;
}

function updateSpeakerFocus() {
  if (speakerFocusIndex < 0 || !chars[speakerFocusIndex]) return;
  // Pulse the speaker's highlight ring so the current speaker pops
  const hl = chars[speakerFocusIndex].userData.highlight;
  if (hl) {
    const tp = performance.now() * 0.001;
    hl.material.opacity = 0.45 + 0.25 * sin(tp * 4.2);
    const s = 1 + 0.09 * sin(tp * 4.2);
    hl.scale.set(s, s, 1);
  }
  const pos = sp(speakerFocusIndex);
  const v = new THREE.Vector3(pos[0], pos[1] + 1.05, pos[2]);
  v.project(camera);
  const x = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * innerWidth, 0, innerWidth);
  const y = THREE.MathUtils.clamp((-v.y * 0.5 + 0.5) * innerHeight, 0, innerHeight);
  speakerFocusEl.style.setProperty('--speaker-x', `${x}px`);
  speakerFocusEl.style.setProperty('--speaker-y', `${y}px`);
}

// ===== Dim Character (executed) — animated death =====
function dimCharacter(index) {
  const g = chars[index];
  if (!g) return;
  // Snapshot per-character, figure only (seat stone keeps its team colour) and
  // never the shared OUTLINE_MAT: dimming that greyed every figure's ink line,
  // and two executions restored it in the wrong order.
  if (!g.userData._dimSnapshot) {
    const snap = [];
    const seen = new Set();
    (g.userData.rig ? g.userData.rig.body : g).traverse(obj => {
      if (!obj.isMesh || !obj.material || obj.userData.isOutline || seen.has(obj.material)) return;
      seen.add(obj.material);
      snap.push({
        mat: obj.material,
        color: obj.material.color.clone(),
        emissive: obj.material.emissive ? obj.material.emissive.clone() : null,
      });
    });
    g.userData._dimSnapshot = snap;
  }
  const L = g.userData.life;
  if (!L) { // no rig (should not happen) — dim instantly, no fall
    for (const s of g.userData._dimSnapshot) s.mat.color.lerp(LIFE_DIM_GREY, 0.7);
    return;
  }
  // Re-dim in the same frame as undimAll() = state restore: keep the death.
  const prev = lifeRestoreFrame === lifeFrame ? lifeRestoreDeaths.get(index) : null;
  // Right after the ballots appear, wait for the arrows and the camera dolly
  // before the fall; colour fade and topple both run off this clock.
  const entry = prev || {
    index, startTime: performance.now(), duration: 2000,
    delay: voteRevealFrame === lifeFrame ? 2600 : 150,
  };
  L.death = entry;
  L.dead = true;
  L.dimDone = false;
  if (!deathAnims.includes(entry)) deathAnims.push(entry);
  directCamera('execution', { index });
}

function updateDeathAnims(t) {
  // The pose itself is written by updateCharacterLife(); this only retires
  // entries whose clutch, fall and bounce have played out.
  for (let k = deathAnims.length - 1; k >= 0; k--) {
    const d = deathAnims[k];
    if (!chars[d.index] || t - d.startTime - (d.delay || 0) > d.duration) deathAnims.splice(k, 1);
  }
}

function undimAll() {
  lifeRestoreFrame = lifeFrame;
  lifeRestoreDeaths.clear();
  deathAnims = [];
  teamAnims = [];
  chars.forEach((g, i) => {
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
    g.position.set(pos[0], g.userData.baseY ?? SH, pos[2]);
    // Rig back to its rest pose. The eased channels (head yaw, gesture
    // weights) are left alone: updateCharacterLife rewrites every joint before
    // the next render, so a phase change never snaps a turning head.
    const L = g.userData.life, R = g.userData.rig;
    if (L) {
      if (L.death) lifeRestoreDeaths.set(i, L.death);
      L.death = null;
      L.dead = false;
      L.dimDone = false;
    }
    if (R) {
      R.body.position.set(0, R.bodyBaseY, 0);
      R.body.rotation.set(0, 0, 0);
      R.upper.position.set(0, R.upperBaseY, 0);
      R.upper.rotation.set(R.baseLean, 0, 0);
      R.upper.scale.set(1, 1, 1);
      R.head.position.y = R.headBaseY;
      R.head.rotation.set(0, 0, 0);
      R.armL.rotation.set(R.armBase.L.x, R.armBase.L.y, R.armBase.L.z);
      R.armR.rotation.set(R.armBase.R.x, R.armBase.R.y, R.armBase.R.z);
    }
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
    const [night, day, vote, resolve, postgame, manifest, dayEn] = await Promise.all([
      fetchJSON('night_result'),
      fetchJSON('day_result'),
      fetchJSON('vote_result'),
      fetchJSON('resolve_result'),
      fetchJSON('postgame_result'),
      fetchRawJSON('manifest'),
      // Structural analysis only (role-claim detection runs on the canonical
      // English transcript); no English prose is ever shown in the zh UI.
      suffix ? fetchRawJSON('day_result') : Promise.resolve(null),
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
    gameData = { night, day, vote, resolve, postgame, manifest, chatHistory, dayEn };
    
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
    gameData.insight = buildInsight();
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
      renderWelcomeModels();
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
  // Remove old characters — and release their GPU buffers, otherwise every
  // game load leaks the previous set's geometry and materials.
  chars.forEach(g => { scene.remove(g); disposeSubtree(g); });
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
      dayIndex: index, replyTo: event.reply_to || null, stance: event.stance || null,
      suspicions: event.suspicions || null,
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
      suspicions: detail.suspicions || null,
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
  const systemAssignedVotes = trace.filter(e => e.phase === 'vote' && e.fallback).length;
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
    systemAssignedVotes,
    otherFallbackEvents: trace.filter(e => e.fallback).length - systemAssignedVotes,
  };
}


// ===== Model Badges =====
// Every seat runs a different LLM. That is the headline of the demo, so the
// model is surfaced as a branded pill everywhere a player is named instead of
// hiding in small grey metadata text.
const MODEL_INFO = {
  'glm5.2':       { label: 'GLM-5.2',      vendor: 'Zhipu AI',    color: '#5b8cff' },
  'kimi':         { label: 'Kimi',         vendor: 'Moonshot AI', color: '#b197fc' },
  'minimax':      { label: 'MiniMax',      vendor: 'MiniMax',     color: '#f783ac' },
  'deepseek-pro': { label: 'DeepSeek Pro', vendor: 'DeepSeek',    color: '#4dabf7' },
  'nemotron':     { label: 'Nemotron',     vendor: 'NVIDIA',      color: '#94d82d' },
  'qwen3.5':      { label: 'Qwen 3.5',     vendor: 'Alibaba',     color: '#ffa94d' },
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function modelInfo(modelId) {
  const id = String(modelId || '').split('/').pop();
  const known = MODEL_INFO[id] || MODEL_INFO[id.toLowerCase()];
  if (known) return { id, ...known };
  const label = id.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { id, label, vendor: '', color: '#e8c468' };
}

function modelBadgeHTML(modelId, extraClass = '') {
  const info = modelInfo(modelId);
  if (!info.id) return '';
  const title = [info.vendor, info.id].filter(Boolean).join(' · ');
  return `<span class="model-badge ${extraClass}" style="--model-color:${info.color}" title="${escapeHTML(title)}">${escapeHTML(info.label)}</span>`;
}

function renderWelcomeModels() {
  const box = document.getElementById('welcome-models');
  if (!box) return;
  box.innerHTML = PLAYERS.map(p => `
    <span class="welcome-model" style="--model-color:${modelInfo(p.model).color}">
      ${modelBadgeHTML(p.model)}
      <span class="who">${escapeHTML(lang === 'zh' ? (p.name_zh || p.name) : p.name)}</span>
    </span>`).join('');
}

// ===== Agent Insight: public claims vs private knowledge =====
// Old archives record speech, @targets, night memory and votes but no
// structured claims, so the viewer derives "who claimed which starting role"
// from the canonical English transcript. Newer engine output may carry an
// explicit `claimed_role`, which always wins over the heuristic.
const CANONICAL_ROLES = ['Werewolf', 'Seer', 'Robber', 'Troublemaker', 'Villager', 'Tanner', 'Minion', 'Insomniac'];
const UNIQUE_ROLES = new Set(['Seer', 'Robber', 'Troublemaker', 'Tanner', 'Minion', 'Insomniac']);
const ROLE_TOKEN_RE = new RegExp(`<?\\b(${CANONICAL_ROLES.join('|')})\\b>?`, 'gi');
const FIRST_PERSON_CLAIM_RE = /\b(?:I\s+(?:was|am|started(?:\s+(?:out|the\s+night))?(?:\s+as)?|woke\s+up\s+as|began\s+as|got)|I'm|I've\s+been|my\s+(?:role|card)\s+(?:was|is)|as\s+the)\s+(?:(?:actually|really|originally|just|indeed|definitely|a|an|the|plain|simple|humble)\s+)*$/i;
const HEDGE_RE = /\b(not|n't|never|if|were|maybe|could|would|claim(?:ed|ing)?\s+to\s+be|pretend|now)\b/i;

function canonicalRole(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return CANONICAL_ROLES.find(r => r.toLowerCase() === v) || null;
}

function extractRoleClaim(text) {
  const source = String(text || '').replace(/[’]/g, "'");
  for (const sentence of source.split(/(?<=[.!?])\s+|\n+/)) {
    ROLE_TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = ROLE_TOKEN_RE.exec(sentence))) {
      const before = sentence.slice(Math.max(0, match.index - 70), match.index);
      if (!FIRST_PERSON_CLAIM_RE.test(before)) continue;
      if (HEDGE_RE.test(before.slice(-40))) continue;
      if (/as\s+the\s+(?:\w+\s+)*$/i.test(before) && !/\bI\b/.test(before)) continue;
      // Quoting someone else ("he said 'I'm a Werewolf'") is not a claim.
      if (/\b(?:said|says|saying|claims?|claimed|told|admit(?:ted|s)?)\b[^.]*['"“‘]/i.test(before)) continue;
      if (/['"“‘][^'"”’]*$/.test(before.replace(/\b\w+'\w+\b/g, ''))) continue;
      return canonicalRole(match[1]);
    }
  }
  return null;
}

function buildInsight() {
  const night = gameData.night?.players || {};
  const initialRole = {};
  const memory = {};
  for (const p of Object.values(night)) {
    initialRole[p.name] = p.initial_role || '';
    memory[p.name] = p.night_memory_text
      || (Array.isArray(p.night_memory) ? p.night_memory.join(' ') : (p.night_memory || ''));
  }
  const localTrace = gameData.day?.day_trace || [];
  const enTrace = (gameData.dayEn || gameData.day)?.day_trace || [];
  const claims = new Map();        // day_trace index -> { role, verdict }
  localTrace.forEach((event, index) => {
    if (event.type !== 'speech') return;
    const en = enTrace[index] || {};
    const role = canonicalRole(event.claimed_role)
      || canonicalRole(en.claimed_role)
      || extractRoleClaim(en.speech || '');
    if (!role) return;
    const truth = initialRole[event.player_name];
    claims.set(index, { role, verdict: truth ? (truth === role ? 'truthful' : 'bluff') : 'unknown' });
  });
  return { initialRole, memory, claims };
}

// Table state as of a replay step: standing claims, who addressed whom, and
// which unique roles are contested. Only day events at or before the step
// are counted, so the graph grows as the debate unfolds.
function tableStateAt(step) {
  const insight = gameData.insight || buildInsight();
  const trace = gameData.day?.day_trace || [];
  const phaseOrder = { night: 0, day: 1, vote: 2, resolve: 3, postgame: 4 };
  const stepPhase = phaseOrder[step?.phase] ?? 4;
  const lastIndex = stepPhase < 1 ? -1
    : stepPhase > 1 ? trace.length - 1
    : (Number.isInteger(step?.dayIndex) ? step.dayIndex : trace.length - 1);
  const standing = {};
  const edges = new Map();
  for (let i = 0; i <= lastIndex; i += 1) {
    const ev = trace[i];
    if (!ev || ev.type !== 'speech') continue;
    const claim = insight.claims.get(i);
    if (claim) standing[ev.player_name] = { ...claim, at: i };
    const to = ev.reply_to || ev.target;
    if (to && to !== ev.player_name) {
      const key = `${ev.player_name}→${to}`;
      const edge = edges.get(key) || { from: ev.player_name, to, count: 0, stance: null, last: -1 };
      edge.count += 1;
      edge.stance = ev.stance || edge.stance;
      edge.last = i;
      edges.set(key, edge);
    }
  }
  const byRole = {};
  for (const [name, claim] of Object.entries(standing)) {
    (byRole[claim.role] = byRole[claim.role] || []).push(name);
  }
  const conflicts = [];
  for (const [role, names] of Object.entries(byRole)) {
    if (!UNIQUE_ROLES.has(role) || names.length < 2) continue;
    for (let a = 0; a < names.length; a += 1) {
      for (let b = a + 1; b < names.length; b += 1) conflicts.push({ role, a: names[a], b: names[b] });
    }
  }
  return { standing, edges: [...edges.values()], conflicts, lastIndex };
}

function roleLabel(role) { return lang === 'zh' ? roleZh(role) : role; }

function verdictLabel(verdict) {
  if (verdict === 'truthful') return lang === 'zh' ? '屬實' : 'TRUTHFUL';
  if (verdict === 'bluff') return lang === 'zh' ? '虛張聲勢' : 'BLUFF';
  return lang === 'zh' ? '未知' : 'UNKNOWN';
}

function stanceLabel(stance) {
  const zh = { accuse: '指控', defend: '辯護', question: '質詢', support: '支持' };
  const en = { accuse: 'accuses', defend: 'defends', question: 'questions', support: 'backs' };
  return (lang === 'zh' ? zh : en)[stance] || (lang === 'zh' ? '回應' : 'addresses');
}

function renderStoryInsight(step) {
  const box = document.getElementById('story-insight');
  if (!box) return;
  const isAgentTurn = step && !step.isCheckpoint && step.actor
    && (step.phase === 'day' || step.phase === 'vote' || step.phase === 'night');
  if (!isAgentTurn) {
    box.innerHTML = '';
    box.classList.remove('visible');
    return;
  }
  const insight = gameData.insight || buildInsight();
  const knows = insight.memory[step.actor] || '';
  const startRole = insight.initialRole[step.actor] || '';
  let says = '';
  if (step.phase === 'day') {
    const claim = Number.isInteger(step.dayIndex) ? insight.claims.get(step.dayIndex) : null;
    const standing = tableStateAt(step).standing[step.actor];
    if (claim) {
      says += `<span class="claim-chip">${escapeHTML(roleLabel(claim.role))}</span>
        <span class="verdict ${claim.verdict}">${verdictLabel(claim.verdict)}</span>`;
    } else if (standing) {
      says += `<span class="dim">${lang === 'zh' ? '沿用先前聲稱' : 'Standing claim'}</span>
        <span class="claim-chip">${escapeHTML(roleLabel(standing.role))}</span>
        <span class="verdict ${standing.verdict}">${verdictLabel(standing.verdict)}</span>`;
    } else {
      says += `<span class="dim">${lang === 'zh' ? '未聲稱身分' : 'No role claimed yet'}</span>`;
    }
    const to = step.replyTo || step.target;
    if (to) {
      says += `<span class="addressed">${stanceLabel(step.stance)} <b style="color:${getPlayerColor(to)}">@${escapeHTML(displayPlayerName(to))}</b></span>`;
    }
  } else if (step.phase === 'vote' && step.target) {
    says = `<span class="addressed">${lang === 'zh' ? '投票給' : 'votes for'} <b style="color:${getPlayerColor(step.target)}">${escapeHTML(displayPlayerName(step.target))}</b></span>`;
  } else if (step.phase === 'night') {
    says = `<span class="dim">${lang === 'zh' ? '夜晚行動不公開' : 'Night actions are secret'}</span>`;
  }
  box.innerHTML = `
    <div class="insight-col private">
      <span class="label">${lang === 'zh' ? '私下所知' : 'PRIVATELY KNOWS'}
        ${startRole ? `<span class="claim-chip true-role" title="${lang === 'zh' ? '起始身分（觀眾視角）' : 'Starting card (viewer only)'}">${escapeHTML(roleLabel(startRole))}</span>` : ''}</span>
      <div class="insight-text">${knows ? formatGameText(knows) : `<span class="dim">${lang === 'zh' ? '沒有夜晚資訊' : 'No night information'}</span>`}</div>
    </div>
    <div class="insight-col public">
      <span class="label">${lang === 'zh' ? '公開聲稱' : 'PUBLICLY CLAIMS'}</span>
      <div class="insight-claims">${says}</div>
    </div>`;
  box.classList.add('visible');
}

// ===== Table Dynamics graph (SVG) =====
const DYN_CX = 150, DYN_CY = 142, DYN_R = 92, DYN_NODE = 19;
let dynamicsCollapsed = innerWidth <= 1180;   // narrow screens start with the graph folded so the table stays visible

function dynNodePos(index) {
  const a = sa(index);
  return [DYN_CX + Math.cos(a) * DYN_R, DYN_CY + Math.sin(a) * DYN_R];
}

function dynEdgePath(from, to, bend = 0.18, inset = DYN_NODE + 4) {
  const [x1, y1] = from, [x2, y2] = to;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const sx = x1 + ux * inset, sy = y1 + uy * inset;
  const ex = x2 - ux * inset, ey = y2 - uy * inset;
  // Bend to the right of travel so A→B and B→A arcs separate.
  const mx = (sx + ex) / 2 - uy * len * bend, my = (sy + ey) / 2 + ux * len * bend;
  return { d: `M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`, mx, my };
}

function renderDynamics(step) {
  const panel = document.getElementById('dynamics-panel');
  const svg = document.getElementById('dynamics-svg');
  if (!panel || !svg || !PLAYERS.length || !gameData.night) return;
  panel.classList.toggle('collapsed', dynamicsCollapsed);
  document.getElementById('dynamics-toggle').setAttribute('aria-expanded', String(!dynamicsCollapsed));
  document.getElementById('dynamics-title').textContent = lang === 'zh' ? '桌面局勢' : 'TABLE DYNAMICS';
  const phase = step?.phase || currentPhase;
  const state = tableStateAt(step || { phase });
  const idx = name => PLAYERS.findIndex(p => p.name === name);
  const executed = (phase === 'vote' || phase === 'resolve' || phase === 'postgame')
    ? (gameData.vote?.executed || []) : [];
  const parts = [];
  // One arrowhead marker per colour: `fill="context-stroke"` would be neater
  // but older Safari renders it black.
  const markerColors = new Map();
  const arrow = color => {
    if (!markerColors.has(color)) markerColors.set(color, `dyn-arrow-${markerColors.size}`);
    return `url(#${markerColors.get(color)})`;
  };
  parts.push('');   // defs placeholder, filled once all colours are known
  parts.push(`<circle cx="${DYN_CX}" cy="${DYN_CY}" r="${DYN_R}" class="dyn-ring"/>`);

  let sub = '';
  if (phase === 'night') {
    sub = lang === 'zh' ? '夜晚 · 秘密行動' : 'Night · secret actions';
    for (const action of recordedNightActions()) {
      const a = idx(action.actor);
      if (a < 0) continue;
      const targets = action.targets?.length ? action.targets : (typeof action.target === 'string' ? [action.target] : []);
      if (action.action === 'swap' && targets.length === 2) {
        const t1 = idx(targets[0]), t2 = idx(targets[1]);
        if (t1 >= 0 && t2 >= 0) {
          const p = dynEdgePath(dynNodePos(t1), dynNodePos(t2), 0.12);
          parts.push(`<path d="${p.d}" class="dyn-edge night swap" marker-start="${arrow('#b197fc')}" marker-end="${arrow('#b197fc')}" style="stroke:#b197fc"/>`);
        }
        continue;
      }
      for (const target of targets) {
        const t = idx(target);
        if (t < 0 || t === a) continue;
        const color = action.action === 'rob' ? '#ffa94d' : '#74c0fc';
        const p = dynEdgePath(dynNodePos(a), dynNodePos(t));
        parts.push(`<path d="${p.d}" class="dyn-edge night" marker-end="${arrow(color)}" style="stroke:${color}"/>`);
      }
    }
  } else {
    const showVotes = phase !== 'day';
    sub = phase === 'day'
      ? (lang === 'zh' ? '白天 · 誰在回應誰' : 'Debate · who addressed whom')
      : (lang === 'zh' ? '投票去向' : 'Ballots');
    for (const edge of state.edges) {
      const a = idx(edge.from), b = idx(edge.to);
      if (a < 0 || b < 0) continue;
      const p = dynEdgePath(dynNodePos(a), dynNodePos(b));
      const current = phase === 'day' && edge.last === step?.dayIndex;
      const width = Math.min(1.3 + edge.count * 0.9, 4.5);
      const color = hexColor(PLAYERS[a].color || 0xe8c468);
      parts.push(`<path d="${p.d}" class="dyn-edge talk${current ? ' current' : ''}${showVotes ? ' faded' : ''}${edge.stance ? ` stance-${edge.stance}` : ''}" marker-end="${arrow(color)}" style="stroke:${color};stroke-width:${width}"/>`);
      if (edge.count > 1 && !showVotes) {
        parts.push(`<text x="${p.mx.toFixed(1)}" y="${(p.my + 3).toFixed(1)}" class="dyn-count">×${edge.count}</text>`);
      }
    }
    if (showVotes) {
      for (const [voter, target] of Object.entries(gameData.vote?.votes || {})) {
        const a = idx(voter), b = idx(target);
        if (a < 0 || b < 0) continue;
        const p = dynEdgePath(dynNodePos(a), dynNodePos(b), 0.1);
        const decisive = executed.includes(target);
        const voteColor = decisive ? '#ff8787' : '#e8c468';
        parts.push(`<path d="${p.d}" class="dyn-edge vote${decisive ? ' decisive' : ''}" marker-end="${arrow(voteColor)}" style="stroke:${voteColor}"/>`);
      }
    }
    for (const c of state.conflicts) {
      const a = idx(c.a), b = idx(c.b);
      if (a < 0 || b < 0) continue;
      const p = dynEdgePath(dynNodePos(a), dynNodePos(b), -0.08, DYN_NODE + 1);
      parts.push(`<path d="${p.d}" class="dyn-conflict"/>`);
      parts.push(`<text x="${p.mx.toFixed(1)}" y="${(p.my + 4).toFixed(1)}" class="dyn-bolt">⚡</text>`);
    }
  }

  const suspicions = step?.suspicions && typeof step.suspicions === 'object' ? step.suspicions : null;
  PLAYERS.forEach((player, i) => {
    const [x, y] = dynNodePos(i);
    const color = hexColor(player.color || 0xe8c468);
    const isActor = step?.actor === player.name;
    const dead = executed.includes(player.name);
    const claim = state.standing[player.name];
    const short = (lang === 'zh' ? (player.name_zh || player.name) : player.name).replace(/^The\s+/, '');
    const below = y > DYN_CY;
    const labelY = below ? y + DYN_NODE + 12 : y - DYN_NODE - 16;
    parts.push(`<g class="dyn-node${isActor ? ' actor' : ''}${dead ? ' dead' : ''}" data-player="${escapeHTML(player.name)}">
      ${isActor ? `<circle cx="${x}" cy="${y}" r="${DYN_NODE + 5}" class="dyn-halo" style="stroke:${color}"/>` : ''}
      <circle cx="${x}" cy="${y}" r="${DYN_NODE}" fill="#141226" stroke="${color}" stroke-width="${isActor ? 3 : 2}"/>
      <image href="${renderAvatarPortrait(player, 64)}" x="${x - DYN_NODE + 2}" y="${y - DYN_NODE + 2}" width="${(DYN_NODE - 2) * 2}" height="${(DYN_NODE - 2) * 2}" clip-path="url(#dyn-clip-${i})" preserveAspectRatio="xMidYMid slice"/>
      ${dead ? `<text x="${x}" y="${y + 6}" class="dyn-dead">✕</text>` : ''}
      <text x="${x}" y="${labelY}" class="dyn-name" style="fill:${getPlayerColor(player.name)}">${escapeHTML(short)}</text>
      ${claim ? `<text x="${x}" y="${labelY + 11}" class="dyn-claim ${claim.verdict}">${escapeHTML(roleLabel(claim.role))}${claim.verdict === 'bluff' ? ' ✗' : claim.verdict === 'truthful' ? ' ✓' : ''}</text>` : ''}
      ${suspicions && suspicions[player.name] !== undefined && !isActor ? `<text x="${x + DYN_NODE - 2}" y="${y - DYN_NODE + 6}" class="dyn-susp" style="fill:hsl(${120 - Math.min(100, Math.max(0, suspicions[player.name])) * 1.2},80%,62%)">${Math.round(suspicions[player.name])}%</text>` : ''}
    </g>`);
  });
  parts[0] = `<defs>
    ${[...markerColors].map(([color, id]) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`).join('')}
    ${PLAYERS.map((_, i) => `<clipPath id="dyn-clip-${i}"><circle cx="${dynNodePos(i)[0]}" cy="${dynNodePos(i)[1]}" r="${DYN_NODE - 2}"/></clipPath>`).join('')}
  </defs>`;
  svg.innerHTML = parts.join('');
  document.getElementById('dynamics-sub').textContent = sub;

  const legend = phase === 'night'
    ? [
        `<span><i style="background:#74c0fc"></i>${lang === 'zh' ? '查驗' : 'inspect'}</span>`,
        `<span><i style="background:#ffa94d"></i>${lang === 'zh' ? '搶奪' : 'rob'}</span>`,
        `<span><i style="background:#b197fc"></i>${lang === 'zh' ? '交換' : 'swap'}</span>`,
      ]
    : [
        `<span><i class="talk"></i>${lang === 'zh' ? '點名回應' : 'addressed'}</span>`,
        phase !== 'day' ? `<span><i class="vote"></i>${lang === 'zh' ? '投票' : 'vote'}</span>` : '',
        `<span><b class="bolt">⚡</b>${lang === 'zh' ? '身分衝突' : 'clashing claims'}</span>`,
        `<span><b class="ok">✓</b>${lang === 'zh' ? '屬實' : 'truthful'} <b class="bad">✗</b>${lang === 'zh' ? '虛張' : 'bluff'}</span>`,
      ];
  document.getElementById('dynamics-legend').innerHTML = legend.filter(Boolean).join('');
  const claimsList = Object.values(state.standing);
  const bluffs = claimsList.filter(c => c.verdict === 'bluff').length;
  document.getElementById('dynamics-stats').textContent = phase === 'night'
    ? (lang === 'zh' ? '只有觀眾看到這些行動，代理只知道自己的夜晚記憶。' : 'Only the viewer sees these. Each agent only knows its own night memory.')
    : (lang === 'zh'
      ? `${claimsList.length} 個身分聲稱 · ${bluffs} 個虛張 · ${state.conflicts.length} 個衝突 · ${state.edges.reduce((n, e) => n + e.count, 0)} 次點名`
      : `${claimsList.length} claims · ${bluffs} bluffs · ${state.conflicts.length} clashes · ${state.edges.reduce((n, e) => n + e.count, 0)} call-outs`);
}

// ===== Screen-space framing around the replay overlays =====
// The replay card covers the lower-left of the screen (the bottom half on
// phones) and the dynamics panel the top-right. Rather than moving the camera
// in world space — which breaks as the camera orbits — shift the projection
// window so the council stays centred in the uncovered part of the screen.
// Name tags, bubbles and vote arrows all project through the same camera, so
// they follow automatically.
const viewShift = { x: 0, y: 0 };
function updateViewShift(dt) {
  const storyOpen = document.body.classList.contains('story-open');
  let tx = 0, ty = 0;
  if (storyOpen && innerWidth > 768) {
    // Mirrors #story-mode's CSS box (left:22px; width:min(560px, 100vw - 44px))
    // so no layout read is needed every frame.
    const cardRight = 22 + Math.min(560, innerWidth - 44);
    const panelLeft = innerWidth - (dynamicsCollapsed ? 16 : 316);
    tx = THREE.MathUtils.clamp((cardRight + panelLeft) / 2 - innerWidth / 2, 0, innerWidth * 0.18);
  } else if (storyOpen) {
    ty = innerHeight * 0.17;
  }
  const k = 1 - Math.exp(-dt * 4);
  viewShift.x += (tx - viewShift.x) * k;
  viewShift.y += (ty - viewShift.y) * k;
  if (Math.abs(viewShift.x) < 0.5 && Math.abs(viewShift.y) < 0.5 && tx === 0 && ty === 0) {
    if (camera.view && camera.view.enabled) { camera.clearViewOffset(); }
    viewShift.x = 0; viewShift.y = 0;
    return;
  }
  camera.setViewOffset(innerWidth, innerHeight, -viewShift.x, viewShift.y, innerWidth, innerHeight);
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

    // Card base — flat card lying on table. The gold frame is painted into the
    // face texture instead of being stroked as an EdgesGeometry outline: a 1px
    // line at this camera angle broke into a jagged dashed border, which read
    // as a torn card. The box is also 2cm wider than the face on every side so
    // the dark body itself forms the visible rim.
    const cardGeo = new THREE.BoxGeometry(0.37, 0.022, 0.52);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, roughness: 0.4, metalness: 0.3,
    });
    const card = new THREE.Mesh(cardGeo, cardMat);
    card.position.set(cx, 0.869, cz);
    card.rotation.y = angle + PI / 2;
    card.castShadow = true;
    card.receiveShadow = true;
    scene.add(card);
    centerCardMeshes.push(card);

    // Role text via CanvasTexture on top face
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128; labelCanvas.height = 256;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#15152a';
    ctx.fillRect(0, 0, 128, 256);
    // Double gold rule: a heavy outer line plus a hairline inset reads as a
    // printed card frame once it is minified down to ~40 screen pixels.
    ctx.strokeStyle = '#e8c468';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 120, 248);
    ctx.strokeStyle = 'rgba(232,196,104,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 104, 232);
    ctx.fillStyle = '#e8c468';
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const roleText = lang === 'zh' ? roleZh(role) : role;
    ctx.fillText(roleText, 64, 100);
    // Question mark for mystery
    ctx.font = 'bold 60px serif';
    ctx.fillStyle = '#e8c46844';
    ctx.fillText('?', 64, 170);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    labelTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const labelGeo = new THREE.PlaneGeometry(0.325, 0.475);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(cx, 0.8815, cz);
    label.rotation.x = -PI / 2;
    label.rotation.z = angle + PI / 2;
    scene.add(label);
    centerCardMeshes.push(label);
  });
}

// ===== Phase Management =====
function setPhase(phase) {
  currentPhase = phase;
  followSuspended = false; // story progression re-engages the cinematic camera
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
      showCurrentRoles(false);
      break;
    case 'vote':
      setNight(false);
      showVoteInfo();
      showCurrentRoles(false);
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

function styleRoleTag(roleSub, color) {
  const background = mixHexColors(LABEL_SURFACE, color, 0.16);
  roleSub.style.setProperty('--role-accent', hexColor(color));
  roleSub.style.setProperty('--role-bg', hexColor(background));
  roleSub.style.setProperty('--role-text', hexColor(readableAccent(color, background)));
}

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
      styleRoleTag(roleSub, roleColor);
    }
    tagEls[i].classList.remove('role-changed', 'role-transitioning');
  });
}

function recordedRoleStates() {
  const resolved = gameData.resolve?.final_roles || {};
  return PLAYERS.map(player => {
    const nightPlayer = Object.values(gameData.night?.players || {}).find(item => item.name === player.name);
    const resolvedPlayer = resolved[player.name] || {};
    return {
      name: player.name,
      initial: resolvedPlayer.initial_role || nightPlayer?.initial_role || '',
      current: resolvedPlayer.current_role || nightPlayer?.current_role || nightPlayer?.initial_role || '',
    };
  }).filter(role => role.initial || role.current);
}

function showCurrentRoles(animateTransition = false) {
  const roleStates = new Map(recordedRoleStates().map(role => [role.name, role]));
  PLAYERS.forEach((player, index) => {
    const state = roleStates.get(player.name);
    const tag = tagEls[index];
    if (!state || !tag) return;
    const roleSub = tag.querySelector('.role-sub');
    const changed = state.initial !== state.current;
    if (roleSub) {
      const roleColor = ROLE_COLORS[state.current] || 0x95a5a6;
      const initialLabel = lang === 'zh' ? roleZh(state.initial) : state.initial;
      const currentLabel = lang === 'zh' ? roleZh(state.current) : state.current;
      roleSub.textContent = animateTransition && changed
        ? `${initialLabel} → ${currentLabel}`
        : changed
          ? `↻ ${currentLabel}`
          : currentLabel;
      styleRoleTag(roleSub, roleColor);
    }
    tag.classList.toggle('role-changed', changed);
    tag.classList.remove('role-transitioning');
    if (animateTransition && changed) {
      void tag.offsetWidth;
      tag.classList.add('role-transitioning');
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
  // Celebrate (hop + arms-up wave) and sulk (slump, head down) are layered into
  // the rig by updateCharacterLife()'s mood channel, eased in and out, and on
  // the body pivot — the old root bounce lifted the seat stone off the dais.
  // teamAnims stays the source of truth for who does which, and when.
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
let storyViewMode = 'summary';
let storyAppliedPhase = null;   // phase whose scene effects are currently applied by the story
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
  if (step?.isCheckpoint || step?.phase === 'resolve') {
    return 9000 / storySpeed;
  }
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

function recordedNightActions() {
  return (gameData.night?.night_trace || []).map(event => ({
    action: event.action || '',
    actor: event.actor || event.player || '',
    target: event.target,
    targets: Array.isArray(event.targets) ? event.targets : [],
    role: event.role || '',
  }));
}

function nightActionSummaryText(action) {
  const role = lang === 'zh' ? roleZh(action.role) : action.role;
  const actor = displayPlayerName(action.actor);
  const target = action.target !== undefined && action.target !== null
    ? (typeof action.target === 'string'
      ? displayPlayerName(action.target)
      : `${lang === 'zh' ? '中央牌' : 'center card'} ${action.target}`)
    : '';
  const targets = (action.targets || []).map(displayPlayerName);
  const prefix = [role, actor].filter(Boolean).join(' · ');
  const separator = lang === 'zh' ? '：' : ': ';
  if (action.action === 'rob') return `${role} · ${actor} ↔ ${target}`;
  if (action.action === 'swap') return `${prefix}${separator}${targets.join(' ↔ ')}`;
  if (action.action === 'inspect_center') {
    return lang === 'zh'
      ? `${prefix}：查看${target || '中央牌'}`
      : `${prefix}: inspected ${target || 'center cards'}`;
  }
  if (action.action === 'inspect_player') {
    return lang === 'zh' ? `${prefix}：查驗${target}` : `${prefix}: inspected ${target}`;
  }
  if (action.action === 'identify_wolves' || action.action === 'peek_wolves' || action.action === 'peek_wolf') {
    const wolves = targets.length ? targets.join(', ') : target;
    return lang === 'zh'
      ? `${prefix}：看見狼人：${wolves}`
      : `${prefix}: saw the werewolf ${wolves}`.trim();
  }
  return `${prefix}${separator}${action.action || (lang === 'zh' ? '沒有行動' : 'no action')}`;
}

function buildRoleTransitionCheckpoint(roles, recordedTotal, recordedBefore) {
  const changedRoles = roles.filter(role => role.initial !== role.current);
  const changedCount = changedRoles.length;
  return {
    id: 'role-transition-checkpoint',
    phase: 'night',
    type: 'role_transition',
    actor: '',
    source: 'game-engine',
    sourceFile: lang === 'zh' ? 'night_result_zh.json' : 'night_result.json',
    sourcePath: 'players.*.(initial_role,current_role)',
    isCheckpoint: true,
    summaryKind: 'night',
    recordedBefore,
    recordedTotal,
    title: storyViewMode === 'summary'
      ? (changedCount
        ? (lang === 'zh' ? `夜晚摘要・${changedCount} 個角色變更` : `Night summary · ${changedCount} role changes`)
        : (lang === 'zh' ? '夜晚摘要・角色未變' : 'Night summary · roles unchanged'))
      : (changedCount
        ? (lang === 'zh' ? '夜晚結束・角色變更' : 'Night complete · role changes')
        : (lang === 'zh' ? '夜晚結束・角色未變' : 'Night complete · roles unchanged')),
    body: changedCount
      ? (lang === 'zh'
        ? `已記錄的夜晚交換令 ${changedCount} 名玩家的最終角色改變。以下是投票與結算所採用的牌面位置。`
        : `The recorded night swaps changed ${changedCount} players’ final roles. These are the card positions used for voting and resolution.`)
      : (lang === 'zh'
        ? '本局的已記錄夜晚行動沒有改變任何玩家的最終角色。'
        : 'The recorded night actions did not change any player’s final role.'),
    roleChanges: changedRoles,
    nightActions: recordedNightActions(),
  };
}

function recordedBallots() {
  const traceByPlayer = new Map(
    (gameData.vote?.vote_trace || []).map(item => [item.player, item]),
  );
  return Object.entries(gameData.vote?.votes || {}).map(([voter, target]) => {
    const detail = traceByPlayer.get(voter) || {};
    return {
      voter,
      target,
      systemAssigned: Boolean(detail.error || detail.fallback),
      error: detail.error || '',
    };
  });
}

function buildVoteSummaryCheckpoint(recordedTotal, recordedStart, recordedEnd) {
  const ballots = recordedBallots();
  const tally = Object.entries(gameData.vote?.tally || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const executed = gameData.vote?.executed || [];
  const executedNames = executed.map(displayPlayerName);
  const highestCount = tally.length ? tally[0].count : 0;
  const systemAssignedCount = ballots.filter(ballot => ballot.systemAssigned).length;
  const title = executed.length === 1
    ? (lang === 'zh'
      ? `投票結果・${executedNames[0]}被處決`
      : `Voting result · ${executedNames[0]} executed`)
    : executed.length > 1
      ? (lang === 'zh'
        ? `投票結果・${executed.length}名玩家被處決`
        : `Voting result · ${executed.length} players executed`)
      : (lang === 'zh' ? '投票結果・無人被處決' : 'Voting result · no execution');
  const resultBody = lang === 'zh'
    ? `全部 ${ballots.length} 張選票同時揭示。最高票為 ${highestCount} 票。${executed.length
      ? `最終處決：${executedNames.join('、')}。`
      : '本輪沒有玩家被處決。'}`
    : `All ${ballots.length} ballots were revealed together. The highest tally was ${highestCount}. ${executed.length
      ? `Executed: ${executedNames.join(', ')}.`
      : 'No player was executed.'}`;
  const assignmentDisclosure = systemAssignedCount
    ? (lang === 'zh'
      ? `其中 ${systemAssignedCount} 張選票因 AI 請求失敗或逾時而由系統隨機指定，並非代理的決策。`
      : `${systemAssignedCount} ${systemAssignedCount === 1 ? 'vote was' : 'votes were'} randomly assigned by the system after an AI request failed or timed out; ${systemAssignedCount === 1 ? 'it was not' : 'they were not'} agent decisions.`)
    : '';
  return {
    id: 'vote-summary-checkpoint',
    phase: 'vote',
    type: 'vote_summary',
    actor: '',
    source: 'game-engine',
    sourceFile: lang === 'zh' ? 'vote_result_zh.json' : 'vote_result.json',
    sourcePath: 'votes,tally,executed',
    isCheckpoint: true,
    summaryKind: 'vote',
    recordedStart,
    recordedEnd,
    recordedTotal,
    title,
    body: [resultBody, assignmentDisclosure].filter(Boolean).join(lang === 'zh' ? '' : ' '),
    ballots,
    tally,
    executed,
    systemAssignedCount,
  };
}

function buildRecordedReplay() {
  const roles = recordedRoleStates();
  const recordedTrace = gameData.structuredTrace || [];
  const recordedTotal = recordedTrace.length;
  const replay = recordedTrace.map((event, index) => ({
    ...event,
    recordedOrdinal: index + 1,
    recordedTotal,
    title: recordedEventTitle(event),
    body: recordedEventBody(event),
    roleChanges: event.phase === 'resolve' ? roles : [],
  }));
  const firstDayIndex = replay.findIndex(event => event.phase === 'day');
  if (firstDayIndex >= 0) {
    replay.splice(
      firstDayIndex,
      0,
      buildRoleTransitionCheckpoint(roles, recordedTotal, firstDayIndex),
    );
  }
  const voteSteps = replay.filter(event => event.phase === 'vote' && !event.isCheckpoint);
  if (voteSteps.length) {
    let lastVoteIndex = -1;
    for (let index = replay.length - 1; index >= 0; index -= 1) {
      if (replay[index].phase === 'vote' && !replay[index].isCheckpoint) {
        lastVoteIndex = index;
        break;
      }
    }
    replay.splice(
      lastVoteIndex + 1,
      0,
      buildVoteSummaryCheckpoint(
        recordedTotal,
        voteSteps[0].recordedOrdinal,
        voteSteps[voteSteps.length - 1].recordedOrdinal,
      ),
    );
  }
  if (storyViewMode === 'summary') {
    return replay.filter(event =>
      !((event.phase === 'night' || event.phase === 'vote') && !event.isCheckpoint)
    );
  }
  return replay;
}

function storyKicker(step) {
  if (step.isCheckpoint) {
    return step.summaryKind === 'vote'
      ? (lang === 'zh' ? '已記錄的投票結果' : 'RECORDED VOTE RESULT')
      : (lang === 'zh' ? '已記錄的牌面狀態' : 'RECORDED TABLE STATE');
  }
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

function updateStoryViewToggle() {
  document.getElementById('story-view-label').textContent =
    lang === 'zh' ? '重播內容' : 'Replay view';
  const summary = document.getElementById('story-view-summary');
  const full = document.getElementById('story-view-full');
  summary.textContent = lang === 'zh' ? '摘要' : 'Summary';
  full.textContent = lang === 'zh' ? '完整軌跡' : 'Full trace';
  summary.classList.toggle('active', storyViewMode === 'summary');
  full.classList.toggle('active', storyViewMode === 'full');
  summary.setAttribute('aria-pressed', String(storyViewMode === 'summary'));
  full.setAttribute('aria-pressed', String(storyViewMode === 'full'));
}

function setStoryViewMode(mode) {
  if (mode !== 'summary' && mode !== 'full') return;
  const currentStep = storySteps[storyIndex];
  stopStoryPlayback();
  storyViewMode = mode;
  const rebuilt = buildRecordedReplay();
  let nextIndex = 0;
  if (
    currentStep?.isCheckpoint
    || (mode === 'summary' && (currentStep?.phase === 'night' || currentStep?.phase === 'vote'))
  ) {
    nextIndex = rebuilt.findIndex(step =>
      step.isCheckpoint && step.phase === currentStep?.phase
    );
  } else if (currentStep?.recordedOrdinal) {
    nextIndex = rebuilt.findIndex(step => step.recordedOrdinal === currentStep.recordedOrdinal);
  }
  storySteps = rebuilt;
  storyIndex = THREE.MathUtils.clamp(nextIndex < 0 ? 0 : nextIndex, 0, Math.max(0, storySteps.length - 1));
  buildStoryPhaseNav();
  updateStoryViewToggle();
  renderStoryStep();
}

function buildStoryPhaseNav() {
  const nav = document.getElementById('story-phase-nav');
  nav.innerHTML = '';
  for (const phase of STORY_PHASES) {
    const summaryPhase =
      storyViewMode === 'summary' && (phase === 'night' || phase === 'vote');
    const phaseSteps = storySteps.filter(step =>
      step.phase === phase && (summaryPhase ? step.isCheckpoint : !step.isCheckpoint)
    );
    const count = phaseSteps.length;
    if (!count) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.phase = phase;
    button.innerHTML = summaryPhase
      ? (phase === 'night'
        ? `${lang === 'zh' ? '夜晚摘要' : 'Night summary'}`
        : `${lang === 'zh' ? '投票摘要' : 'Voting summary'}`)
      : `${storyPhaseLabel(phase)} <span class="count">${count}</span>`;
    button.addEventListener('click', () => {
      const nextIndex = storySteps.findIndex(step =>
        step.phase === phase && (summaryPhase ? step.isCheckpoint : !step.isCheckpoint)
      );
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
    icon.textContent = step.isCheckpoint
      ? (step.summaryKind === 'vote' ? '✓' : '↔')
      : step.phase === 'resolve' ? '⚙' : '◆';
  }
}

function renderStoryStep() {
  if (!storySteps.length) return;
  const step = storySteps[storyIndex];
  // Re-entering the same phase on every step restarted phase-level effects
  // (night light ramp, vote arrows, confetti, camera shots) once per line of
  // dialogue. Only apply the phase when the story actually crosses into it.
  if (storyAppliedPhase !== step.phase) {
    setPhase(step.phase);
    storyAppliedPhase = step.phase;
  }
  if (step.isCheckpoint && step.summaryKind === 'night') showCurrentRoles(true);
  closeSidePanel();
  clearBubbles();
  replayControls.classList.remove('visible');
  document.getElementById('story-phase-badge').textContent = step.isCheckpoint
    ? step.summaryKind === 'vote'
      ? (lang === 'zh' ? '投票摘要' : 'Voting summary')
      : storyViewMode === 'summary'
        ? (lang === 'zh' ? '夜晚摘要' : 'Night summary')
        : (lang === 'zh' ? '夜晚結果' : 'Night result')
    : storyPhaseLabel(step.phase);
  document.getElementById('story-game-id').textContent =
    `${lang === 'zh' ? '遊戲' : 'GAME'} ${String(currentGame || '').replace('game_', '').replace('game-', '')}`;
  document.getElementById('story-kicker').textContent = storyKicker(step);
  document.getElementById('story-title').textContent = step.title || '';
  const body = document.getElementById('story-body');
  body.innerHTML = formatGameText(step.body || '');
  body.scrollTop = 0;
  renderStoryAvatar(step);
  const actor = step.actor
    ? displayPlayerName(step.actor)
    : step.summaryKind === 'vote'
      ? (lang === 'zh' ? '已記錄選票' : 'Recorded ballots')
      : (lang === 'zh' ? '遊戲規則引擎' : 'Game rules engine');
  const model = (step.model || '').split('/').pop();
  document.getElementById('story-agent-sub').innerHTML =
    `${escapeHTML(actor)}${model ? ` ${modelBadgeHTML(model)}` : ''}`;
  const recordedSteps = storySteps.filter(storyStep => !storyStep.isCheckpoint);
  const phaseSteps = recordedSteps.filter(storyStep => storyStep.phase === step.phase);
  if (step.isCheckpoint) {
    document.getElementById('story-progress').textContent = step.summaryKind === 'vote'
      ? (lang === 'zh'
        ? `投票摘要・涵蓋第 ${step.recordedStart}–${step.recordedEnd} 個事件，共 ${step.recordedTotal} 個`
        : `Voting summary · recorded events ${step.recordedStart}–${step.recordedEnd} of ${step.recordedTotal}`)
      : storyViewMode === 'summary'
        ? (lang === 'zh'
          ? `夜晚摘要・涵蓋第 1–${step.recordedBefore} 個事件，共 ${step.recordedTotal} 個`
          : `Night summary · recorded events 1–${step.recordedBefore} of ${step.recordedTotal}`)
        : (lang === 'zh'
          ? `角色變更・在第 ${step.recordedBefore}/${step.recordedTotal} 個已記錄事件之後`
          : `Role transition · after recorded event ${step.recordedBefore}/${step.recordedTotal}`);
    const checkpointOrdinal = step.summaryKind === 'vote' ? step.recordedEnd : step.recordedBefore;
    document.getElementById('story-progress-fill').style.width =
      `${(checkpointOrdinal / Math.max(1, step.recordedTotal)) * 100}%`;
  } else {
    const phaseIndex = phaseSteps.findIndex(storyStep => storyStep.id === step.id) + 1;
    document.getElementById('story-progress').textContent = lang === 'zh'
      ? `${storyPhaseLabel(step.phase)} ${phaseIndex}/${phaseSteps.length} · 第 ${step.recordedOrdinal}/${step.recordedTotal} 個已記錄事件`
      : `${storyPhaseLabel(step.phase)} ${phaseIndex}/${phaseSteps.length} · recorded event ${step.recordedOrdinal}/${step.recordedTotal}`;
    document.getElementById('story-progress-fill').style.width =
      `${(step.recordedOrdinal / Math.max(1, step.recordedTotal)) * 100}%`;
  }
  document.querySelectorAll('#story-phase-nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.phase === step.phase);
  });
  const rationale = document.getElementById('story-rationale');
  const privateLabel = step.phase === 'day' || step.phase === 'vote' || step.phase === 'night'
    ? (lang === 'zh' ? '私下推理・其他代理看不到' : 'PRIVATE REASONING · hidden from other agents')
    : (lang === 'zh' ? '記錄理由' : 'RECORDED RATIONALE');
  rationale.innerHTML = step.reasoning
    ? `<span class="label">${privateLabel}</span>${formatGameText(step.reasoning)}`
    : '';
  rationale.classList.toggle('visible', Boolean(step.reasoning));
  renderStoryInsight(step);
  renderDynamics(step);
  const meta = [];
  if (step.isCheckpoint) {
    meta.push(step.summaryKind === 'vote'
      ? (lang === 'zh' ? '同時揭示的投票摘要' : 'simultaneous vote summary')
      : storyViewMode === 'summary'
        ? (lang === 'zh' ? '完整夜晚摘要' : 'complete night summary')
        : (lang === 'zh' ? '夜晚後的牌面位置' : 'post-night card positions'));
  }
  if (step.thinking) meta.push(`thinking=${step.thinking}`);
  if (step.latencyMs !== null && step.latencyMs !== undefined) meta.push(`${step.latencyMs}ms`);
  meta.push(step.fallback
    ? step.phase === 'vote'
      ? (lang === 'zh' ? '系統代投・並非代理決策' : 'system-assigned vote · not an agent decision')
      : (lang === 'zh' ? '運行回退／錯誤' : 'runtime fallback/error')
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
  roleBox.classList.toggle('transition', Boolean(step.isCheckpoint));
  roleBox.classList.toggle('vote-summary', step.summaryKind === 'vote');
  if (step.isCheckpoint) {
    if (step.summaryKind === 'vote') {
      const maxVotes = Math.max(1, ...(step.tally || []).map(item => item.count));
      roleBox.innerHTML = `
        <div class="vote-summary-header">
          <strong>${lang === 'zh'
            ? `${(step.ballots || []).length} 張選票・${step.systemAssignedCount || 0} 張系統代投`
            : `${(step.ballots || []).length} ballots · ${step.systemAssignedCount || 0} system-assigned`}</strong>
          <span>${lang === 'zh' ? '所有選票同時揭示' : 'All ballots revealed together'}</span>
        </div>
        ${(step.systemAssignedCount || 0) > 0 ? `
          <div class="vote-integrity-note">
            <strong>${lang === 'zh' ? '系統代投說明' : 'Why were votes system-assigned?'}</strong>
            <span>${lang === 'zh'
              ? `${step.systemAssignedCount} 個 AI 投票請求失敗或逾時。遊戲引擎為了完成該局，從有效對象中隨機選擇目標；這些選票並非代理的決策。`
              : `${step.systemAssignedCount} AI vote ${step.systemAssignedCount === 1 ? 'request failed or timed out' : 'requests failed or timed out'}. To complete the recorded game, the engine randomly selected valid targets. These ballots are not agent decisions.`}</span>
          </div>` : ''}
        <div class="role-summary-label">${lang === 'zh' ? '投票去向' : 'Ballots'}</div>
        <div class="vote-ballot-grid">
          ${(step.ballots || []).map(ballot => `
            <div class="vote-ballot${ballot.systemAssigned ? ' system-assigned' : ''}">
              <span>${displayPlayerName(ballot.voter)}</span>
              <b>→</b>
              <strong>${displayPlayerName(ballot.target)}</strong>
              ${ballot.systemAssigned ? `<em>${lang === 'zh' ? '系統代投' : 'SYSTEM-ASSIGNED'}</em>` : ''}
            </div>`).join('')}
        </div>
        <div class="role-summary-label">${lang === 'zh' ? '票數統計' : 'Tally'}</div>
        <div class="vote-tally-list">
          ${(step.tally || []).map(item => `
            <div class="vote-tally-row${(step.executed || []).includes(item.name) ? ' executed' : ''}">
              <span>${displayPlayerName(item.name)}</span>
              <i><u style="width:${(item.count / maxVotes) * 100}%"></u></i>
              <strong>${item.count}</strong>
            </div>`).join('')}
        </div>
        <div class="vote-executed">
          <span>${lang === 'zh' ? '處決結果' : 'Execution result'}</span>
          <strong>${(step.executed || []).length
            ? (step.executed || []).map(displayPlayerName).join(lang === 'zh' ? '、' : ', ')
            : (lang === 'zh' ? '無人' : 'No one')}</strong>
        </div>`;
    } else {
      const changedCount = (step.roleChanges || []).length;
      const actionCount = (step.nightActions || []).length;
      roleBox.innerHTML = `
        <div class="role-transition-header">
          <strong>${lang === 'zh'
            ? `夜晚摘要・${actionCount} 個行動・${changedCount} 個角色變更`
            : `Night summary · ${actionCount} actions · ${changedCount} role changes`}</strong>
          <span>${lang === 'zh' ? '觀眾牌面・代理只知道自己的夜晚記憶' : 'Viewer table state · agents only know their own night memory'}</span>
        </div>
        ${(step.nightActions || []).length ? `<div class="role-summary-label">${lang === 'zh' ? '所有已記錄的夜晚行動' : 'All recorded night actions'}</div>
        <div class="night-action-summary-list">
          ${(step.nightActions || []).map(action => `<span>${nightActionSummaryText(action)}</span>`).join('')}
        </div>` : ''}
        <div class="role-summary-label">${lang === 'zh' ? '夜晚結束後的角色' : 'Roles after night'}</div>
        <div class="role-transition-grid">
          ${changedCount
            ? (step.roleChanges || []).map((role, index) => `
              <div class="role-transition-card" style="--role-delay:${index * 90}ms">
                <span class="agent">${displayPlayerName(role.name)}</span>
                <span class="role-path">
                  <span class="role-chip from">${lang === 'zh' ? roleZh(role.initial) : role.initial}</span>
                  <span class="arrow">→</span>
                  <span class="role-chip to">${lang === 'zh' ? roleZh(role.current) : role.current}</span>
                </span>
              </div>`).join('')
            : `<div class="role-transition-none">${lang === 'zh' ? '沒有角色牌改變位置。' : 'No role cards changed position.'}</div>`}
        </div>`;
    }
  } else {
    for (const r of step.roleChanges || []) {
      const changed = r.initial !== r.current;
      roleBox.innerHTML += `<div class="role-change${changed ? ' changed' : ''}">
        <span class="agent">${displayPlayerName(r.name)}</span>
        <span class="roles">${lang === 'zh' ? roleZh(r.initial) : r.initial}<span class="arrow">→</span>${lang === 'zh' ? roleZh(r.current) : r.current}</span>
      </div>`;
    }
  }
  chars.forEach((_, i) => highlightCharacter(i, false));
  if (step.actor) {
    const idx = PLAYERS.findIndex(p => p.name === step.actor);
    if (idx >= 0) {
      highlightCharacter(idx, true);
      if (step.phase === 'day' && step.type === 'speech') {
        setSpeakerFocus(idx, true);
        setSpeaking(idx, true);
        // Body language for call-outs (provided by the character-life module).
        const to = step.replyTo || step.target;
        const targetIdx = to ? PLAYERS.findIndex(p => p.name === to) : -1;
        if (targetIdx >= 0 && targetIdx !== idx) {
          if (typeof pointAt === 'function') pointAt(idx, targetIdx);
          if (typeof reactToAccusation === 'function') reactToAccusation(targetIdx, idx);
        }
      }
    }
  }
}

function openStoryMode(autoPlay = false, startIndex = 0, preserveViewMode = false) {
  if (!preserveViewMode) storyViewMode = 'summary';
  storySteps = buildRecordedReplay();
  if (!storySteps.length) return;
  storyIndex = THREE.MathUtils.clamp(startIndex, 0, storySteps.length - 1);
  storyPlaying = false;
  storyAppliedPhase = null;
  storySpeed = 1.5;
  document.getElementById('story-play').textContent = '▶';
  document.getElementById('story-speed').textContent = '1.5×';
  buildStoryPhaseNav();
  updateStoryViewToggle();
  document.body.classList.add('story-open');
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
  storyAppliedPhase = null;
  document.body.classList.remove('story-open');
  document.getElementById('story-mode').classList.remove('visible');
  clearSpeakerFocus();
  speakingStates = [];
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
    <div class="row"><span class="key">${lang === 'zh' ? '系統代投' : 'System-assigned votes'}</span><span class="val">${meta.systemAssignedVotes || 0}</span></div>
    <div class="row"><span class="key">${lang === 'zh' ? '其他運行回退／錯誤' : 'Other runtime fallbacks/errors'}</span><span class="val">${meta.otherFallbackEvents || 0}</span></div>
    ${meta.createdAt ? `<div class="row"><span class="key">${lang === 'zh' ? '開始記錄' : 'Started'}</span><span class="val">${formatRecordedAt(meta.createdAt)}</span></div>` : ''}
    ${meta.completedAt ? `<div class="row"><span class="key">${lang === 'zh' ? '完成記錄' : 'Completed'}</span><span class="val">${formatRecordedAt(meta.completedAt)}</span></div>` : ''}
  </div>`;
  html += `<div class="panel-section"><h3>${lang === 'zh' ? '模型陣容' : 'Model Roster'}</h3>`;
  for (const agent of meta.roster || []) {
    html += `<div class="agent-trace-card"><strong>${displayPlayerName(agent.name)}</strong> ${modelBadgeHTML(agent.model)}
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
    ${d.voteEvent?.fallback ? `<div class="row"><span class="key">${lang === 'zh' ? '投票狀態' : 'Vote status'}</span><span class="val" style="color:var(--danger)">${lang === 'zh' ? '系統代投・並非代理決策' : 'System-assigned · not an agent decision'}</span></div>` : ''}
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
      const source = e.fallback
        ? e.phase === 'vote'
          ? (lang === 'zh' ? '系統代投' : 'system-assigned')
          : (lang === 'zh' ? '運行回退' : 'runtime fallback')
        : e.source;
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
  const accent = getPlayerColor(p.name);
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
  const accent = getPlayerColor(p.name);
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
  gallery3DCamera.lookAt(0, HEAD_Y, 0);

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
  gallery3DChar.position.set(0, gallery3DChar.userData.baseY ?? SH, 0);
  gallery3DChar.rotation.y = 0;
  gallery3DScene.add(gallery3DChar);

  resizeGallery3D();

  const animate = () => {
    gallery3DAnimId = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;
    if (gallery3DChar) {
      gallery3DChar.rotation.y = Math.sin(t * 0.3) * 0.3;
      gallery3DChar.position.y = (gallery3DChar.userData.baseY ?? SH) + Math.sin(t * 1.5) * 0.03;
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
      gallery3DCamera.lookAt(0, HEAD_Y, 0);
    } else {
      gallery3DCamera.position.set(0, 2.0, 5.5);
      gallery3DCamera.lookAt(0, HEAD_Y, 0);
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
  const accent = getPlayerColor(p.name);
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

// ===== Basic Rules Onboarding =====
let rulesStep = 0;
let rulesReplayAfter = false;

function rulesSlides() {
  if (lang === 'zh') {
    return [
      {
        title: '九張角色牌，六名玩家，資訊彼此隔離',
        body: '六個 AI 代理各自獲得一張角色牌，另外三張牌面朝下放在中央。每個代理開始時只知道自己的初始角色，以及該角色在夜晚允許它取得的資訊。',
        note: '畫面可以向觀眾揭示完整牌面，但代理不會收到全知的遊戲狀態。',
      },
      {
        title: '夜晚行動可能改變角色',
        body: '角色會按照固定順序執行夜晚能力。預言家可以查看牌，強盜可以與另一名玩家交換牌，搗蛋鬼可以交換兩名其他玩家的牌。勝負由玩家最後持有的角色決定。',
        note: '因此，代理可能誠實描述自己的記憶，但它的最終角色仍可能已被其他玩家改變。',
      },
      {
        title: '聲稱、質疑、投票，然後揭示結果',
        body: '白天討論時，代理根據私有記憶、其他人的聲稱與矛盾之處進行推理。之後每名代理投票給另一名玩家，最高票者（包含同票者）被處決，所有最終角色隨即揭示。',
        note: '村民陣營希望處決狼人；若狼人牌全在中央，則應避免錯誤處決。狼人希望存活，皮匠則希望自己被處決。',
      },
    ];
  }
  return [
    {
      title: 'Nine role cards, six players, isolated information',
      body: 'Six AI agents each receive one role card, while three cards remain face down in the center. Every agent begins with only its initial role and the private information its role can obtain during the night.',
      note: 'The interface may reveal the full table to you, but the agents never receive omniscient game state.',
    },
    {
      title: 'Night actions can change who you are',
      body: 'Roles act in a fixed night order. The Seer can inspect cards, the Robber can trade cards with another player, and the Troublemaker can swap two other players. A player wins or loses according to the role it holds at the end.',
      note: 'An agent can truthfully report its memory even when another player has secretly changed its final role.',
    },
    {
      title: 'Claim, challenge, vote, then reveal',
      body: 'During discussion, agents reason from private memories, other players’ claims, and contradictions. Each agent then votes for another player. The highest-voted player—or tied players—is executed and every final role is revealed.',
      note: 'The village wants a Werewolf executed, but should avoid a wrongful execution if every Werewolf is in the center. Werewolves want to survive; the Tanner wants to be executed.',
    },
  ];
}

function rulesVisualMarkup(step) {
  if (step === 0) {
    const centerLabel = lang === 'zh' ? '三張中央牌' : '3 CENTER CARDS';
    return `<div class="rules-deal">
      ${Array.from({ length: 6 }, (_, index) => `<span class="rules-agent-token">AI ${index + 1}</span>`).join('')}
      <div class="rules-center-cards"><span></span><span></span><span></span></div>
      <div class="rules-center-label">${centerLabel}</div>
    </div>`;
  }
  if (step === 1) {
    return `<div class="rules-role-flow">
      <div class="rules-role-card">
        <span>${lang === 'zh' ? '初始角色' : 'INITIAL ROLE'}</span>
        <strong>${lang === 'zh' ? '強盜' : 'ROBBER'}</strong>
      </div>
      <div class="rules-night-action">
        <div class="arrow">→</div>
        <span>${lang === 'zh' ? '查看・偷換・交換' : 'INSPECT · ROB · SWAP'}</span>
      </div>
      <div class="rules-role-card changed">
        <span>${lang === 'zh' ? '最終角色' : 'FINAL ROLE'}</span>
        <strong>${lang === 'zh' ? '預言家' : 'SEER'}</strong>
      </div>
    </div>`;
  }
  const labels = lang === 'zh'
    ? [
        ['☾', '夜晚'],
        ['◌', '討論'],
        ['✓', '投票'],
        ['◆', '揭示'],
      ]
    : [
        ['☾', 'NIGHT'],
        ['◌', 'DISCUSS'],
        ['✓', 'VOTE'],
        ['◆', 'REVEAL'],
      ];
  const wins = lang === 'zh'
    ? ['村民：找出狼人', '狼人：避免被處決', '皮匠：讓自己被處決']
    : ['Village: find the wolf', 'Werewolves: survive', 'Tanner: get executed'];
  return `<div class="rules-game-loop">
    ${labels.map(([icon, label], index) => `
      <div class="rules-loop-step"><span class="icon">${icon}</span><strong>${label}</strong></div>
      ${index < labels.length - 1 ? '<span class="rules-loop-arrow">→</span>' : ''}
    `).join('')}
    <div class="rules-win-row">${wins.map(value => `<span>${value}</span>`).join('')}</div>
  </div>`;
}

function renderRulesStep() {
  const slides = rulesSlides();
  const slide = slides[rulesStep];
  if (!slide) return;
  document.getElementById('rules-eyebrow').textContent =
    lang === 'zh' ? '遊戲規則簡介' : 'HOW THE GAME WORKS';
  document.getElementById('rules-step-label').textContent =
    lang === 'zh' ? `第 ${rulesStep + 1} 步，共 ${slides.length} 步` : `STEP ${rulesStep + 1} OF ${slides.length}`;
  document.getElementById('rules-title').textContent = slide.title;
  document.getElementById('rules-body').textContent = slide.body;
  document.getElementById('rules-note').textContent = slide.note;
  document.getElementById('rules-visual').innerHTML = rulesVisualMarkup(rulesStep);
  document.getElementById('rules-lang').textContent = t('langLabel');
  document.getElementById('rules-dots').innerHTML = slides
    .map((_, index) => `<span class="${index === rulesStep ? 'active' : ''}"></span>`)
    .join('');
  const previous = document.getElementById('rules-prev');
  previous.textContent = lang === 'zh' ? '上一步' : 'Back';
  previous.disabled = rulesStep === 0;
  const finalStep = rulesStep === slides.length - 1;
  document.getElementById('rules-next').textContent = finalStep
    ? rulesReplayAfter
      ? (lang === 'zh' ? '開始重播' : 'Start Replay')
      : (lang === 'zh' ? '完成' : 'Done')
    : (lang === 'zh' ? '下一步' : 'Next');
  document.getElementById('rules-skip').textContent = rulesReplayAfter
    ? (lang === 'zh' ? '略過並重播' : 'Skip & Replay')
    : (lang === 'zh' ? '關閉' : 'Close');
}

function launchLatestReplayWhenReady() {
  const startedAt = performance.now();
  const launch = () => {
    if (gameData.night) {
      openStoryMode(true);
      return;
    }
    if (performance.now() - startedAt < 10000) setTimeout(launch, 150);
  };
  setTimeout(launch, 150);
}

function openRules(replayAfter = false) {
  closeStoryMode();
  closeSidePanel();
  document.getElementById('archive-panel').classList.remove('open');
  rulesReplayAfter = replayAfter;
  rulesStep = 0;
  const overlay = document.getElementById('rules-overlay');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  renderRulesStep();
}

function closeRules(startReplay = false) {
  const overlay = document.getElementById('rules-overlay');
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  const shouldReplay = startReplay && rulesReplayAfter;
  rulesReplayAfter = false;
  if (shouldReplay) launchLatestReplayWhenReady();
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
      if (restoreStory) openStoryMode(false, savedStoryIndex, true);
      else if (openPanelView === 'about') showAboutPanel();
      else if (openPanelView === 'proof') showProofPanel();
      else setPhase(savedPhase);
    });
  } else if (gameData.night) {
    const savedPhase = currentPhase;
    if (restoreStory) openStoryMode(false, savedStoryIndex, true);
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
    openRules(true);
  });
  document.getElementById('welcome-explore').addEventListener('click', dismissWelcome);
  document.getElementById('welcome-lang').addEventListener('click', toggleLanguage);
  // Dismiss on Escape or click outside the card
  welcomeOverlay.addEventListener('click', (e) => {
    if (e.target === welcomeOverlay) dismissWelcome();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('rules-overlay').classList.contains('visible')) {
      closeRules(false);
      return;
    }
    if (e.key === 'Escape' && !welcomeOverlay.classList.contains('hidden')) {
      dismissWelcome();
    }
  });

  // Phase steps. While the recorded replay is open it owns the scene, so the
  // timeline navigates the replay instead of opening a competing side panel.
  document.querySelectorAll('.phase-step').forEach(el => {
    el.addEventListener('click', () => {
      if (document.getElementById('story-mode').classList.contains('visible')) {
        const nextIndex = storySteps.findIndex(step => step.phase === el.dataset.phase);
        if (nextIndex >= 0) {
          stopStoryPlayback();
          storyIndex = nextIndex;
          renderStoryStep();
        }
        return;
      }
      setPhase(el.dataset.phase);
    });
  });

  // Compact top menu (mobile): secondary actions collapse behind ☰.
  const topbar = document.getElementById('topbar');
  const menuBtn = document.getElementById('btn-menu');
  const setMenu = open => {
    topbar.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    setMenu(!topbar.classList.contains('menu-open'));
  });
  document.getElementById('top-menu').addEventListener('click', e => {
    if (e.target.closest('.btn')) setMenu(false);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#topbar')) setMenu(false);
  });

  document.getElementById('dynamics-toggle').addEventListener('click', () => {
    dynamicsCollapsed = !dynamicsCollapsed;
    renderDynamics(storySteps[storyIndex]);
  });

  // Buttons
  document.getElementById('btn-night').addEventListener('click', e => {
    const btn = e.currentTarget;
    const n = !btn.classList.contains('active');
    btn.classList.toggle('active', n);
    setNight(n);
  });

  document.getElementById('btn-rotate').addEventListener('click', e => {
    setAutoRotate(!autoRotate);
    if (autoRotate) followSuspended = false; // Auto doubles as "resume cinematic follow"
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
  document.getElementById('btn-rules').addEventListener('click', () => openRules(false));
  document.getElementById('btn-story').addEventListener('click', () => openStoryMode(false));
  document.getElementById('btn-proof').addEventListener('click', showProofPanel);
  document.getElementById('btn-panel-close').addEventListener('click', () => {
    closeSidePanel();
  });

  document.getElementById('btn-lang').addEventListener('click', toggleLanguage);
  document.getElementById('rules-lang').addEventListener('click', toggleLanguage);
  document.getElementById('rules-close').addEventListener('click', () => closeRules(false));
  document.getElementById('rules-overlay').addEventListener('click', event => {
    if (event.target.id === 'rules-overlay') closeRules(false);
  });
  document.getElementById('rules-prev').addEventListener('click', () => {
    if (rulesStep <= 0) return;
    rulesStep -= 1;
    renderRulesStep();
  });
  document.getElementById('rules-next').addEventListener('click', () => {
    const finalStep = rulesStep >= rulesSlides().length - 1;
    if (finalStep) {
      closeRules(true);
      return;
    }
    rulesStep += 1;
    renderRulesStep();
  });
  document.getElementById('rules-skip').addEventListener('click', () => closeRules(true));

  document.getElementById('story-view-summary').addEventListener('click', () => setStoryViewMode('summary'));
  document.getElementById('story-view-full').addEventListener('click', () => setStoryViewMode('full'));
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
  document.getElementById('btn-rules').innerHTML = t('rules');
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
  document.getElementById('welcome-fact-models').textContent = lang === 'zh' ? '6 個不同 LLM' : '6 different LLMs';
  document.getElementById('welcome-fact-trace').textContent = lang === 'zh' ? '完整決策軌跡' : 'Full decision trace';
  document.getElementById('welcome-btn').textContent = lang === 'zh' ? '重播最新遊戲' : 'Replay latest game';
  document.getElementById('welcome-explore').textContent = lang === 'zh' ? '探索遊戲桌' : 'Explore the table';
  document.getElementById('welcome-trust').textContent = lang === 'zh'
    ? '所有已記錄事件均完整保留。你可以在「證據」中查看原始遊戲輸出。'
    : 'Every recorded event is preserved. Raw game outputs are available in Proof.';
  document.getElementById('welcome-gh').textContent =
    lang === 'zh' ? '在 GitHub 查看原始碼 ↗' : 'View source on GitHub ↗';
  updateStoryViewToggle();
  document.getElementById('rules-close').setAttribute(
    'aria-label',
    lang === 'zh' ? '關閉規則' : 'Close rules',
  );
  if (document.getElementById('rules-overlay').classList.contains('visible')) {
    renderRulesStep();
  }
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
  return hexColor(readableAccent(p.color || p.accent || 0xe74c3c));
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
// speakingStates is only the *intent* list (who is talking right now). The
// gesture/listening weights are eased per figure in updateCharacterLife(), so
// clearBubbles() emptying this array never snaps a pose.
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
  // Drop states whose figure is gone (scene rebuilt mid-speech); the old
  // trailing filter could never remove anything.
  for (let k = speakingStates.length - 1; k >= 0; k--) {
    const s = speakingStates[k];
    if (!chars[s.index]) { speakingStates.splice(k, 1); continue; }
    s.intensity = Math.min(s.intensity + 0.05, 1);
  }
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
  // Portrait has a horizontal FOV near 22 deg (aspect 0.46). 20 let the far
  // left/right figures bleed past the screen edges, but 26 shrank the council
  // enough that the six name tags collapsed into one overlapping cluster —
  // 22 is the balance point where the ring fits and the tags still separate.
  const targetDist = innerWidth <= 768 ? 22 : 12;
  dist = 30 + (targetDist - 30) * e;
  // Rotate slightly during descent
  theta = PI / 4 + (0 - PI / 4) * e;
  phi = PI / 3.5; // keep constant
  updateCam();
  if (t >= 1) { introAnim.done = true; introAnim = null; }
}

// ===== Character Life & Camera Director =====
//
// Everything that makes the council read as six people at a table rather than
// six posed models: per-figure idle personality, listeners turning to the
// speaker, speaker gestures, accusation beats, the death fall, celebration /
// sulk poses, and a small camera director for the big story moments.
//
// All rig poses are written in ONE place (updateCharacterLife) from eased
// state, so event code only flips intent (who speaks, who points, who died)
// and never snaps a pose. Parts are addressed through g.userData.rig (built in
// buildCharacter), never by guessing children from their height.
//
// Public API — module scope (window.__life mirrors it for console testing):
//   pointAt(fromIndex, toIndex, durationMs = 1500, delayMs = 0)
//       fromIndex raises the arm on the target's side and points at toIndex,
//       turning head and torso with it.
//   reactToAccusation(targetIndex, accuserIndex = current speaker, delayMs = 0)
//       targetIndex recoils, throws its hands up and snaps its head toward the
//       accuser, holding the look ~2.5 s.
//   accuse(fromIndex, toIndex)
//       Both of the above, with the flinch landing just after the point. This
//       is the call for a speech with an @target, made right after showBubble()
//       has started the speaker:
//         const from = PLAYERS.findIndex(p => p.name === speech.player_name);
//         const to = PLAYERS.findIndex(p => p.name === speech.target);
//         if (from >= 0 && to >= 0 && from !== to) accuse(from, to);
//   directCamera(shot, opts = {})
//       shot: 'night' | 'day' ('home') | 'vote' | 'execution' | 'result'.
//       opts.index is required for 'execution'; opts.force restarts a shot
//       that is already running. Requests made in the same frame are batched
//       and the highest priority wins (result > execution > vote > night/day),
//       so setPhase() can fire setNight + showVoteArrows + dimCharacter in one
//       go and get the right move. Re-requesting the running shot is a no-op,
//       so story mode (setPhase on every step) does not restart it. Shots only
//       run while camFollow && !followSuspended && !userInteracting, and cancel
//       themselves the moment anything else moves the camera (drag, wheel
//       zoom, WASD pan) — manual control always wins.

const _lifeV = new THREE.Vector3();
const _lifeQ = new THREE.Quaternion();
const _lifeQ2 = new THREE.Quaternion();
const _lifeDown = new THREE.Vector3(0, -1, 0);
const _lifeLook = { yaw: 0, pitch: 0 };
const LIFE_DIM_GREY = new THREE.Color(0x333333);
let lifeFrame = 0;      // animate() frame counter
let lifeLastMs = 0;
// setPhase() runs on every story step, so undimAll() + dimCharacter() inside
// one frame is a state *restore*, not a second execution: the in-flight (or
// finished) death is carried across instead of replaying the fall.
let lifeRestoreFrame = -1;
const lifeRestoreDeaths = new Map();

function lifeHash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function lifeSmooth(e0, e1, x) { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); }
function lifeDamp(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
function lifeClamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Deterministic per seat: the same replay always shows the same crowd, but no
// two figures breathe, shift or glance in step.
function makeLifeState(index) {
  const h = k => lifeHash(index * 13.37 + k);
  return {
    breathRate: 1.05 + h(1) * 0.4,
    breathPhase: h(2) * TAU,
    shiftRate: 0.21 + h(3) * 0.16,
    shiftPhase: h(4) * TAU,
    shiftAmp: 0.016 + h(5) * 0.018,
    swayPhase: h(6) * TAU,
    glancePeriod: 4.2 + h(7) * 3.2,
    glanceOffset: h(8) * 10,
    gestureSide: index % 2 === 0 ? 1 : -1,
    gesturePhase: h(9) * TAU,
    // eased channels
    headYaw: 0, headPitch: 0, torsoYaw: 0,
    speakW: 0, listenW: 0, sleepW: 0, moodW: 0, moodType: 0,
    // events
    point: null,   // { to, start, dur }
    react: null,   // { from, start }
    death: null,   // deathAnims entry { index, startTime, delay, duration }
    dead: false,
    dimDone: false,
  };
}

function currentSpeakerIndex() {
  for (let k = speakingStates.length - 1; k >= 0; k--) {
    if (chars[speakingStates[k].index]) return speakingStates[k].index;
  }
  return speakerFocusIndex;
}

// Yaw/pitch from figure g toward seat j, in g's own frame (+z faces the table).
// Analytic rather than worldToLocal so it never depends on last frame's matrices.
function lifeLookAt(g, j, out) {
  const tg = chars[j];
  const dx = tg.position.x - g.position.x, dz = tg.position.z - g.position.z;
  const ry = g.rotation.y, c = Math.cos(ry), s = Math.sin(ry);
  out.yaw = Math.atan2(dx * c - dz * s, dx * s + dz * c);
  // A fallen figure lies at seat level: look down at it, not through it.
  out.pitch = tg.userData.life && tg.userData.life.dead ? 0.32 : 0.04;
  return out;
}

// Arm rotation (in the upper-body frame) that aims the hanging arm at seat j.
function lifePointQuat(g, R, side, j, out) {
  const tg = chars[j];
  const dx = tg.position.x - g.position.x, dz = tg.position.z - g.position.z;
  const ry = g.rotation.y, c = Math.cos(ry), s = Math.sin(ry);
  const k = g.scale.x || 1;
  _lifeV.set((dx * c - dz * s) / k - side * 0.315, 0.22, (dx * s + dz * c) / k).normalize();
  _lifeQ.copy(R.upper.quaternion).invert();
  _lifeV.applyQuaternion(_lifeQ);
  return out.setFromUnitVectors(_lifeDown, _lifeV);
}

function lifeApplyDim(g, fade) {
  const snap = g.userData._dimSnapshot;
  if (!snap) return;
  for (let k = 0; k < snap.length; k++) {
    const s = snap[k];
    s.mat.color.copy(s.color).lerp(LIFE_DIM_GREY, 0.7 * fade);
    if (s.emissive && s.mat.emissive) s.mat.emissive.copy(s.emissive).multiplyScalar(1 - fade);
  }
  if (fade >= 1) g.userData.life.dimDone = true;
}

function pointAt(fromIndex, toIndex, durationMs = 1500, delayMs = 0) {
  const g = chars[fromIndex];
  if (!g || !g.userData.life || !chars[toIndex] || fromIndex === toIndex) return;
  g.userData.life.point = { to: toIndex, start: performance.now() + delayMs, dur: durationMs };
}

function reactToAccusation(targetIndex, accuserIndex = currentSpeakerIndex(), delayMs = 0) {
  const g = chars[targetIndex];
  if (!g || !g.userData.life) return;
  const from = accuserIndex === targetIndex ? -1 : accuserIndex;
  g.userData.life.react = { from, start: performance.now() + delayMs };
}

function accuse(fromIndex, toIndex) {
  pointAt(fromIndex, toIndex, 1600);
  reactToAccusation(toIndex, fromIndex, 280);
}

function updateCharacterLife(t, dt) {
  const tMs = t * 1000;
  const speaker = currentSpeakerIndex();
  for (let i = 0; i < chars.length; i++) {
    const g = chars[i];
    const R = g.userData.rig, L = g.userData.life;
    if (!R || !L) continue;

    let speaking = false;
    for (let k = 0; k < speakingStates.length; k++) {
      if (speakingStates[k].index === i) { speaking = true; break; }
    }
    let team = null;
    for (let k = 0; k < teamAnims.length; k++) {
      if (teamAnims[k].index === i) { team = teamAnims[k]; break; }
    }

    // Death clock: seconds since the fall was cued (< 0 = still standing).
    const de = L.death ? (tMs - L.death.startTime - (L.death.delay || 0)) / 1000 : -1;
    const alive = !L.death || de < 0;

    // ---- eased blend weights
    const nightAmp = isNight ? 0.55 : 1;
    L.speakW = lifeDamp(L.speakW, speaking && alive ? 1 : 0, 5, dt);
    const hasSpeaker = speaker >= 0 && speaker !== i && !!chars[speaker];
    const listening = alive && !speaking && !isNight && hasSpeaker;
    L.listenW = lifeDamp(L.listenW, listening ? 1 : 0, 3.2, dt);
    // One Night rules: everyone not acting is asleep at night.
    L.sleepW = lifeDamp(L.sleepW, isNight && alive && !speaking ? 1 : 0, 1.4, dt);
    if (team) L.moodType = team.type === 'celebrate' ? 1 : -1;
    const moodE = team ? (tMs - team.startTime) / 1000 - (team.offset || 0) : 0;
    L.moodW = lifeDamp(L.moodW, team && moodE >= 0 && alive ? 1 : 0, 3.5, dt);
    const cel = L.moodType > 0 ? L.moodW : 0;
    const sulk = L.moodType < 0 ? L.moodW : 0;
    const sW = L.speakW;

    // ---- idle personality: breath, weight shift, occasional glance
    const br = Math.sin(t * L.breathRate * (1 - 0.25 * L.sleepW) + L.breathPhase);
    const breathAmp = 0.011 + 0.009 * L.sleepW;
    const shift = Math.sin(t * L.shiftRate + L.shiftPhase);
    const gp = (t + L.glanceOffset) / L.glancePeriod;
    const gk = Math.floor(gp), gf = gp - gk;
    const glanceW = lifeSmooth(0.12, 0.24, gf) * (1 - lifeSmooth(0.42, 0.56, gf))
      * (1 - L.listenW) * (1 - L.sleepW) * (1 - sW);
    let yawT = (lifeHash(i * 7.13 + gk) - 0.5) * 1.15 * glanceW;
    let pitchT = (lifeHash(i * 3.31 + gk * 1.7) - 0.55) * 0.2 * glanceW;
    let torsoShare = 0.3;
    let headRate = 6;

    // ---- listeners turn to the speaker
    if (hasSpeaker && L.listenW > 0.001) {
      lifeLookAt(g, speaker, _lifeLook);
      yawT += (_lifeLook.yaw - yawT) * L.listenW;
      pitchT += (_lifeLook.pitch - pitchT) * L.listenW;
    }

    // ---- the speaker addresses the whole table
    const gestPhase = t + L.gesturePhase;
    const beat = 0.5 + 0.5 * Math.sin(gestPhase * 5.1);
    const emph = Math.pow(Math.max(0, Math.sin(gestPhase * 1.9)), 2);
    yawT += Math.sin(t * 0.47 + L.gesturePhase) * (isNight ? 0.6 : 0.42) * sW;

    // ---- pointing
    let pointW = 0, pointSide = 1;
    if (L.point) {
      const pe = (tMs - L.point.start) / 1000;
      const pd = L.point.dur / 1000;
      if (pe > pd || !chars[L.point.to] || !alive) L.point = null;
      else if (pe > 0) {
        pointW = lifeSmooth(0, 0.28, pe) * (1 - lifeSmooth(pd - 0.4, pd, pe));
        lifeLookAt(g, L.point.to, _lifeLook);
        pointSide = _lifeLook.yaw >= 0 ? 1 : -1;
        yawT += (_lifeLook.yaw - yawT) * pointW;
        pitchT += (_lifeLook.pitch - pitchT) * pointW;
        torsoShare += 0.2 * pointW;
      }
    }

    // ---- accusation: flinch + snap round to the accuser
    let flinch = 0;
    if (L.react) {
      const re = (tMs - L.react.start) / 1000;
      if (re > 3 || !alive) L.react = null;
      else if (re > 0) {
        flinch = re < 0.09 ? re / 0.09 : Math.exp(-(re - 0.09) * 4.2);
        const lookW = lifeSmooth(0, 0.12, re) * (1 - lifeSmooth(2.2, 2.9, re));
        if (L.react.from >= 0 && chars[L.react.from]) {
          lifeLookAt(g, L.react.from, _lifeLook);
          yawT += (_lifeLook.yaw - yawT) * lookW;
          pitchT += (_lifeLook.pitch - pitchT) * lookW;
        }
        headRate = 14;
      }
    }

    pitchT += 0.36 * L.sleepW - 0.18 * cel + 0.4 * sulk;
    if (!alive) { yawT = 0; pitchT = 0; }

    // ---- split the turn: the torso takes a share, the head the rest
    const yawC = lifeClamp(yawT, -1.3, 1.3);
    L.torsoYaw = lifeDamp(L.torsoYaw, lifeClamp(yawC * torsoShare, -0.42, 0.42), 3, dt);
    L.headYaw = lifeDamp(L.headYaw, lifeClamp(yawC - L.torsoYaw, -0.95, 0.95), headRate, dt);
    L.headPitch = lifeDamp(L.headPitch, lifeClamp(pitchT, -0.35, 0.5), headRate * 0.8, dt);

    // ---- assemble the pose
    let bodyY = R.bodyBaseY, bodyRX = 0, bodyRY = 0, bodyRZ = 0;
    let lean = R.baseLean + 0.06 * L.sleepW + 0.035 * L.listenW
      + sW * (0.045 + 0.035 * emph) * nightAmp - 0.2 * flinch + 0.2 * sulk - 0.04 * cel;
    let roll = shift * L.shiftAmp + Math.sin(tMs * 0.045) * 0.025 * flinch;
    const upY = R.upperBaseY + br * 0.004 - 0.03 * sulk;
    let hPitch = L.headPitch + Math.sin(t * 0.6 + i * 0.5) * 0.025
      + sW * (0.05 * Math.sin(gestPhase * 7.3) + 0.045 * emph) * nightAmp - 0.12 * flinch;
    let hRoll = Math.sin(t * 0.8 + i * 1.3) * 0.04 * (1 - 0.5 * sW) - roll * 0.6;
    const hY = R.headBaseY + sW * 0.012 * Math.abs(Math.sin(gestPhase * 7.3));

    const aL = R.armBase.L, aR = R.armBase.R;
    const sway = Math.sin(t * 0.9 + L.swayPhase) * 0.035;
    let lx = aL.x + sway, lz = aL.z - 0.015 - br * 0.012;
    let rx = aR.x - sway * 0.8, rz = aR.z + 0.015 + br * 0.012;
    if (sW > 0.001) {
      // One emphatic hand (alternating by seat) and one supporting hand.
      const big = -(0.5 + 0.5 * emph + 0.14 * beat) * sW * nightAmp;
      const small = -(0.16 + 0.1 * Math.sin(gestPhase * 2.7)) * sW * nightAmp;
      const out = (0.18 + 0.12 * beat) * sW * nightAmp;
      if (L.gestureSide > 0) { rx += big; rz += out; lx += small; lz -= 0.07 * sW; }
      else { lx += big; lz -= out; rx += small; rz += 0.07 * sW; }
    }
    lx -= 0.6 * flinch; rx -= 0.6 * flinch;
    lz -= 0.18 * flinch; rz += 0.18 * flinch;
    lx += 0.06 * L.sleepW; rx += 0.06 * L.sleepW;
    if (cel > 0.001) {
      const hop = Math.abs(Math.sin(moodE * 3.2));
      const wave = Math.sin(moodE * 6.5);
      bodyY += 0.13 * hop * cel;
      bodyRY += Math.sin(moodE * 2) * 0.28 * cel;
      lx += (-2.55 + 0.2 * wave - lx) * cel; rx += (-2.55 - 0.2 * wave - rx) * cel;
      lz += (-0.38 - lz) * cel; rz += (0.38 - rz) * cel;
    }
    if (sulk > 0.001) { lx += 0.1 * sulk; rx += 0.1 * sulk; lz += 0.05 * sulk; rz -= 0.05 * sulk; }

    // ---- death: clutch (anticipation), topple, two small impact bounces
    if (L.death && de >= 0) {
      const side = i % 2 === 0 ? 1 : -1;
      const antic = lifeSmooth(0, 0.22, de) * (1 - lifeSmooth(0.3, 0.46, de));
      const f = lifeClamp((de - 0.32) / 0.6, 0, 1);
      let fall = f * f;
      if (de > 0.92) { const b = de - 0.92; fall -= 0.085 * Math.exp(-b * 5.5) * Math.abs(Math.sin(b * 11)); }
      bodyY += 0.035 * antic + 0.17 * fall;
      bodyRZ = side * 1.42 * fall;
      bodyRX = -0.2 * fall;
      lean += 0.16 * antic - 0.06 * fall;
      hPitch += 0.32 * antic - 0.1 * fall;
      hRoll += side * 0.4 * fall;
      lx += -0.55 * antic + 0.25 * fall; rx += -0.55 * antic + 0.25 * fall;
      lz += 0.2 * antic - 0.75 * fall; rz += -0.2 * antic + 0.75 * fall;
      if (!L.dimDone) lifeApplyDim(g, lifeSmooth(0, 0.9, de));
    }

    R.body.position.set(0, bodyY, 0);
    R.body.rotation.set(bodyRX, bodyRY, bodyRZ);
    R.upper.position.set(alive ? shift * 0.012 : 0, upY, 0);
    R.upper.rotation.set(lean, L.torsoYaw, roll);
    const bA = br * breathAmp;
    R.upper.scale.set(1 + bA * 0.35, 1 + bA, 1 + bA * 0.35);
    R.head.position.y = hY;
    R.head.rotation.set(hPitch, L.headYaw, hRoll);
    R.armL.rotation.set(lx, aL.y, lz);
    R.armR.rotation.set(rx, aR.y, rz);
    if (pointW > 0.001 && L.point) {
      const arm = pointSide > 0 ? R.armR : R.armL;
      lifePointQuat(g, R, pointSide, L.point.to, _lifeQ2);
      arm.quaternion.slerp(_lifeQ2, pointW);
    }
  }
}

// ----- Camera director -----
const CAM_SHOT_PRIORITY = { night: 1, day: 1, home: 1, vote: 2, execution: 3, result: 4 };
const CAM_HOME_Y = HEAD_Y + 0.12;   // targetV's default height
let camPending = null;              // best request made since the last frame
let camShot = null;                 // running (or finished, for de-dupe) shot
let voteRevealFrame = -1;

function directCamera(shot, opts = {}) {
  const prio = CAM_SHOT_PRIORITY[shot];
  if (prio === undefined) return;
  if (shot === 'vote') voteRevealFrame = lifeFrame;
  const withVote = (camPending && camPending.withVote) || shot === 'vote';
  if (!camPending || prio >= camPending.prio) camPending = { shot, opts, prio, withVote };
  else camPending.withVote = withVote;
}

function camKey(at, dur, to) { return { at, dur, to, from: null, toTheta: 0 }; }

// The desktop side panel covers the right ~30% of the canvas. Shots aim the
// camera a little to the right of their subject (camera-right, scaled with
// distance) so the subject lands in the middle of what is still visible.
// Tweens run in un-shifted "raw" target space and the shift is added on
// write, so orbiting or zooming keeps the subject framed left of the panel.
function camPanelOpen() { return sidePanelOpen && innerWidth > 768; }
function camPanelLateral() { return camPanelOpen() ? 0.19 * dist : 0; }

function buildCamShot(req) {
  // Portrait phones need the wider base distance to keep the ring in frame;
  // every shot is a multiple of it so mobile framing scales with it. With the
  // desktop side panel open the visible stage is ~30% narrower, so pull back
  // (and see camPanelLateral for the sideways shift).
  const D = (innerWidth <= 768 ? 22 : 12) * (camPanelOpen() ? 1.28 : 1);
  const overhead = { phi: 0.5, dist: D * 1.22, tx: 0, ty: CAM_HOME_Y - 0.3, tz: 0 };
  switch (req.shot) {
    case 'night':
      // Low, slow orbit — the village seen from just above the braziers.
      return { key: 'night', kfs: [camKey(0, 2.8, { phi: 1.3, dist: D * 0.86, tx: 0, ty: CAM_HOME_Y - 0.15, tz: 0 })], orbit: 0.05, orbitAt: 0.3 };
    case 'day': case 'home':
      return { key: 'day', kfs: [camKey(0, 1.8, { phi: PI / 3.5, dist: D, tx: 0, ty: CAM_HOME_Y, tz: 0 })] };
    case 'vote':
      // Pull back and up so every ballot arrow is on screen at once.
      return { key: 'vote', kfs: [camKey(0, 1.9, overhead)] };
    case 'execution': {
      const i = req.opts && req.opts.index;
      if (!chars[i]) return null;
      const p = chars[i].position;
      // When the ballots were just revealed, hold the overhead while the
      // arrows draw in, then dolly across the table into the condemned's face
      // (camera between two seats on the far side), then ease back out.
      const lead = req.withVote ? 1.6 : 0;
      const kfs = [];
      if (req.withVote) kfs.push(camKey(0, 1.4, overhead));
      kfs.push(camKey(lead, 1.8, { theta: sa(i) + PI - 0.5, phi: 1.04, dist: D * 0.5, tx: p.x * 0.62, ty: 1.05, tz: p.z * 0.62 }));
      kfs.push(camKey(lead + 4.4, 2.8, { phi: 0.92, dist: D * 0.8, tx: p.x * 0.25, ty: CAM_HOME_Y, tz: p.z * 0.25 }));
      return { key: 'execution:' + i, kfs };
    }
    case 'result':
      // Slow wide crane-up over the whole council.
      return { key: 'result', kfs: [camKey(0, 6.5, { phi: 0.66, dist: D * 1.32, tx: 0, ty: CAM_HOME_Y + 0.5, tz: 0 })], orbit: 0.035, orbitAt: 0.5 };
  }
  return null;
}

// Manual camera input that does not go through the drag flags (wheel zoom,
// WASD / arrow pan) hands control back to the user just like a drag does.
// Watching inputs rather than diffing camera values matters: the side panel's
// applyPanelOffset() rewrites dist/target on every story step, and that must
// not cancel (and so restart) a running shot.
let camUserNudged = false;
canvas.addEventListener('wheel', () => { camUserNudged = true; }, { passive: true });
function camPanKeysDown() {
  const k = window._panKeys;
  return !!k && !!(k.w || k.a || k.s || k.d || k.arrowup || k.arrowdown || k.arrowleft || k.arrowright);
}

// Returns true when it drove theta this frame (so auto-rotate stands down).
function updateCameraDirector(tMs, dt) {
  const nudged = camUserNudged || camPanKeysDown();
  camUserNudged = false;
  if (nudged) camShot = null;
  if (!camFollow || followSuspended || userInteracting) {
    camShot = null;
    camPending = null;
    return false;
  }
  if (camPending) {
    const req = camPending;
    camPending = null;
    const next = buildCamShot(req);
    if (next && (!camShot || camShot.key !== next.key || (req.opts && req.opts.force))) {
      next.t0 = tMs;
      next.done = false;
      camShot = next;
    }
  }
  const s = camShot;
  if (!s) return false;
  if (s.done) {
    // Landed: hold the framing (re-applying the panel shift as theta moves)
    // until the next shot or until the user takes the camera. Theta is left
    // free for speaker follow / auto-rotate.
    phi = s.holdPhi;
    dist = s.holdDist;
    if (s.raw) {
      const lat = camPanelLateral();
      targetV.set(s.raw.x + Math.sin(theta) * lat, s.raw.y, s.raw.z - Math.cos(theta) * lat);
    }
    updateCam();
    return false;
  }

  const el = (tMs - s.t0) / 1000;
  let pending = false;
  for (let n = 0; n < s.kfs.length; n++) {
    const k = s.kfs[n];
    if (el < k.at) { pending = true; continue; }
    const to = k.to;
    if (!k.from) {
      if (!s.raw) {
        // Strip the current panel shift so the tween starts where we are.
        const lat0 = camPanelLateral();
        s.raw = { x: targetV.x - Math.sin(theta) * lat0, y: targetV.y, z: targetV.z + Math.cos(theta) * lat0 };
      }
      k.from = { theta, phi, dist, tx: s.raw.x, ty: s.raw.y, tz: s.raw.z };
      if (to.theta !== undefined) k.toTheta = theta + Math.atan2(Math.sin(to.theta - theta), Math.cos(to.theta - theta));
    }
    const x = Math.min(1, (el - k.at) / k.dur);
    if (x < 1) pending = true;
    const e = x * x * x * (x * (x * 6 - 15) + 10);   // smootherstep
    const f = k.from;
    if (to.theta !== undefined) theta = f.theta + (k.toTheta - f.theta) * e;
    if (to.phi !== undefined) phi = f.phi + (to.phi - f.phi) * e;
    if (to.dist !== undefined) dist = f.dist + (to.dist - f.dist) * e;
    if (to.tx !== undefined) {
      s.raw.x = f.tx + (to.tx - f.tx) * e;
      s.raw.y = f.ty + (to.ty - f.ty) * e;
      s.raw.z = f.tz + (to.tz - f.tz) * e;
    }
  }
  let ownsTheta = false;
  if (s.orbit && el >= s.orbitAt) {
    theta += s.orbit * dt * lifeSmooth(s.orbitAt, s.orbitAt + 2.5, el);
    ownsTheta = true;
  }
  phi = Math.max(0.02, Math.min(PI / 2.05, phi));
  dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist));
  if (!pending && !s.orbit) { s.done = true; s.holdPhi = phi; s.holdDist = dist; }
  if (s.raw) {
    const lat = camPanelLateral();
    targetV.set(s.raw.x + Math.sin(theta) * lat, s.raw.y, s.raw.z - Math.cos(theta) * lat);
  }
  updateCam();
  return ownsTheta || pending;
}

window.__life = { pointAt, reactToAccusation, accuse, directCamera, shot: () => camShot && camShot.key, chars: () => chars };

// ===== Animation Loop =====
// Full-screen overlays (rules / story mode) swallow all canvas mouse events.
// While one is open the scene must sit still — otherwise the user sees the
// world rotating on its own while their drags do nothing ("broken mouse").
function modalBlocksScene() {
  return document.getElementById('rules-overlay').classList.contains('visible')
    || document.getElementById('story-mode').classList.contains('visible');
}

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  const tMs = performance.now();
  // Frame delta for the eased life/camera channels, clamped so a background
  // tab coming back does not fling every head round in a single step.
  const dt = lifeLastMs ? Math.min(0.05, Math.max(0, (tMs - lifeLastMs) / 1000)) : 1 / 60;
  lifeLastMs = tMs;
  lifeFrame++;

  // Flame flicker
  if (flame) {
    flame.scale.y = 1 + Math.sin(t * 8) * 0.15;
    flame.scale.x = 1 + Math.sin(t * 7) * 0.1;
    flame.position.y = 1.395 + Math.sin(t * 8) * 0.01;
  }

  // Camera: the intro flight wins, then the director's phase shots, then the
  // day speaker follow / auto-rotate (which stands down while a shot orbits).
  if (introAnim && !introAnim.done) { updateIntroAnim(); }
  else {
    const directorOwnsTheta = updateCameraDirector(tMs, dt);
    if (speakerFocusIndex >= 0 && currentPhase === 'day' && !userInteracting) { updateSpeakerCamera(tMs); }
    else if (autoRotate && !userInteracting && !modalBlocksScene() && !directorOwnsTheta) { theta += 0.003; updateCam(); }
  }
  updateViewShift(dt);

  // Night/day light transition
  updateNightTransition();
  updateParticles(t);
  updateEnvironment(t);

  // Per-frame updates for overlays
  updateKeyboardPan();
  updateNameTags();
  updateSpeakerFocus();
  updateAllBubbles();
  if (activeVotes) redrawVoteArrows();
  updateDeathAnims(tMs);
  updateTeamAnims(tMs);
  updateSpeakingAnims(t);
  updateCharacterLife(t, dt);
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
