async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}`);
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
};

let games = [];
let selected = null;

function setTab(name) {
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  els.night.classList.toggle('hidden', name !== 'night');
  els.chat.classList.toggle('hidden', name !== 'chat');
  els.vote.classList.toggle('hidden', name !== 'vote');
  els.resolve.classList.toggle('hidden', name !== 'resolve');
}

async function showGame(game) {
  selected = game;
  document.querySelectorAll('.game-item').forEach(i => i.classList.toggle('active', i.dataset.id === game.game_id));

  const base = `./data/games/${game.game_id}`;
  const [night, vote, resolve, chat] = await Promise.all([
    loadJson(`${base}/night_result.json`).catch(() => ({})),
    loadJson(`${base}/vote_result.json`).catch(() => ({})),
    loadJson(`${base}/resolve_result.json`).catch(() => ({})),
    loadText(`${base}/chat_history.md`).catch(() => ""),
  ]);

  els.empty.classList.add('hidden');
  els.details.classList.remove('hidden');

  els.meta.textContent = [
    `Game: ${game.game_id}`,
    `Outcome: ${resolve.outcome || game.outcome || 'unknown'}`,
    `Winner: ${resolve.winner_team || game.winner_team || 'unknown'}`,
    `Executed: ${(resolve.executed || game.executed || []).join(', ') || '-'}`,
    `Chat lines: ${game.chat_lines ?? '-'}`,
  ].join(' | ');

  els.night.textContent = JSON.stringify(night, null, 2);
  els.chat.textContent = chat || '(no chat history)';
  els.vote.textContent = JSON.stringify(vote, null, 2);
  els.resolve.textContent = JSON.stringify(resolve, null, 2);

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
