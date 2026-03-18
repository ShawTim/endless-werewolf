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
  if (!r.ok) return "";
  return r.text();
}

const els = {
  list: document.getElementById('game-list'),
  search: document.getElementById('search'),
  empty: document.getElementById('empty'),
  details: document.getElementById('details'),
  meta: document.getElementById('meta'),
  night: document.getElementById('tab-night'),
  chat: document.getElementById('tab-chat'),
  vote: document.getElementById('tab-vote'),
  resolve: document.getElementById('tab-resolve'),
  lang: document.getElementById('lang-select'),
};

let games = [];
let selected = null;
let selectedPayload = null;
let currentLang = localStorage.getItem('werewolf_lang') || 'zh';

function setTab(name) {
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  els.night.classList.toggle('hidden', name !== 'night');
  els.chat.classList.toggle('hidden', name !== 'chat');
  els.vote.classList.toggle('hidden', name !== 'vote');
  els.resolve.classList.toggle('hidden', name !== 'resolve');
}

function buildNameMap(night) {
  const map = new Map();
  const players = (night && night.players) ? Object.values(night.players) : [];
  for (const p of players) {
    const zh = p.name_zh || p.name || '';
    const en = p.name_en || p.name || '';
    map.set(p.name, currentLang === 'en' ? en : zh);
  }
  return map;
}

function localizeTextByNameMap(text, nameMap) {
  let out = text || '';
  for (const [raw, local] of nameMap.entries()) {
    const safe = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${safe}\\b`, 'g'), local);
  }
  return out;
}

function renderCurrentDetails() {
  if (!selectedPayload || !selected) return;

  const night = currentLang === 'en' && selectedPayload.night_en ? selectedPayload.night_en : selectedPayload.night;
  const vote = currentLang === 'en' && selectedPayload.vote_en ? selectedPayload.vote_en : selectedPayload.vote;
  const resolve = currentLang === 'en' && selectedPayload.resolve_en ? selectedPayload.resolve_en : selectedPayload.resolve;
  const chat = currentLang === 'en' && selectedPayload.chat_en ? selectedPayload.chat_en : selectedPayload.chat;

  const nameMap = buildNameMap(selectedPayload.night || night);

  els.meta.textContent = [
    `Game: ${selected.game_id}`,
    `Outcome: ${resolve.outcome || selected.outcome || 'unknown'}`,
    `Winner: ${resolve.winner_team || selected.winner_team || 'unknown'}`,
    `Executed: ${((resolve.executed || selected.executed || []).map(n => nameMap.get(n) || n)).join(', ') || '-'}`,
    `Chat lines: ${selected.chat_lines ?? '-'}`,
    `Lang: ${currentLang === 'en' ? 'English' : '中文'}`,
  ].join(' | ');

  if (currentLang === 'en' && selectedPayload.night_en) {
    els.night.textContent = JSON.stringify(night, null, 2);
    els.vote.textContent = JSON.stringify(vote, null, 2);
    els.resolve.textContent = JSON.stringify(resolve, null, 2);
    els.chat.textContent = chat || '(no chat history)';
  } else {
    els.night.textContent = localizeTextByNameMap(JSON.stringify(night, null, 2), nameMap);
    els.vote.textContent = localizeTextByNameMap(JSON.stringify(vote, null, 2), nameMap);
    els.resolve.textContent = localizeTextByNameMap(JSON.stringify(resolve, null, 2), nameMap);
    els.chat.textContent = localizeTextByNameMap(chat || '(no chat history)', nameMap);
  }
}

async function showGame(game) {
  selected = game;
  document.querySelectorAll('.game-item').forEach(i => i.classList.toggle('active', i.dataset.id === game.game_id));

  const base = `./data/games/${game.game_id}`;
  const [night, vote, resolve, chat, nightEn, voteEn, resolveEn, chatEn] = await Promise.all([
    loadJson(`${base}/night_result.json`).catch(() => ({})),
    loadJson(`${base}/vote_result.json`).catch(() => ({})),
    loadJson(`${base}/resolve_result.json`).catch(() => ({})),
    loadText(`${base}/chat_history.md`).catch(() => ""),
    loadJsonOptional(`${base}/night_result_en.json`),
    loadJsonOptional(`${base}/vote_result_en.json`),
    loadJsonOptional(`${base}/resolve_result_en.json`),
    loadText(`${base}/chat_history_en.md`).catch(() => ""),
  ]);

  selectedPayload = {
    night,
    vote,
    resolve,
    chat,
    night_en: nightEn,
    vote_en: voteEn,
    resolve_en: resolveEn,
    chat_en: chatEn,
  };

  els.empty.classList.add('hidden');
  els.details.classList.remove('hidden');
  renderCurrentDetails();
  setTab('night');
}

function renderList(items) {
  els.list.innerHTML = '';
  for (const g of items) {
    const li = document.createElement('li');
    li.className = 'game-item';
    li.dataset.id = g.game_id;
    li.innerHTML = `
      <div class="id">${g.game_id}</div>
      <div class="meta">${g.outcome || 'unknown'} · ${(g.executed || []).join(', ') || '-'}</div>
    `;
    li.addEventListener('click', () => showGame(g));
    els.list.appendChild(li);
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
    renderCurrentDetails();
  });

  renderList(games);
  els.search.addEventListener('input', applySearch);

  const tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

  if (games.length) showGame(games[0]);
}

init().catch(err => {
  els.empty.textContent = `Failed to load archive: ${err.message}`;
  console.error(err);
});
