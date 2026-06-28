/* ===== Endless Werewolf — 3D Village Table ===== */
import * as THREE from './three.min.mjs';

const PI = Math.PI, cos = Math.cos, sin = Math.sin, TAU = PI * 2;

// ===== i18n =====
const I18N = {
  en: {
    brand: 'Endless Werewolf', sub: 'AI One Night',
    archive: 'Archive', info: 'Info', night: 'Night', autoRotate: 'Auto-rotate',
    nightPhase: 'Night Phase', dayDiscussion: 'Day Discussion', voting: 'Voting',
    resolution: 'Resolution', postgame: 'Postgame Interviews',
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
  },
  zh: {
    brand: '無限狼人殺', sub: 'AI 一夜',
    archive: '檔案', info: '資訊', night: '夜晚', autoRotate: '自動旋轉',
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
  }
};
let lang = (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
function t(key) { return I18N[lang][key] || I18N.en[key] || key; }

// --- Player visual styles (covers both V1 and V2 rosters) ---
const PLAYER_STYLES = {
  // V1 roster
  'Blaze':       {color:0xe74c3c,accent:0xc0392b,body:0x4a0000,head:0xD4A574,icon:'🔥'},
  'SafetySam':   {color:0x27ae60,accent:0x2ecc71,body:0x0d5234,head:0xE8C4A0,icon:'🛡️'},
  'Dr. Pizza':   {color:0x2980b9,accent:0x3498db,body:0x0d3252,head:0xD0C8B8,icon:'🍕'},
  'Twister':     {color:0xd35400,accent:0xe67e22,body:0x7a3a10,head:0xD4B896,icon:'🌀'},
  'EasyBake':    {color:0xf39c12,accent:0xe67e22,body:0x5a3e10,head:0xE8D0B0,icon:'🧁'},
  'ConspiBro':   {color:0x7f8c8d,accent:0x95a5a6,body:0x2a2a2a,head:0xC8A878,icon:'🔍'},
  // V2 roster
  'The Prosecutor':   {color:0xc0392b,accent:0xe74c3c,body:0x4a0000,head:0xD4A574,icon:'⚖️'},
  'The Therapist':    {color:0x2ecc71,accent:0x27ae60,body:0x0d5234,head:0xE8C4A0,icon:'🧠'},
  'The Chaos Agent':  {color:0xe67e22,accent:0xd35400,body:0x7a3a10,head:0xD4B896,icon:'🎭'},
  'The Gut Player':   {color:0x95a5a6,accent:0x7f8c8d,body:0x2a2a2a,head:0xC8A878,icon:'👊'},
  'The Statistician': {color:0x3498db,accent:0x2980b9,body:0x0d3252,head:0xD0C8B8,icon:'📊'},
  'The Underdog':     {color:0xf39c12,accent:0xe67e22,body:0x5a3e10,head:0xE8D0B0,icon:'🍀'},
};

// --- Player data (dynamically loaded from each game's night_result) ---
let PLAYERS = [];

// --- Game data ---
let currentGame = null;
let gameData = {};
let currentPhase = 'night';
let replayIndex = 0;
let replayPlaying = false;
let replayTimer = null;

// --- Three.js globals ---
let scene, camera, renderer, amb, dir, moonPoint, candlePoint, flame;
let chars = [];
let isNight = false;
let autoRotate = true;
const R = 3.2, SH = 0.6, TR = 2.0;

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
  
  // Try to load latest game (this will populate PLAYERS and build characters)
  await loadGameIndex();
  
  // Fallback: if no game data, load static players.json for a preview
  if (PLAYERS.length === 0) {
    try {
      const resp = await fetch('./players.json');
      PLAYERS = await resp.json();
      buildAllCharacters();
      buildNameTags();
    } catch(e) {
      console.error('No players available', e);
    }
  }
  
  loadingEl.style.display = 'none';
  animate();
}

// ===== Three.js Setup =====
function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1520);
  scene.fog = new THREE.Fog(0x1a1520, 14, 32);

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 9, 9);

  amb = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(amb);

  dir = new THREE.DirectionalLight(0xfff5e0, 0.85);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 30;
  dir.shadow.camera.left = -8; dir.shadow.camera.right = 8;
  dir.shadow.camera.top = 8; dir.shadow.camera.bottom = -8;
  scene.add(dir);

  moonPoint = new THREE.PointLight(0x7080ff, 0, 20);
  moonPoint.position.set(-5, 6, 5);
  scene.add(moonPoint);

  candlePoint = new THREE.PointLight(0xFFD700, 1.5, 10);
  candlePoint.position.set(0, 0.75, 0);
  scene.add(candlePoint);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.85 })
  );
  floor.rotation.x = -PI / 2; floor.position.y = -0.6; floor.receiveShadow = true;
  scene.add(floor);

  // Table
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(TR, TR, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.6 })
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
}

// ===== Character Builder =====

function sp(i) { const a = (i / 6) * TAU - PI / 2; return [cos(a) * R, SH, sin(a) * R]; }
function sa(i) { return (i / 6) * TAU - PI / 2; }

function limb(r, len, color, rough = 0.6) {
  const m = new THREE.Mesh(
    new THREE.CapsuleGeometry(r, len, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: rough })
  );
  m.castShadow = true;
  return m;
}

function buildCharacter(player, index){
  const g=new THREE.Group();
  const pos=sp(index); g.position.set(...pos);
  const ang=sa(index); g.rotation.y=-ang-PI/2;
  scene.add(g);

  const skinMat=new THREE.MeshStandardMaterial({color:player.head,roughness:0.5});
  const bodyMat=new THREE.MeshStandardMaterial({color:player.body,roughness:0.6,metalness:0.1});
  const accMat=new THREE.MeshStandardMaterial({color:player.accent,roughness:0.4});
  const darkMat=new THREE.MeshStandardMaterial({color:0x1a1a2e,roughness:0.3});

  // === Torso ===
  // Tapered body — wider at shoulders, narrower at waist
  const torso=new THREE.Mesh(
    new THREE.CylinderGeometry(0.28,0.35,0.55,16),
    bodyMat
  );
  torso.position.y=0.35; torso.castShadow=true; g.add(torso);

  // Shoulders — slight width
  const shoulders=new THREE.Mesh(
    new THREE.SphereGeometry(0.3,16,12),
    bodyMat
  );
  shoulders.position.y=0.58; shoulders.scale.set(1,0.5,0.8); shoulders.castShadow=true; g.add(shoulders);

  // === Arms ===
  // Left arm
  const armL=limb(0.09,0.35,player.body);
  armL.position.set(-0.38,0.4,0);
  armL.rotation.z=0.15;
  g.add(armL);
  // Right arm
  const armR=limb(0.09,0.35,player.body);
  armR.position.set(0.38,0.4,0);
  armR.rotation.z=-0.15;
  g.add(armR);

  // Hands
  const handL=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),skinMat);
  handL.position.set(-0.48,0.2,0); handL.castShadow=true; g.add(handL);
  const handR=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),skinMat);
  handR.position.set(0.48,0.2,0); handR.castShadow=true; g.add(handR);

  // === Legs ===
  const legL=limb(0.12,0.3,0x2a2a2a);
  legL.position.set(-0.14,-0.1,0); g.add(legL);
  const legR=limb(0.12,0.3,0x2a2a2a);
  legR.position.set(0.14,-0.1,0); g.add(legR);

  // === Head ===
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.36,24,24),skinMat);
  head.position.y=0.98; head.castShadow=true; g.add(head);

  // Ears
  const earGeo=new THREE.SphereGeometry(0.06,12,8);
  const earL=new THREE.Mesh(earGeo,skinMat); earL.position.set(-0.35,0.97,0); earL.scale.set(0.5,1,0.8); g.add(earL);
  const earR=new THREE.Mesh(earGeo,skinMat); earR.position.set(0.35,0.97,0); earR.scale.set(0.5,1,0.8); g.add(earR);

  // Eyebrows
  const browGeo=new THREE.BoxGeometry(0.1,0.02,0.03);
  const browL=new THREE.Mesh(browGeo,darkMat); browL.position.set(-0.12,1.05,0.32); browL.rotation.z=0.08; g.add(browL);
  const browR=new THREE.Mesh(browGeo,darkMat); browR.position.set(0.12,1.05,0.32); browR.rotation.z=-0.08; g.add(browR);

  // Eyes — whites with pupils
  const eyeWhiteMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.3});
  const eyeGeo2=new THREE.SphereGeometry(0.05,16,12);
  const eL=new THREE.Mesh(eyeGeo2,eyeWhiteMat); eL.position.set(-0.12,1.0,0.32); eL.scale.set(1.2,1,0.6); g.add(eL);
  const eR=new THREE.Mesh(eyeGeo2,eyeWhiteMat); eR.position.set(0.12,1.0,0.32); eR.scale.set(1.2,1,0.6); g.add(eR);
  // Pupils
  const pupilGeo=new THREE.SphereGeometry(0.02,12,8);
  const pL=new THREE.Mesh(pupilGeo,darkMat); pL.position.set(-0.12,1.0,0.36); g.add(pL);
  const pR=new THREE.Mesh(pupilGeo,darkMat); pR.position.set(0.12,1.0,0.36); g.add(pR);

  // Nose — more defined
  const nose=new THREE.Mesh(
    new THREE.ConeGeometry(0.04,0.12,8),
    skinMat
  );
  nose.position.set(0,0.92,0.38); nose.rotation.x=PI/2; nose.scale.set(0.8,1,0.8); g.add(nose);

  // Mouth — smile with lips
  const smile=new THREE.Mesh(
    new THREE.TorusGeometry(0.08,0.025,8,16,PI),
    new THREE.MeshStandardMaterial({color:0x8B3A3A,roughness:0.4})
  );
  smile.position.set(0,0.86,0.35); smile.rotation.z=PI; g.add(smile);
  // Upper lip
  const lipLine=new THREE.Mesh(
    new THREE.BoxGeometry(0.12,0.01,0.02),
    darkMat
  );
  lipLine.position.set(0,0.88,0.36); g.add(lipLine);

  // Chin
  const chin=new THREE.Mesh(
    new THREE.SphereGeometry(0.08,12,8),
    skinMat
  );
  chin.position.set(0,0.82,0.28); chin.scale.set(1,0.6,0.8); g.add(chin);

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
      // Slick hair
      const hairP1=new THREE.Mesh(
        new THREE.SphereGeometry(0.34,16,12,0,TAU,0,PI*0.45),
        new THREE.MeshStandardMaterial({color:0x2a1a0a,roughness:0.4})
      );
      hairP1.position.set(0,1.05,0); hairP1.scale.set(1,0.5,1); g.add(hairP1);
      break;

    case 'The Therapist': case 'SafetySam': // Glasses + clipboard / shield
      // Glasses — two torus rings
      const glassL=new THREE.Mesh(
        new THREE.TorusGeometry(0.08,0.015,8,16),
        new THREE.MeshStandardMaterial({color:0x333333,metalness:0.5,roughness:0.2})
      );
      glassL.position.set(-0.12,1.0,0.32); g.add(glassL);
      const glassR=new THREE.Mesh(
        new THREE.TorusGeometry(0.08,0.015,8,16),
        new THREE.MeshStandardMaterial({color:0x333333,metalness:0.5,roughness:0.2})
      );
      glassR.position.set(0.12,1.0,0.32); g.add(glassR);
      // Bridge
      const bridge=new THREE.Mesh(
        new THREE.CylinderGeometry(0.01,0.01,0.08,4),
        new THREE.MeshStandardMaterial({color:0x333333})
      );
      bridge.position.set(0,1.0,0.33); bridge.rotation.z=PI/2;
      g.add(bridge);
      // Clipboard in left hand
      const board=new THREE.Mesh(
        new THREE.BoxGeometry(0.18,0.22,0.02),
        new THREE.MeshStandardMaterial({color:0xF5F0E0,roughness:0.7})
      );
      board.position.set(-0.52,0.15,0.05); board.rotation.x=-0.2;
      g.add(board);
      // Soft hair — bun
      const hairP2=new THREE.Mesh(
        new THREE.SphereGeometry(0.35,16,12,0,TAU,0,PI*0.5),
        new THREE.MeshStandardMaterial({color:0x4a3520,roughness:0.5})
      );
      hairP2.position.set(0,1.04,0); hairP2.scale.set(1,0.6,1); g.add(hairP2);
      // Bun
      const bun=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),
        new THREE.MeshStandardMaterial({color:0x4a3520,roughness:0.5}));
      bun.position.set(0,1.22,-0.15); g.add(bun);
      break;

    case 'The Chaos Agent': case 'Twister': // Wild hair + mask
      // Wild spiky hair — multiple cones
      for(let k=0;k<7;k++){
        const spike=new THREE.Mesh(
          new THREE.ConeGeometry(0.06,0.2+Math.random()*0.1,5),
          new THREE.MeshStandardMaterial({color:0xB85820,roughness:0.4})
        );
        const sa2=k/7*TAU;
        spike.position.set(cos(sa2)*0.25,1.15,sin(sa2)*0.25);
        spike.rotation.set(Math.random()*0.3-0.15,sa2,Math.random()*0.4-0.2);
        g.add(spike);
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
      bandana.position.set(0,1.08,0); bandana.rotation.x=PI/2; bandana.scale.set(1,1,0.8);
      g.add(bandana);
      // Bandana knot
      const knot=new THREE.Mesh(
        new THREE.BoxGeometry(0.06,0.08,0.06),
        new THREE.MeshStandardMaterial({color:0x7f8c8d})
      );
      knot.position.set(0,1.06,-0.32); g.add(knot);
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
      scar.position.set(-0.15,0.95,0.35); scar.rotation.z=0.2;
      g.add(scar);
      break;

    case 'The Statistician': case 'Dr. Pizza': // Glasses + tablet / pizza
      // Glasses — square-ish (use torus)
      const sgL=new THREE.Mesh(
        new THREE.TorusGeometry(0.07,0.012,8,16),
        new THREE.MeshStandardMaterial({color:0x2980b9,metalness:0.4,roughness:0.2})
      );
      sgL.position.set(-0.12,1.0,0.32); g.add(sgL);
      const sgR=new THREE.Mesh(
        new THREE.TorusGeometry(0.07,0.012,8,16),
        new THREE.MeshStandardMaterial({color:0x2980b9,metalness:0.4,roughness:0.2})
      );
      sgR.position.set(0.12,1.0,0.32); g.add(sgR);
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
      // Neat combed hair
      const hairP5=new THREE.Mesh(
        new THREE.SphereGeometry(0.34,16,12,0,TAU,0,PI*0.4),
        new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.3})
      );
      hairP5.position.set(0,1.06,0); hairP5.scale.set(1,0.35,1.05); g.add(hairP5);
      // Side part
      const part=new THREE.Mesh(
        new THREE.BoxGeometry(0.15,0.03,0.1),
        new THREE.MeshStandardMaterial({color:0x333333})
      );
      part.position.set(0.05,1.12,0.1); g.add(part);
      break;

    case 'The Underdog': case 'EasyBake': // Messy hair + lucky charm
      // Messy hair — uneven sphere
      const hairP6=new THREE.Mesh(
        new THREE.SphereGeometry(0.38,16,12,0,TAU,0,PI*0.55),
        new THREE.MeshStandardMaterial({color:0x5a3e10,roughness:0.6})
      );
      hairP6.position.set(0,1.02,0); hairP6.scale.set(1.05,0.65,1.05);
      // Tilt slightly
      hairP6.rotation.z=0.08;
      g.add(hairP6);
      // Hair strands sticking up
      for(let k=0;k<3;k++){
        const strand=new THREE.Mesh(
          new THREE.ConeGeometry(0.03,0.1+Math.random()*0.06,4),
          new THREE.MeshStandardMaterial({color:0x5a3e10,roughness:0.6})
        );
        strand.position.set(-0.1+k*0.1,1.2+Math.random()*0.05,0);
        strand.rotation.set(Math.random()*0.3-0.15,0,Math.random()*0.3-0.15);
        g.add(strand);
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
      // Worried eyebrows — adjust existing ones
      browL.position.y=1.08; browL.rotation.z=-0.2;
      browR.position.y=1.08; browR.rotation.z=0.2;
      // Nervous posture — slightly leaning back
      g.rotation.x=-0.05;
      break;
  }

  // === Base platform ===
  const base=new THREE.Mesh(
    new THREE.CylinderGeometry(0.5,0.55,0.08,24),
    new THREE.MeshStandardMaterial({color:player.color,roughness:0.3,metalness:0.2})
  );
  base.position.y=-0.14; base.receiveShadow=true; g.add(base);

  const ring=new THREE.Mesh(
    new THREE.RingGeometry(0.5,0.58,24),
    new THREE.MeshStandardMaterial({color:player.accent,side:THREE.DoubleSide,emissive:player.accent,emissiveIntensity:0.3})
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

  // Store refs
  g.userData = { player, index, highlight, _baseRotY: g.rotation.y };
  return g;
}

function buildAllCharacters() {
  chars = PLAYERS.map((p, i) => buildCharacter(p, i));
}

// ===== 3D Avatar Portrait Renderer =====
const avatarCache = {};
function renderAvatarPortrait(player, size = 128) {
  const key = player.name + '_' + size;
  if (avatarCache[key]) return avatarCache[key];

  // Mini scene for portrait
  const avScene = new THREE.Scene();
  avScene.background = new THREE.Color(0x1a1520);
  const avCam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  avCam.position.set(0, 1.0, 2.2);
  avCam.lookAt(0, 0.98, 0);

  const avAmb = new THREE.AmbientLight(0xffffff, 0.6);
  avScene.add(avAmb);
  const avDir = new THREE.DirectionalLight(0xfff5e0, 0.8);
  avDir.position.set(2, 3, 2);
  avScene.add(avDir);
  const avFill = new THREE.DirectionalLight(0x6688ff, 0.3);
  avFill.position.set(-2, 1, 1);
  avScene.add(avFill);

  // Build a simplified head+shoulders for portrait
  const skinMat = new THREE.MeshStandardMaterial({color:player.head||0xD4A574, roughness:0.5});
  const bodyMat = new THREE.MeshStandardMaterial({color:player.body||0x4a0000, roughness:0.6});
  const accMat = new THREE.MeshStandardMaterial({color:player.accent||0xe74c3c, roughness:0.4});
  const darkMat = new THREE.MeshStandardMaterial({color:0x1a1a2e, roughness:0.3});

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 32), skinMat);
  head.position.y = 0.98;
  avScene.add(head);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.06, 12, 8);
  const earL = new THREE.Mesh(earGeo, skinMat); earL.position.set(-0.35, 0.97, 0); earL.scale.set(0.5, 1, 0.8); avScene.add(earL);
  const earR = new THREE.Mesh(earGeo, skinMat); earR.position.set(0.35, 0.97, 0); earR.scale.set(0.5, 1, 0.8); avScene.add(earR);

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.1, 0.02, 0.03);
  const browL = new THREE.Mesh(browGeo, darkMat); browL.position.set(-0.12, 1.05, 0.32); browL.rotation.z = 0.08; avScene.add(browL);
  const browR = new THREE.Mesh(browGeo, darkMat); browR.position.set(0.12, 1.05, 0.32); browR.rotation.z = -0.08; avScene.add(browR);

  // Eyes
  const eyeWhiteMat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.3});
  const eyeGeo2 = new THREE.SphereGeometry(0.05, 16, 12);
  const eL = new THREE.Mesh(eyeGeo2, eyeWhiteMat); eL.position.set(-0.12, 1.0, 0.32); eL.scale.set(1.2, 1, 0.6); avScene.add(eL);
  const eR = new THREE.Mesh(eyeGeo2, eyeWhiteMat); eR.position.set(0.12, 1.0, 0.32); eR.scale.set(1.2, 1, 0.6); avScene.add(eR);
  const pupilGeo = new THREE.SphereGeometry(0.02, 12, 8);
  const pL = new THREE.Mesh(pupilGeo, darkMat); pL.position.set(-0.12, 1.0, 0.36); avScene.add(pL);
  const pR = new THREE.Mesh(pupilGeo, darkMat); pR.position.set(0.12, 1.0, 0.36); avScene.add(pR);

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), skinMat);
  nose.position.set(0, 0.92, 0.38); nose.rotation.x = PI/2; nose.scale.set(0.8, 1, 0.8); avScene.add(nose);

  // Mouth
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 16, PI), new THREE.MeshStandardMaterial({color:0x8B3A3A, roughness:0.4}));
  smile.position.set(0, 0.86, 0.35); smile.rotation.z = PI; avScene.add(smile);

  // Chin
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), skinMat);
  chin.position.set(0, 0.82, 0.28); chin.scale.set(1, 0.6, 0.8); avScene.add(chin);

  // Shoulders/torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.55, 16), bodyMat);
  torso.position.y = 0.35; avScene.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), bodyMat);
  shoulders.position.y = 0.58; shoulders.scale.set(1, 0.5, 0.8); avScene.add(shoulders);

  // Persona-specific accessories (simplified for portrait)
  addAvatarAccessories(avScene, player, skinMat, bodyMat, accMat, darkMat, browL, browR, smile);

  // Render to texture
  const rt = new THREE.WebGLRenderTarget(size, size, {type: THREE.UnsignedByteType, format: THREE.RGBAFormat});
  const oldRT = renderer.getRenderTarget();
  const oldSize = renderer.getSize(new THREE.Vector2());
  const oldPixelRatio = renderer.getPixelRatio();

  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.setRenderTarget(rt);
  renderer.render(avScene, avCam);

  // Read pixels to canvas
  const pixels = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, pixels);

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

  // Restore renderer
  renderer.setRenderTarget(oldRT);
  renderer.setPixelRatio(oldPixelRatio);
  renderer.setSize(oldSize.x, oldSize.y);

  avatarCache[key] = dataUrl;
  return dataUrl;
}

function addAvatarAccessories(scene, player, skinMat, bodyMat, accMat, darkMat, browL, browR, smile) {
  switch(player.name) {
    case 'The Prosecutor': case 'Blaze': {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, TAU, 0, PI*0.45), new THREE.MeshStandardMaterial({color:0x2a1a0a, roughness:0.4}));
      hair.position.set(0, 1.05, 0); hair.scale.set(1, 0.5, 1); scene.add(hair);
      const collar = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.15, 4), accMat);
      collar.position.set(0, 0.62, 0.28); collar.rotation.x = PI; collar.rotation.y = PI/4; scene.add(collar);
      const tie = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), new THREE.MeshStandardMaterial({color:0xc0392b}));
      tie.position.set(0, 0.5, 0.3); tie.rotation.x = -PI/2+0.3; scene.add(tie);
      break;
    }
    case 'The Therapist': case 'SafetySam': {
      const glassL = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16), new THREE.MeshStandardMaterial({color:0x333333, metalness:0.5, roughness:0.2}));
      glassL.position.set(-0.12, 1.0, 0.32); scene.add(glassL);
      const glassR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16), new THREE.MeshStandardMaterial({color:0x333333, metalness:0.5, roughness:0.2}));
      glassR.position.set(0.12, 1.0, 0.32); scene.add(glassR);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12, 0, TAU, 0, PI*0.5), new THREE.MeshStandardMaterial({color:0x4a3520, roughness:0.5}));
      hair.position.set(0, 1.04, 0); hair.scale.set(1, 0.6, 1); scene.add(hair);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), new THREE.MeshStandardMaterial({color:0x4a3520, roughness:0.5}));
      bun.position.set(0, 1.22, -0.15); scene.add(bun);
      break;
    }
    case 'The Chaos Agent': case 'Twister': {
      for (let k = 0; k < 7; k++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2 + Math.random()*0.1, 5), new THREE.MeshStandardMaterial({color:0xB85820, roughness:0.4}));
        const a = k/7 * TAU;
        spike.position.set(cos(a)*0.25, 1.15, sin(a)*0.25);
        spike.rotation.set(Math.random()*0.3-0.15, a, Math.random()*0.4-0.2);
        scene.add(spike);
      }
      smile.geometry = new THREE.TorusGeometry(0.09, 0.018, 8, 16, PI*1.1);
      break;
    }
    case 'The Gut Player': case 'ConspiBro': {
      const bandana = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 20), new THREE.MeshStandardMaterial({color:0x7f8c8d, roughness:0.4}));
      bandana.position.set(0, 1.08, 0); bandana.rotation.x = PI/2; bandana.scale.set(1, 1, 0.8); scene.add(bandana);
      const scar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.01), new THREE.MeshStandardMaterial({color:0xaa3333}));
      scar.position.set(-0.15, 0.95, 0.35); scar.rotation.z = 0.2; scene.add(scar);
      break;
    }
    case 'The Statistician': case 'Dr. Pizza': {
      const sgL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 16), new THREE.MeshStandardMaterial({color:0x2980b9, metalness:0.4, roughness:0.2}));
      sgL.position.set(-0.12, 1.0, 0.32); scene.add(sgL);
      const sgR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 16), new THREE.MeshStandardMaterial({color:0x2980b9, metalness:0.4, roughness:0.2}));
      sgR.position.set(0.12, 1.0, 0.32); scene.add(sgR);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, TAU, 0, PI*0.4), new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.3}));
      hair.position.set(0, 1.06, 0); hair.scale.set(1, 0.35, 1.05); scene.add(hair);
      break;
    }
    case 'The Underdog': case 'EasyBake': {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12, 0, TAU, 0, PI*0.55), new THREE.MeshStandardMaterial({color:0x5a3e10, roughness:0.6}));
      hair.position.set(0, 1.02, 0); hair.scale.set(1.05, 0.65, 1.05); hair.rotation.z = 0.08; scene.add(hair);
      for (let k = 0; k < 3; k++) {
        const strand = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1 + Math.random()*0.06, 4), new THREE.MeshStandardMaterial({color:0x5a3e10, roughness:0.6}));
        strand.position.set(-0.1 + k*0.1, 1.2 + Math.random()*0.05, 0);
        strand.rotation.set(Math.random()*0.3-0.15, 0, Math.random()*0.3-0.15);
        scene.add(strand);
      }
      browL.position.y = 1.08; browL.rotation.z = -0.2;
      browR.position.y = 1.08; browR.rotation.z = 0.2;
      break;
    }
  }
}

// ===== Camera Controls =====
let theta = 0, phi = PI / 3.5, dist = 12;
const targetV = new THREE.Vector3(0, 0.5, 0);
let isDrag = false, isPan = false, px = 0, py = 0;

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
    dist = Math.max(3, Math.min(25, dist));
    updateCam();
  }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

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
            <div class="name" style="color:${hex}">${displayName}${lang === 'zh' ? ' <span style=\"font-size:11px;color:#888;\">' + p.name + '</span>' : ' <span style=\"font-size:11px;color:#888;\">' + (p.name_zh||'') + '</span>'}</div>
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

    // Click on character opens modal
    if (e.detail === 1 && foundId > 0) {
      showPlayerModal(foundId);
    }
    // Double-click opens full side panel detail
    if (e.detail === 2 && foundId > 0) {
      showPlayerDetail(foundId);
    }
  });

  updateCam();
}

// ===== Night Mode =====
function setNight(n) {
  isNight = n;
  scene.background = new THREE.Color(n ? 0x0a0a18 : 0x1a1520);
  scene.fog.color.set(n ? 0x0a0a18 : 0x1a1520);
  amb.intensity = n ? 0.15 : 0.45;
  dir.intensity = n ? 0.3 : 0.85;
  dir.color.set(n ? 0x6677ff : 0xfff5e0);
  moonPoint.intensity = n ? 0.6 : 0;
  candlePoint.intensity = n ? 4 : 1.5;
  flame.material.emissiveIntensity = n ? 2.5 : 0.8;
}

// ===== Name Tags =====
const tagEls = [];
function buildNameTags() {
  tagsContainer.innerHTML = '';
  PLAYERS.forEach(p => {
    const d = document.createElement('div');
    d.className = 'tag';
    const hex = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
    d.style.border = '1px solid ' + hex + '44';
    d.style.color = hex;
    const main = lang === 'zh' ? (p.name_zh || p.name) : p.name;
    const sub = lang === 'zh' ? p.name : (p.name_zh || '');
    d.innerHTML = main + '<div class="zh">' + sub + '</div>';
    tagsContainer.appendChild(d);
    tagEls.push(d);
  });
}

function updateNameTags() {
  const w = innerWidth, h = innerHeight;
  PLAYERS.forEach((p, i) => {
    const pos = sp(i);
    const v = new THREE.Vector3(pos[0], pos[1] + 1.6, pos[2]);
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
function showBubble(playerIndex, text, duration = 4000) {
  const p = PLAYERS[playerIndex];
  if (!p) return;
  const hex = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
  const subName = lang === 'zh' ? p.name : (p.name_zh || '');

  const el = document.createElement('div');
  el.className = 'bubble';
  el.style.borderColor = hex;
  el.innerHTML = `
    <div class="speaker" style="color:${hex}">${displayName}${subName ? '<span style=\"font-size:10px;color:#888;margin-left:4px;\"\u003e' + subName + '</span\u003e' : ''}</div>
    <div class="text">${escapeHtml(text)}</div>
    <div class="arrow" style="border-top-color:${hex}"></div>
  `;
  bubblesContainer.appendChild(el);

  // Highlight speaker
  if (chars[playerIndex] && chars[playerIndex].userData.highlight) {
    chars[playerIndex].userData.highlight.material.opacity = 0.6;
  }

  const bubbleData = { playerIndex, text, duration, startTime: performance.now(), el, hex };
  activeBubblesData.push(bubbleData);
  updateBubblePosition(bubbleData);

  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
    activeBubblesData = activeBubblesData.filter(b => b !== bubbleData);
    if (chars[playerIndex] && chars[playerIndex].userData.highlight) {
      chars[playerIndex].userData.highlight.material.opacity = 0;
    }
  }, duration);
}

function updateBubblePosition(b) {
  const p = PLAYERS[b.playerIndex];
  if (!p) return;
  const pos = sp(b.playerIndex);
  const v = new THREE.Vector3(pos[0], pos[1] + 1.8, pos[2]);
  v.project(camera);
  const x = (v.x * 0.5 + 0.5) * innerWidth;
  const y = (-v.y * 0.5 + 0.5) * innerHeight;
  b.el.style.left = x + 'px';
  b.el.style.top = y + 'px';
}

function updateAllBubbles() {
  activeBubblesData.forEach(b => updateBubblePosition(b));
}

function clearBubbles() {
  bubblesContainer.innerHTML = '';
  activeBubblesData = [];
  chars.forEach(c => {
    if (c.userData && c.userData.highlight) {
      c.userData.highlight.material.opacity = 0;
    }
  });
}

// ===== Vote Arrows =====
function showVoteArrows(votes) {
  activeVotes = votes;
  redrawVoteArrows();
}

function redrawVoteArrows() {
  if (!activeVotes) return;
  voteOverlay.innerHTML = '';
  for (const [voter, target] of Object.entries(activeVotes)) {
    const vi = PLAYERS.findIndex(p => p.name === voter);
    const ti = PLAYERS.findIndex(p => p.name === target);
    if (vi < 0 || ti < 0) continue;

    // Project both positions
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

    const voterColor = getPlayerColor(voter);
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 10) continue;

    const headLen = Math.min(16, len * 0.25);
    const angle = Math.atan2(dy, dx);
    const hx1 = ex - headLen * Math.cos(angle - 0.4);
    const hy1 = ey - headLen * Math.sin(angle - 0.4);
    const hx2 = ex - headLen * Math.cos(angle + 0.4);
    const hy2 = ey - headLen * Math.sin(angle + 0.4);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'vote-arrow-svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', sx); line.setAttribute('y1', sy);
    line.setAttribute('x2', ex); line.setAttribute('y2', ey);
    line.setAttribute('stroke', voterColor);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6,4');
    line.setAttribute('opacity', '0.7');
    svg.appendChild(line);

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('points', `${ex},${ey} ${hx1},${hy1} ${hx2},${hy2}`);
    head.setAttribute('fill', voterColor);
    head.setAttribute('opacity', '0.85');
    svg.appendChild(head);

    const voterP = PLAYERS.find(x => x.name === voter);
    const voterName = lang === 'zh' && voterP ? (voterP.name_zh || voter) : voter;
    const label = document.createElement('div');
    label.className = 'vote-label';
    label.style.left = sx + 'px';
    label.style.top = sy + 'px';
    label.style.color = voterColor;
    label.textContent = voterName;

    voteOverlay.appendChild(svg);
    voteOverlay.appendChild(label);
  }
}

function clearVoteArrows() {
  activeVotes = null;
  voteOverlay.innerHTML = '';
}

// ===== Result Banner =====
function showResultBanner(outcome, reason, winners) {
  const titles = {
    werewolf_win: '🐺 ' + t('werewolfWin'),
    village_win: '🏘️ ' + t('villageWin'),
    tanner_win: '🎭 ' + t('tannerWin'),
    village_win_no_wolf: '🏘️ ' + t('villageWin'),
    no_team_win: '🤷 ' + t('noTeamWin'),
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
  chars[index].traverse(obj => {
    if (obj.isMesh && obj.material) {
      obj.material.originalColor = obj.material.color.clone();
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
    g.traverse(obj => {
      if (obj.isMesh && obj.material && obj.material.originalColor) {
        obj.material.color.copy(obj.material.originalColor);
        delete obj.material.originalColor;
      }
    });
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
    const resp = await fetch('./data/index.json');
    if (!resp.ok) throw new Error('No index');
    const index = await resp.json();
    if (index.games && index.games.length > 0) {
      const latest = index.games[index.games.length - 1];
      await loadGame(latest.game_id || latest.id);
      buildArchiveList(index.games);
    }
  } catch(e) {
    console.log('No game index found, showing empty scene');
  }
}

async function loadGame(gameId) {
  const base = `./data/games/${gameId}/`;
  const suffix = lang === 'zh' ? '_zh' : '';
  const fallback = '';
  
  async function fetchJSON(name) {
    // Try localized version first, fall back to original
    if (suffix) {
      try {
        const r = await fetch(base + name + suffix + '.json');
        if (r.ok) return await r.json();
      } catch(e) {}
    }
    const r2 = await fetch(base + name + fallback + '.json');
    return r2.ok ? await r2.json() : null;
  }
  
  try {
    const [night, day, vote, resolve, postgame] = await Promise.all([
      fetchJSON('night_result'),
      fetchJSON('day_result'),
      fetchJSON('vote_result'),
      fetchJSON('resolve_result'),
      fetchJSON('postgame_result'),
    ]);
    
    let chatHistory = '';
    try {
      if (suffix) {
        try {
          chatHistory = await (await fetch(base + 'chat_history' + suffix + '.md')).text();
        } catch(e) { chatHistory = await (await fetch(base + 'chat_history.md')).text(); }
      } else {
        chatHistory = await (await fetch(base + 'chat_history.md')).text();
      }
    } catch(e) {}

    currentGame = gameId;
    gameData = { night, day, vote, resolve, postgame, chatHistory };
    currentPhase = 'night';
    replayIndex = 0;
    
    // Dynamically build PLAYERS from game data
    if (night && night.players) {
      PLAYERS = Object.values(night.players).map(p => {
        const style = PLAYER_STYLES[p.name] || {};
        return {
          id: p.id,
          name: p.name,
          name_zh: p.name_zh || '',
          name_en: p.name_en || p.name,
          persona: p.persona || '',
          model: p.model || '',
          thinking: p.thinking || 'high',
          color: style.color || 0xc0392b,
          accent: style.accent || 0xe74c3c,
          body: style.body || 0x4a0000,
          head: style.head || 0xD4A574,
          icon: style.icon || '🎭',
        };
      });
      // Rebuild 3D scene with new players
      rebuildScene();
    }
    
    setPhase('night');
    showGameInfo();
  } catch(e) {
    console.error('Failed to load game', gameId, e);
  }
}

function rebuildScene() {
  // Remove old characters
  chars.forEach(g => scene.remove(g));
  chars = [];
  // Build new ones
  buildAllCharacters();
  buildNameTags();
}

function buildArchiveList(games) {
  const list = document.getElementById('archive-list');
  list.innerHTML = '';
  games.reverse().forEach(g => {
    const el = document.createElement('div');
    el.className = 'game-item' + (g.game_id === currentGame || g.id === currentGame ? ' active' : '');
    const id = g.game_id || g.id;
    const outcome = g.outcome || g.summary?.outcome || '?';
    const date = g.date || g.timestamp || '';
    el.innerHTML = `
      <div class="gid">Game ${String(id).replace('game_', '').replace('game-', '')}</div>
      <div class="outcome">${outcome}</div>
      <div class="date">${date}</div>
    `;
    el.addEventListener('click', () => loadGame(id));
    list.appendChild(el);
  });
}

// ===== Phase Management =====
function setPhase(phase) {
  currentPhase = phase;
  // Update timeline UI
  document.querySelectorAll('.phase-step').forEach(el => {
    el.classList.toggle('active', el.dataset.phase === phase);
  });

  clearBubbles();
  clearVoteArrows();
  hideResultBanner();
  undimAll();

  switch(phase) {
    case 'night':
      setNight(true);
      showNightInfo();
      break;
    case 'day':
      setNight(false);
      showDayInfo();
      break;
    case 'vote':
      setNight(false);
      showVoteInfo();
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

function showNightInfo() {
  if (!gameData.night) return;
  const players = gameData.night.players || {};
  const trace = gameData.night.night_trace || [];
  
  let html = '<div class="panel-section"><h3>🌙 ' + t('nightPhase') + '</h3>';
  html += '<div class="row"><span class="key">' + t('centerCards') + '</span><span class="val">' + (gameData.night.center_cards || []).join(', ') + '</span></div>';
  
  html += '<h3 style="margin-top:16px;">' + t('roles') + '</h3>';
  for (const [, p] of Object.entries(players)) {
    const accent = getPlayerColor(p.name);
    const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
    html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${p.initial_role}</span></div>`;
  }
  
  if (trace.length > 0) {
    html += '<h3 style="margin-top:16px;">' + t('nightActions') + '</h3>';
    for (const tr of trace) {
      const trP = PLAYERS.find(x => x.name === (tr.actor || tr.player || ''));
      const trName = trP ? (lang === 'zh' ? (trP.name_zh || trP.name) : trP.name) : (tr.actor || tr.player || tr.role || '?');
      const trAction = tr.action || '?';
      const trTarget = tr.target ? (() => {
        const tp = PLAYERS.find(x => x.name === tr.target);
        return lang === 'zh' && tp ? (tp.name_zh || tr.target) : tr.target;
      })() : '';
      html += `<div class="row"><span class="key" style="color:${trP ? getPlayerColor(trP.name) : '#888'}">${trName}</span><span class="val">${trAction}${trTarget ? ' → ' + trTarget : ''}</span></div>`;
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel();
}

function showDayInfo() {
  if (!gameData.day) return;
  const stats = gameData.day.player_stats || {};
  const trace = gameData.day.day_trace || [];
  const speeches = trace.filter(tr => tr.type === 'speech');
  
  let html = '<div class="panel-section"><h3>☀️ ' + t('dayDiscussion') + '</h3>';
  html += `<div class="row"><span class="key">${t('duration')}</span><span class="val">${(gameData.day.config?.duration_seconds || 0)}s</span></div>`;
  html += `<div class="row"><span class="key">${t('totalSpeeches')}</span><span class="val">${speeches.length}</span></div>`;
  
  html += '<h3 style="margin-top:16px;">' + t('playerStats') + '</h3>';
  for (const [name, s] of Object.entries(stats)) {
    const accent = getPlayerColor(name);
    const p = PLAYERS.find(x => x.name === name);
    const displayName = lang === 'zh' && p ? (p.name_zh || name) : name;
    html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${s.speak_count} ${t('speaks')}</span></div>`;
  }
  
  if (speeches.length > 0) {
    html += '<h3 style="margin-top:16px;">' + t('discussionLog') + '</h3>';
    for (const s of speeches) {
      const accent = getPlayerColor(s.player_name);
      const p = PLAYERS.find(x => x.name === s.player_name);
      const displayName = lang === 'zh' && p ? (p.name_zh || s.player_name) : s.player_name;
      html += `<div class="speech-entry" style="border-left-color:${accent}">`;
      html += `<div class="speaker" style="color:${accent}">${displayName}${s.target ? ' @' + s.target : ''}</div>`;
      html += `<div class="text">${escapeHtml(s.speech || '')}</div>`;
      if (s.timestamp) html += `<div class="time">${s.timestamp}</div>`;
      html += '</div>';
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel();

  // Start replay of speeches
  startSpeechReplay(speeches);
}

function showVoteInfo() {
  if (!gameData.vote) return;
  const votes = gameData.vote.votes || {};
  const tally = gameData.vote.tally || {};
  const executed = gameData.vote.executed || [];
  
  let html = '<div class="panel-section"><h3>🗳️ ' + t('voting') + '</h3>';
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
    html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${count} ${t('vote')}${count !== 1 ? 's' : ''}${isExecuted ? ' ☠️' : ''}</span></div>`;
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
  openSidePanel();

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
  
  let html = '<div class="panel-section"><h3>⚖️ ' + t('resolution') + '</h3>';
  html += `<div class="row"><span class="key">${t('outcome')}</span><span class="val">${r.outcome || '?'}</span></div>`;
  html += `<div class="row"><span class="key">${t('reason')}</span><span class="val">${r.reason || '?'}</span></div>`;
  
  if (r.winners) {
    const winNames = r.winners.map(n => {
      const p = PLAYERS.find(x => x.name === n);
      return lang === 'zh' && p ? (p.name_zh || n) : n;
    });
    html += `<div class="row"><span class="key">${t('winners')}</span><span class="val" style="color:var(--success)">${winNames.join(', ')}</span></div>`;
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
      html += `<div class="row"><span class="key" style="color:${accent}">${displayName}</span><span class="val">${role.current_role} (${role.team})</span></div>`;
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel();

  // Show result banner
  showResultBanner(r.outcome, r.reason, r.winners);

  // Dim executed
  if (r.executed) {
    r.executed.forEach(name => {
      const idx = PLAYERS.findIndex(p => p.name === name);
      if (idx >= 0) dimCharacter(idx);
    });
  }
  
  // Trigger team animations: winners celebrate, losers sulk
  triggerTeamAnimations(r);
}

function triggerTeamAnimations(resolveData) {
  teamAnims = [];
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
  
  let html = '<div class="panel-section"><h3>🎤 ' + t('postgame') + '</h3>';
  for (const [cat, items] of Object.entries(interviews)) {
    if (!items || items.length === 0) continue;
    const catLabels = { dead: '💀 ' + t('deadExec'), winners: '🏆 ' + t('winLabel'), losers: '😢 ' + t('loseLabel') };
    const catLabel = catLabels[cat] || cat;
    html += `<h3 style="margin-top:12px;">${catLabel}</h3>`;
    for (const i of items) {
      const accent = getPlayerColor(i.player_name);
      const p = PLAYERS.find(x => x.name === i.player_name);
      const displayName = lang === 'zh' && p ? (p.name_zh || i.player_name) : i.player_name;
      html += `<div class="speech-entry" style="border-left-color:${accent}">`;
      html += `<div class="speaker" style="color:${accent}">${displayName} (${i.role})</div>`;
      html += `<div class="text">${escapeHtml(i.quote || '')}</div>`;
      html += '</div>';
    }
  }
  html += '</div>';
  document.getElementById('panel-content').innerHTML = html;
  openSidePanel();

  // Show postgame bubbles
  const all = [...(interviews.dead || []), ...(interviews.winners || []), ...(interviews.losers || [])];
  let delay = 0;
  all.forEach(item => {
    const idx = PLAYERS.findIndex(p => p.name === item.player_name);
    if (idx >= 0 && item.quote) {
      setTimeout(() => showBubble(idx, item.quote, 5000), delay);
      delay += 1500;
    }
  });
}

function showGameInfo() {
  // Show basic game info in side panel on load
  if (!gameData.night) return;
  showNightInfo();
}

function showPlayerModal(playerId) {
  const p = PLAYERS.find(x => String(x.id) === String(playerId));
  if (!p) return;
  const accent = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
  const subName = lang === 'zh' ? p.name : (p.name_zh || '');

  // Gather game data
  let initialRole = '?', currentRole = '?', nightMem = '';
  if (gameData.night && gameData.night.players) {
    for (const [, pd] of Object.entries(gameData.night.players)) {
      if (pd.name === p.name) {
        initialRole = pd.initial_role || '?';
        currentRole = pd.current_role || '?';
        nightMem = pd.night_memory_text || (Array.isArray(pd.night_memory) ? pd.night_memory.join(' ') : pd.night_memory || '');
        break;
      }
    }
  }

  // Speeches
  let speeches = [];
  if (gameData.day && gameData.day.day_trace) {
    speeches = gameData.day.day_trace.filter(tr => tr.type === 'speech' && tr.player_name === p.name);
  }

  // Vote
  let votedFor = '';
  if (gameData.vote && gameData.vote.votes && gameData.vote.votes[p.name]) {
    votedFor = gameData.vote.votes[p.name];
  }

  // Postgame
  let postgameQuote = null, postgameRole = '';
  if (gameData.postgame && gameData.postgame.interviews) {
    for (const [, items] of Object.entries(gameData.postgame.interviews)) {
      const item = items.find(i => i.player_name === p.name);
      if (item) { postgameQuote = item.quote || ''; postgameRole = item.role || ''; break; }
    }
  }

  // --- Build Persona tab ---
  let personaHtml = `<div class="modal-header">
    <div class="name" style="color:${accent}">${displayName}</div>
    ${subName ? `<div class="sub">${subName}</div>` : ''}
  </div>`;
  personaHtml += `<div class="modal-section"><h3>${t('persona')}</h3><p style="font-size:13px;line-height:1.7;color:var(--text);">${escapeHtml(p.persona||'')}</p></div>`;
  personaHtml += `<div class="modal-section"><h3>${lang==='zh'?'模型':'Model'}</h3><div class="row"><span class="key">AI</span><span class="val">${(p.model||'').split('/').pop()}</span></div><div class="row"><span class="key">${t('thinking')}</span><span class="val">${p.thinking||'high'}</span></div></div>`;

  // --- Build Game tab ---
  let gameHtml = `<div class="modal-section"><h3>${t('gameData')}</h3>
    <div class="row"><span class="key">${t('initialRole')}</span><span class="val">${initialRole}</span></div>
    <div class="row"><span class="key">${t('currentRole')}</span><span class="val">${currentRole}</span></div>`;
  if (nightMem) gameHtml += `<div class="row" style="display:block;"><span class="key">${t('nightMemory')}</span><span style="font-size:12px;color:var(--text);margin-top:4px;display:block;">${escapeHtml(nightMem)}</span></div>`;
  if (votedFor) {
    const tp = PLAYERS.find(x => x.name === votedFor);
    const targetName = lang === 'zh' && tp ? (tp.name_zh || votedFor) : votedFor;
    gameHtml += `<div class="row"><span class="key">${t('vote')}</span><span class="val" style="color:${getPlayerColor(votedFor)}">→ ${targetName}</span></div>`;
  }
  gameHtml += '</div>';

  if (speeches.length > 0) {
    gameHtml += `<div class="modal-section"><h3>${t('speeches')} (${speeches.length})</h3>`;
    speeches.forEach(s => {
      gameHtml += `<div class="speech-entry" style="border-left-color:${accent}">`;
      if (s.target) gameHtml += `<div class="speaker" style="color:${accent}">${displayName} @${s.target}</div>`;
      else gameHtml += `<div class="speaker" style="color:${accent}">${displayName}</div>`;
      gameHtml += `<div class="text">${escapeHtml(s.speech||'')}</div>`;
      if (s.timestamp) gameHtml += `<div class="time">${s.timestamp}</div>`;
      gameHtml += '</div>';
    });
    gameHtml += '</div>';
  }

  if (postgameQuote) {
    gameHtml += `<div class="modal-section"><h3>${t('postgameLabel')}</h3>`;
    gameHtml += `<div class="speech-entry" style="border-left-color:${accent}"><div class="speaker" style="color:${accent}">${displayName} (${postgameRole})</div><div class="text">${escapeHtml(postgameQuote)}</div></div>`;
    gameHtml += '</div>';
  }

  // Store tab content
  const modal = document.getElementById('player-modal');
  const contentEl = document.getElementById('player-modal-content');
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

  modal.classList.add('visible');

  // --- Render 3D full-body model in left panel ---
  renderModal3D(p);
}

// ===== Modal 3D Full-Body Renderer =====
let modal3DRenderer = null;
let modal3DScene = null;
let modal3DCamera = null;
let modal3DAnimId = null;
let modal3DChar = null;

function renderModal3D(player) {
  // Cleanup previous
  if (modal3DAnimId) cancelAnimationFrame(modal3DAnimId);
  if (modal3DRenderer) {
    modal3DRenderer.dispose();
    modal3DRenderer = null;
  }
  if (modal3DScene) {
    modal3DScene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    modal3DScene = null;
  }

  const canvas = document.getElementById('player-modal-3d');
  if (!canvas) return;

  modal3DRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  modal3DRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  modal3DRenderer.shadowMap.enabled = true;
  modal3DRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  modal3DScene = new THREE.Scene();
  modal3DScene.background = new THREE.Color(0x1a1520);

  modal3DCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  modal3DCamera.position.set(0, 1.2, 3.5);
  modal3DCamera.lookAt(0, 0.5, 0);

  // Lights
  const amb = new THREE.AmbientLight(0xffffff, 0.5);
  modal3DScene.add(amb);
  const dir = new THREE.DirectionalLight(0xfff5e0, 0.9);
  dir.position.set(2, 4, 3);
  dir.castShadow = true;
  dir.shadow.mapSize.set(512, 512);
  modal3DScene.add(dir);
  const fill = new THREE.DirectionalLight(0x6688ff, 0.2);
  fill.position.set(-2, 1, 1);
  modal3DScene.add(fill);
  const rim = new THREE.DirectionalLight(0xff8844, 0.15);
  rim.position.set(0, 2, -3);
  modal3DScene.add(rim);

  // Build full character (reuse buildCharacter but in isolated scene)
  // Remove from main scene first, we'll re-add to modal scene
  const existingIdx = PLAYERS.findIndex(x => x.name === player.name);
  modal3DChar = buildCharacter(player, existingIdx >= 0 ? existingIdx : 0);
  // Center it
  modal3DChar.position.set(0, SH, 0);
  modal3DChar.rotation.y = 0;
  modal3DScene.add(modal3DChar);

  // Resize canvas to fit container
  resizeModal3D();

  // Animation loop
  const animate = () => {
    modal3DAnimId = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;
    // Gentle rotation
    if (modal3DChar) {
      modal3DChar.rotation.y = Math.sin(t * 0.3) * 0.3;
      modal3DChar.position.y = SH + Math.sin(t * 1.5) * 0.03;
    }
    if (modal3DRenderer && modal3DScene && modal3DCamera) {
      modal3DRenderer.render(modal3DScene, modal3DCamera);
    }
  };
  animate();
}

function resizeModal3D() {
  const canvas = document.getElementById('player-modal-3d');
  if (!canvas || !modal3DRenderer) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(200, rect.width);
  const h = Math.max(300, rect.height);
  modal3DRenderer.setSize(w, h, false);
  if (modal3DCamera) {
    modal3DCamera.aspect = w / h;
    modal3DCamera.updateProjectionMatrix();
  }
}

function closePlayerModal() {
  const modal = document.getElementById('player-modal');
  modal.classList.remove('visible');
  if (modal3DAnimId) cancelAnimationFrame(modal3DAnimId);
  modal3DAnimId = null;
  if (modal3DRenderer) {
    modal3DRenderer.dispose();
    modal3DRenderer = null;
  }
  if (modal3DScene) {
    modal3DScene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    modal3DScene = null;
  }
}

function showPlayerDetail(playerId) {
  const p = PLAYERS.find(x => String(x.id) === String(playerId));
  if (!p) return;
  const accent = '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
  const displayName = lang === 'zh' ? (p.name_zh || p.name) : p.name;
  const subName = lang === 'zh' ? p.name : (p.name_zh || '');
  
  let html = `<div class="panel-section">
    <h3 style="color:${accent}">${displayName}</h3>
    ${subName ? `<div class="row"><span class="key">${t('chineseName')}</span><span class="val">${subName}</span></div>` : ''}
    <div class="row"><span class="key">${t('thinking')}</span><span class="val">${p.thinking || 'high'}</span></div>
  </div>`;
  
  html += `<div class="panel-section"><h3>${t('persona')}</h3><p style="font-size:12px;line-height:1.6;color:var(--text);">${escapeHtml(p.persona || '')}</p></div>`;
  
  // Find this player's data in game
  if (gameData.night && gameData.night.players) {
    for (const [, pd] of Object.entries(gameData.night.players)) {
      if (pd.name === p.name) {
        html += `<div class="panel-section"><h3>${t('gameData')}</h3>`;
        html += `<div class="row"><span class="key">${t('initialRole')}</span><span class="val">${pd.initial_role || '?'}</span></div>`;
        html += `<div class="row"><span class="key">${t('currentRole')}</span><span class="val">${pd.current_role || '?'}</span></div>`;
        const mem = pd.night_memory_text || (Array.isArray(pd.night_memory) ? pd.night_memory.join(' ') : pd.night_memory || '');
        if (mem) html += `<div class="row" style="display:block;"><span class="key">${t('nightMemory')}</span><span style="font-size:11px;color:var(--text);margin-top:4px;display:block;">${escapeHtml(mem)}</span></div>`;
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
        if (s.target) html += `<div class="speaker" style="color:${accent}">${displayName} @${s.target}</div>`;
        else html += `<div class="speaker" style="color:${accent}">${displayName}</div>`;
        html += `<div class="text">${escapeHtml(s.speech || '')}</div>`;
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
        html += `<div class="text">${escapeHtml(item.quote || '')}</div>`;
        html += '</div></div>';
      }
    }
  }

  document.getElementById('panel-content').innerHTML = html;
  openSidePanel();
}

// ===== Speech Replay =====
function startSpeechReplay(speeches) {
  replayIndex = 0;
  replayPlaying = false;
  replayControls.classList.add('visible');
  updateReplayProgress();
  
  // Show first speech automatically
  if (speeches.length > 0) {
    showSpeechAt(0);
  }
}

function showSpeechAt(idx) {
  clearBubbles();
  if (idx < 0 || idx >= (gameData.day?.day_trace || []).length) return;
  const trace = gameData.day.day_trace;
  const item = trace[idx];
  if (item.type === 'speech') {
    const pi = PLAYERS.findIndex(p => p.name === item.player_name);
    if (pi >= 0) showBubble(pi, item.speech, 6000);
  }
  replayIndex = idx;
  updateReplayProgress();
}

function updateReplayProgress() {
  const speeches = (gameData.day?.day_trace || []).filter(t => t.type === 'speech');
  const el = document.getElementById('replay-progress');
  if (el) el.textContent = `${replayIndex + 1} / ${speeches.length}`;
}

function playReplay() {
  const speeches = (gameData.day?.day_trace || []).filter(t => t.type === 'speech');
  if (replayIndex >= speeches.length - 1) replayIndex = -1;
  replayPlaying = true;
  document.getElementById('btn-play').textContent = '⏸';
  nextReplayStep();
}

function nextReplayStep() {
  if (!replayPlaying) return;
  const trace = gameData.day?.day_trace || [];
  // Find next speech
  for (let i = replayIndex + 1; i < trace.length; i++) {
    if (trace[i].type === 'speech') {
      showSpeechAt(i);
      replayTimer = setTimeout(nextReplayStep, 5000);
      return;
    }
  }
  stopReplay();
}

function stopReplay() {
  replayPlaying = false;
  document.getElementById('btn-play').textContent = '▶';
  if (replayTimer) clearTimeout(replayTimer);
}

// ===== UI Setup =====
function setupUI() {
  buildNameTags();
  updateUIText();

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
    document.getElementById('archive-panel').classList.toggle('open');
  });
  document.getElementById('btn-archive-close').addEventListener('click', () => {
    document.getElementById('archive-panel').classList.remove('open');
  });

  document.getElementById('btn-info').addEventListener('click', () => {
    openSidePanel();
  });
  document.getElementById('btn-panel-close').addEventListener('click', () => {
    document.getElementById('side-panel').classList.remove('open');
  });

  // Language toggle
  document.getElementById('btn-lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'zh' : 'en';
    updateUIText();
    buildNameTags(); // Rebuild name tags with new language
    // Reload game data with new language, then restore phase
    if (currentGame) {
      const savedPhase = currentPhase;
      loadGame(currentGame).then(() => {
        setPhase(savedPhase);
      });
    } else if (gameData.night) {
      const currentPhaseSaved = currentPhase;
      setPhase(currentPhaseSaved);
    }
  });

  // Modal close
  document.getElementById('player-modal-close').addEventListener('click', closePlayerModal);
  document.getElementById('player-modal').addEventListener('click', e => {
    if (e.target.id === 'player-modal') closePlayerModal();
  });

  // Modal tab switching
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const modal = document.getElementById('player-modal');
      const tabKey = tab.dataset.tab;
      if (!modal._tabContent || !modal._tabContent[tabKey]) return;
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      modal._currentTab = tabKey;
      document.getElementById('player-modal-content').innerHTML = modal._tabContent[tabKey];
    });
  });

  // Replay controls
  document.getElementById('btn-prev').addEventListener('click', () => {
    stopReplay();
    const trace = gameData.day?.day_trace || [];
    for (let i = replayIndex - 1; i >= 0; i--) {
      if (trace[i].type === 'speech') { showSpeechAt(i); break; }
    }
  });
  document.getElementById('btn-play').addEventListener('click', () => {
    if (replayPlaying) stopReplay();
    else playReplay();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    stopReplay();
    const trace = gameData.day?.day_trace || [];
    for (let i = replayIndex + 1; i < trace.length; i++) {
      if (trace[i].type === 'speech') { showSpeechAt(i); break; }
    }
  });
}

function updateUIText() {
  document.querySelector('.brand').innerHTML = '🐺 ' + t('brand') + ' <span class="sub">' + t('sub') + '</span>';
  document.getElementById('btn-archive').innerHTML = '<span class="btn-icon">📂</span> ' + t('archive');
  document.getElementById('btn-info').innerHTML = '<span class="btn-icon">ℹ️</span> ' + t('info');
  document.getElementById('btn-night').innerHTML = '<span class="btn-icon">🌙</span> ' + t('night');
  document.getElementById('btn-rotate').innerHTML = '<span class="btn-icon">🔄</span> ' + t('autoRotate');
  document.getElementById('btn-lang').innerHTML = t('langLabel');
  document.getElementById('loading').textContent = t('loadingVillage');
  // Update phase labels
  const phaseLabels = { night: t('nightPhase'), day: t('dayDiscussion'), vote: t('voting'), resolve: t('resolution'), postgame: t('postgame') };
  document.querySelectorAll('.phase-step').forEach(el => {
    const label = el.querySelector('.label');
    if (label) label.textContent = phaseLabels[el.dataset.phase] || '';
  });
  // Archive title
  const archiveH3 = document.querySelector('#archive-panel h3');
  if (archiveH3) archiveH3.textContent = t('gameArchive');
}

function openSidePanel() {
  document.getElementById('side-panel').classList.add('open');
}

// ===== Helpers =====
function getPlayerColor(name) {
  const p = PLAYERS.find(x => x.name === name);
  if (!p) return '#e8c468';
  return '#' + (p.accent || 0xe74c3c).toString(16).padStart(6, '0');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
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
    }
  });

  // Flame flicker
  if (flame) {
    flame.scale.y = 1 + Math.sin(t * 8) * 0.15;
    flame.scale.x = 1 + Math.sin(t * 7) * 0.1;
    flame.position.y = 0.72 + Math.sin(t * 8) * 0.01;
  }

  // Auto rotate
  if (autoRotate) { theta += 0.003; updateCam(); }

  // Per-frame updates for overlays
  updateNameTags();
  updateAllBubbles();
  if (activeVotes) redrawVoteArrows();
  updateDeathAnims(tMs);
  updateTeamAnims(tMs);

  renderer.render(scene, camera);
}

// ===== Resize =====
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  resizeModal3D();
});

// ===== Start =====
init();