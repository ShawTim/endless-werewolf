async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}`);
  return r.json();
}
async function loadJsonOptional(path) {
  const r = await fetch(path);
  if (!r.ok) return null;
  return r.json();
}
async function loadText(path) {
  const r = await fetch(path);
  if (!r.ok) return '';
  return r.text();
}

const els = {
  list: document.getElementById('game-list'),
  search: document.getElementById('search'),
  details: document.getElementById('details'),
  empty: document.getElementById('empty'),
  meta: document.getElementById('meta'),
  night: document.getElementById('tab-night'),
  chat: document.getElementById('tab-chat'),
  vote: document.getElementById('tab-vote'),
  resolve: document.getElementById('tab-resolve'),
  latestSummary: document.getElementById('latest-summary'),
  lang: document.getElementById('lang-select'),
};

let games = [];
let selected = null;
let selectedPayload = null;
let currentLang = localStorage.getItem('werewolf_lang') || 'en';

const avatarPath = {
  Blaze: './assets/avatars/blaze.svg',
  SafetySam: './assets/avatars/safetysam.svg',
  'Dr. Pizza': './assets/avatars/dr_pizza.svg',
  Twister: './assets/avatars/twister.svg',
  EasyBake: './assets/avatars/easybake.svg',
  ConspiBro: './assets/avatars/conspibro.svg',
};

const LABELS = {
  en: {
    werewolf_win:  'Werewolf Victory',
    village_win:   'Village Victory',
    tanner_win:    'Tanner Victory',
    werewolf_team: 'Werewolf',
    village_team:  'Village',
    tanner_team:   'Tanner',
  },
  zh: {
    werewolf_win:  '狼人勝利',
    village_win:   '村民勝利',
    tanner_win:    '鞣皮匠勝利',
    werewolf_team: '狼人陣營',
    village_team:  '村民陣營',
    tanner_team:   '鞣皮匠',
  },
};
function t(key) { return LABELS[currentLang]?.[key] ?? key; }

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n-en]').forEach(el => {
    el.textContent = currentLang === 'zh' ? el.dataset.i18nZh : el.dataset.i18nEn;
  });
}

function setTab(name) {
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  els.night.classList.toggle('hidden', name !== 'night');
  els.chat.classList.toggle('hidden', name !== 'chat');
  els.vote.classList.toggle('hidden', name !== 'vote');
  els.resolve.classList.toggle('hidden', name !== 'resolve');
}

function buildNameMaps(night) {
  const toLocal = new Map();
  const players = (night?.players) ? Object.values(night.players) : [];
  for (const p of players) {
    toLocal.set(p.name, currentLang === 'en' ? (p.name_en || p.name) : (p.name_zh || p.name));
  }
  return { toLocal };
}

function localizeName(raw, maps) {
  return maps.toLocal.get(raw) || raw;
}

function localizeTextByNameMap(text, maps) {
  let out = text || '';
  for (const [raw, local] of maps.toLocal.entries()) {
    const safe = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${safe}\\b`, 'g'), local);
  }
  return out;
}

function roleShort(role = '') {
  return String(role).split(' (')[0] || role;
}

function parseChatLines(chatText) {
  const lines = (chatText || '').split('\n');
  const chunks = [];
  let current = [];

  for (const ln of lines) {
    if (/^\[\d{4}-\d{2}-\d{2}/.test(ln)) {
      if (current.length) chunks.push(current.join('\n'));
      current = [ln];
    } else if (current.length) {
      current.push(ln);
    }
  }
  if (current.length) chunks.push(current.join('\n'));

  const out = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^\[(.*?)\]\s+([^:]+):\s*([\s\S]*)$/);
    if (!m) continue;
    const when = m[1];
    const head = m[2].trim();
    const speech = (m[3] || '').trim();
    const [speaker, targetPart] = head.split(' @');
    out.push({ when, speaker: (speaker || '').trim(), target: targetPart ? targetPart.trim() : null, speech });
  }
  return out;
}

function renderLatestSummary() {
  if (!games.length) {
    els.latestSummary.textContent = 'No games yet.';
    return;
  }
  const g = games[0];
  const executed = (g.executed || []).join(', ') || '-';
  els.latestSummary.innerHTML = `
    <div>Latest game: <strong>${g.game_id}</strong></div>
    <div>Outcome: <strong>${t(g.outcome) || 'unknown'}</strong> · Winner: <strong>${t(g.winner_team) || 'unknown'}</strong></div>
    <div>Executed: <strong>${executed}</strong></div>
    <div class="chips">
      <span class="chip">Chat Lines: ${g.chat_lines ?? '-'}</span>
      <span class="chip">Votes: ${g.votes_count ?? '-'}</span>
    </div>
  `;
}

function renderNight(night, maps) {
  const players = Object.values(night?.players || {}).sort((a, b) => (a.seat || 0) - (b.seat || 0));
  const cards = players.map(p => `
    <div class="info-card">
      <h4>${localizeName(p.name, maps)}</h4>
      <div class="kv">Seat: ${p.seat + 1}</div>
      <div class="kv">Initial: ${roleShort(p.initial_role)}</div>
      <div class="kv">Current: ${roleShort(p.current_role)}</div>
      <div class="kv">Memory: ${p.night_memory_text || '-'}</div>
    </div>
  `).join('');
  const center = (night?.center_cards || []).map((c, i) => `<div class="kv">Center ${i}: ${roleShort(c)}</div>`).join('');

  els.night.innerHTML = `
    <div class="card-grid">
      <div class="info-card"><h4>Center Cards</h4>${center || '<div class="kv">-</div>'}</div>
      ${cards}
    </div>
  `;
}

function renderChat(chatText, maps) {
  const items = parseChatLines(chatText);
  const html = items.map(it => {
    const rawSpeaker = it.speaker;
    const speaker = localizeName(rawSpeaker, maps);
    const target = it.target ? localizeName(it.target, maps) : null;
    const avatar = avatarPath[rawSpeaker] || './assets/avatars/blaze.svg';
    const speech = currentLang === 'zh' ? localizeTextByNameMap(it.speech, maps) : it.speech;

    return `
      <div class="chat-row">
        <img class="chat-avatar" src="${avatar}" alt="${speaker}" />
        <div class="bubble-wrap">
          <div class="speaker-line">${speaker} · ${it.when}${target ? `<span class="target-tag">@${target}</span>` : ''}</div>
          <div class="speech-bubble">${speech}</div>
        </div>
      </div>
    `;
  }).join('');

  els.chat.innerHTML = `<div class="chat-thread">${html || '<div class="kv">(no chat history)</div>'}</div>`;
}

function renderVote(vote, maps) {
  const rows = Object.entries(vote?.votes || {}).map(([from, to]) => `<div class="kv">${localizeName(from, maps)} → ${localizeName(to, maps)}</div>`).join('');
  const tally = Object.entries(vote?.tally || {}).map(([name, n]) => `<div class="kv">${localizeName(name, maps)}: ${n}</div>`).join('');
  const executed = (vote?.executed || []).map(n => localizeName(n, maps)).join(', ') || '-';

  els.vote.innerHTML = `
    <div class="card-grid">
      <div class="info-card"><h4>Votes</h4>${rows || '<div class="kv">-</div>'}</div>
      <div class="info-card"><h4>Tally</h4>${tally || '<div class="kv">-</div>'}</div>
      <div class="info-card"><h4>Executed</h4><div class="kv">${executed}</div></div>
    </div>
  `;
}

function renderResolve(resolve, maps, day = {}) {
  const winners = (resolve?.winners || []).map(n => localizeName(n, maps)).join(', ') || '-';
  const executed = (resolve?.executed || []).map(n => localizeName(n, maps)).join(', ') || '-';

  const speakCounts = day?.player_stats || {};
  const targeted = {};
  for (const item of (day?.day_trace || [])) {
    if (item.type === 'speech' && item.target) targeted[item.target] = (targeted[item.target] || 0) + 1;
  }
  const mostActive = Object.entries(speakCounts).sort((a,b)=> (b[1].speak_count||0)-(a[1].speak_count||0))[0]?.[0] || '-';
  const mostTargeted = Object.entries(targeted).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';

  const finalRoles = Object.entries(resolve?.final_roles || {}).map(([name, payload]) => `
    <div class="info-card">
      <h4>${localizeName(name, maps)}</h4>
      <div class="kv">Initial: ${roleShort(payload.initial_role)}</div>
      <div class="kv">Final: ${roleShort(payload.current_role)}</div>
      <div class="kv">Team: ${t(payload.team)}</div>
    </div>
  `).join('');

  els.resolve.innerHTML = `
    <div class="card-grid">
      <div class="info-card">
        <h4>Outcome</h4>
        <div class="kv">${t(resolve?.outcome) || '-'}</div>
        <div class="kv">Winner: ${t(resolve?.winner_team) || '-'}</div>
        <div class="kv">Winners: ${winners}</div>
        <div class="kv">Executed: ${executed}</div>
        <div class="kv">Reason: ${resolve?.reason || '-'}</div>
      </div>
      <div class="info-card">
        <h4>Round Insights</h4>
        <div class="kv">Most Active Speaker: ${localizeName(mostActive, maps)}</div>
        <div class="kv">Most Targeted Player: ${localizeName(mostTargeted, maps)}</div>
        <div class="kv">Speech Turns: ${(day?.day_trace || []).filter(x => x.type === 'speech').length}</div>
        <div class="kv">Pass Turns: ${(day?.day_trace || []).filter(x => x.type === 'pass').length}</div>
      </div>
      ${finalRoles}
    </div>
  `;
}

function renderCurrentDetails() {
  if (!selectedPayload || !selected) return;

  const night = currentLang === 'en' && selectedPayload.night_en ? selectedPayload.night_en : selectedPayload.night;
  const day = currentLang === 'en' && selectedPayload.day_en ? selectedPayload.day_en : selectedPayload.day;
  const vote = currentLang === 'en' && selectedPayload.vote_en ? selectedPayload.vote_en : selectedPayload.vote;
  const resolve = currentLang === 'en' && selectedPayload.resolve_en ? selectedPayload.resolve_en : selectedPayload.resolve;
  const chat = currentLang === 'en' && selectedPayload.chat_en ? selectedPayload.chat_en : selectedPayload.chat;

  const maps = buildNameMaps(selectedPayload.night || night);

  els.meta.textContent = [
    `Game: ${selected.game_id}`,
    `Outcome: ${t(resolve?.outcome || selected.outcome) || 'unknown'}`,
    `Winner: ${t(resolve?.winner_team || selected.winner_team) || 'unknown'}`,
    `Executed: ${((resolve?.executed || selected.executed || []).map(n => localizeName(n, maps))).join(', ') || '-'}`,
    `Chat lines: ${selected.chat_lines ?? '-'}`,
    `Lang: ${currentLang === 'en' ? 'English' : '中文'}`,
  ].join(' | ');

  renderNight(night || {}, maps);
  renderChat(chat || '', maps);
  renderVote(vote || {}, maps);
  renderResolve(resolve || {}, maps, day || {});
}

async function showGame(game) {
  selected = game;
  document.querySelectorAll('.game-card').forEach(i => i.classList.toggle('active', i.dataset.id === game.game_id));

  const base = `./data/games/${game.game_id}`;
  const [night, day, vote, resolve, chat, nightEn, dayEn, voteEn, resolveEn, chatEn] = await Promise.all([
    loadJson(`${base}/night_result.json`).catch(() => ({})),
    loadJson(`${base}/day_result.json`).catch(() => ({})),
    loadJson(`${base}/vote_result.json`).catch(() => ({})),
    loadJson(`${base}/resolve_result.json`).catch(() => ({})),
    loadText(`${base}/chat_history.md`).catch(() => ''),
    loadJsonOptional(`${base}/night_result_en.json`),
    loadJsonOptional(`${base}/day_result_en.json`),
    loadJsonOptional(`${base}/vote_result_en.json`),
    loadJsonOptional(`${base}/resolve_result_en.json`),
    loadText(`${base}/chat_history_en.md`).catch(() => ''),
  ]);

  selectedPayload = {
    night, day, vote, resolve, chat,
    night_en: nightEn,
    day_en: dayEn,
    vote_en: voteEn,
    resolve_en: resolveEn,
    chat_en: chatEn,
  };

  els.empty.classList.add('hidden');
  els.details.classList.remove('hidden');
  renderCurrentDetails();
  setTab('chat');
  document.getElementById('detail-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderList(items) {
  els.list.innerHTML = '';
  if (!items.length) {
    els.list.innerHTML = '<div class="kv">No games found.</div>';
    return;
  }
  for (const g of items) {
    const isWolf = g.winner_team === 'werewolf_team';
    const isVillage = g.winner_team === 'village_team';
    const cardClass = isWolf ? 'win-werewolf' : isVillage ? 'win-village' : '';

    const card = document.createElement('div');
    card.className = `game-card ${cardClass}`.trim();
    card.dataset.id = g.game_id;
    card.innerHTML = `
      <div class="gid">${g.game_id}</div>
      <div class="gmeta">Outcome: ${t(g.outcome) || 'unknown'}</div>
      <div class="gmeta">Winner: ${t(g.winner_team) || 'unknown'}</div>
      <div class="gmeta">Executed: ${(g.executed || []).join(', ') || '-'}</div>
    `;
    card.addEventListener('click', () => showGame(g));
    els.list.appendChild(card);
  }
}

function applySearch() {
  const q = els.search.value.trim().toLowerCase();
  if (!q) return renderList(games);
  const filtered = games.filter(g =>
    g.game_id.toLowerCase().includes(q) ||
    String(g.outcome || '').toLowerCase().includes(q) ||
    String(g.winner_team || '').toLowerCase().includes(q)
  );
  renderList(filtered);
}

async function init() {
  const index = await loadJson('./data/index.json');
  games = index.games || [];

  els.lang.value = currentLang;
  els.lang.addEventListener('change', () => {
    currentLang = els.lang.value;
    localStorage.setItem('werewolf_lang', currentLang);
    applyStaticI18n();
    renderLatestSummary();
    renderList(games);
    renderCurrentDetails();
  });

  applyStaticI18n();
  renderLatestSummary();
  renderList(games);
  els.search.addEventListener('input', applySearch);

  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  if (games.length) showGame(games[0]);
}

init().catch(err => {
  console.error(err);
  if (els.list) els.list.innerHTML = `<div class="kv">Failed to load games: ${err.message}</div>`;
});
