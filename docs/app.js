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
  postgame: document.getElementById('tab-postgame'),
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

const fallbackNameZh = {
  Blaze: '譚仔大辣',
  SafetySam: '安全主任',
  'Dr. Pizza': 'PHD',
  Twister: '方唐鏡',
  EasyBake: '天真grill',
  ConspiBro: '白兵師兄',
};

const LABELS = {
  en: {
    werewolf_win:  'Werewolf Victory',
    village_win:   'Village Victory',
    tanner_win:    'Tanner Victory',
    werewolf_team: 'Werewolf',
    village_team:  'Village',
    tanner_team:   'Tanner',
    'Center Cards': 'Center Cards',
    'Center':       'Center',
    'Seat':         'Seat',
    'Initial':      'Initial',
    'Current':      'Current',
    'Memory':       'Memory',
    'Votes':        'Votes',
    'Tally':        'Tally',
    'Executed':     'Executed',
    'Outcome':      'Outcome',
    'Winners':      'Winners',
    'Reason':       'Reason',
    'Final':        'Final',
    'Team':         'Team',
    'Round Insights':       'Round Insights',
    'Most Active Speaker':  'Most Active Speaker',
    'Most Targeted Player': 'Most Targeted Player',
    'Speech Turns':         'Speech Turns',
    'Pass Turns':           'Pass Turns',
  },
  zh: {
    werewolf_win:   '狼人勝利',
    village_win:    '村民勝利',
    tanner_win:     '皮匠勝利',
    werewolf_team:  '狼人陣營',
    village_team:   '村民陣營',
    tanner_team:    '皮匠陣營',
    werewolf:       '狼人陣營',
    village:        '村民陣營',
    tanner:         '皮匠陣營',
    'Werewolf':     '狼人',
    'Minion':       '爪牙',
    'Seer':         '預言家',
    'Robber':       '強盜',
    'Troublemaker': '搗亂者',
    'Villager':     '村民',
    'Tanner':       '皮匠',
    'Center Cards': '中央牌',
    'Center':       '中央',
    'Seat':         '座位',
    'Initial':      '初始身份',
    'Current':      '現時身份',
    'Memory':       '夜晚記憶',
    'Votes':        '投票',
    'Tally':        '票數',
    'Executed':     '被處決',
    'Outcome':      '結果',
    'Winners':      '勝利者',
    'Reason':       '原因',
    'Final':        '最終身份',
    'Team':         '陣營',
    'Round Insights':       '回合數據',
    'Most Active Speaker':  '最活躍發言者',
    'Most Targeted Player': '最多被點名者',
    'Speech Turns':         '發言次數',
    'Pass Turns':           '跳過次數',
    'No werewolf was executed':    '沒有狼人被處決',
    'A werewolf was executed':     '有狼人被處決',
    'Tanner was executed':         '皮匠被處決',
    'Interview: Executed Players': '賽後訪問：被處決玩家',
    'Interview: Winners':          '賽後訪問：勝利者',
    'Interview: Losers':           '賽後訪問：落敗者',
    defiant:   '唔服氣',
    relieved:  '鬆一口氣',
    frustrated:'好唔爽',
    bitter:    '心有不甘',
    Role:      '角色',
    Mood:      '心情',
  },
};
function t(key) { return LABELS[currentLang]?.[key] ?? key; }

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n-en]').forEach(el => {
    el.textContent = currentLang === 'zh' ? el.dataset.i18nZh : el.dataset.i18nEn;
  });
}

function setTab(name) {
  document.querySelectorAll('.tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  els.night.classList.toggle('hidden', name !== 'night');
  els.chat.classList.toggle('hidden', name !== 'chat');
  els.vote.classList.toggle('hidden', name !== 'vote');
  els.postgame.classList.toggle('hidden', name !== 'postgame');
  els.resolve.classList.toggle('hidden', name !== 'resolve');
}

function roleShort(role = '') {
  return String(role).split(' (')[0] || role;
}

function roleColor(role) {
  const r = roleShort(role).toLowerCase();
  if (r === 'werewolf' || r === 'minion') return 'role-wolf';
  if (r === 'tanner') return 'role-tanner';
  return 'role-village';
}

function roleIcon(role) {
  const icons = { werewolf: '🐺', minion: '🗡', seer: '👁', robber: '🦝', troublemaker: '🌀', villager: '🏡', tanner: '⚙' };
  return icons[roleShort(role).toLowerCase()] || '?';
}

function teamClass(team) {
  if (team === 'werewolf_team' || team === 'werewolf') return 'team-wolf';
  if (team === 'tanner_team' || team === 'tanner') return 'team-tanner';
  return 'team-village';
}

function buildNameMaps(night) {
  const toLocal = new Map();
  const players = (night?.players) ? Object.values(night.players) : [];
  for (const p of players) {
    toLocal.set(p.name, currentLang === 'en' ? (p.name_en || p.name) : (p.name_zh || fallbackNameZh[p.name] || p.name));
  }
  if (currentLang === 'zh') {
    for (const [raw, zh] of Object.entries(fallbackNameZh)) {
      if (!toLocal.has(raw)) toLocal.set(raw, zh);
    }
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

function sceneTitle(i, total) {
  if (total <= 4) return ['Opening', 'Pressure', 'Counterplay', 'Final Push'][i] || `Scene ${i + 1}`;
  return ['Opening Claims', 'First Accusations', 'Counterattack', 'Vote Momentum'][i] || `Scene ${i + 1}`;
}

function summarizeScene(items, maps) {
  if (!items.length) return '-';
  const speakers = [...new Set(items.map(x => localizeName(x.speaker, maps)))];
  const targets = items.filter(x => x.target).map(x => localizeName(x.target, maps));
  const topTarget = Object.entries(targets.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topTarget) return `${speakers.slice(0, 3).join(', ')} drove pressure on ${topTarget}.`;
  return `${speakers.slice(0, 3).join(', ')} traded claims and positioning.`;
}

function renderLatestSummary() {
  if (!games.length) {
    els.latestSummary.textContent = 'No games yet.';
    return;
  }
  const g = games[0];
  const maps = buildNameMaps(selectedPayload?.night || selectedPayload?.night_en || {});
  const executed = ((g.executed || []).map(n => localizeName(n, maps))).join(', ') || '-';
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

  const centerChips = (night?.center_cards || []).map(c => {
    const rs = roleShort(c);
    return `<span class="role-chip ${roleColor(rs)}">${roleIcon(rs)} ${t(rs)}</span>`;
  }).join('');

  const cards = players.map(p => {
    const rawName = p.name;
    const name = localizeName(rawName, maps);
    const avatar = avatarPath[rawName] || './assets/avatars/blaze.svg';
    const initRole = roleShort(p.initial_role);
    const currRole = roleShort(p.current_role);
    const swapped = initRole !== currRole;
    const memory = p.night_memory_text || '';
    return `
      <div class="night-card">
        <img class="night-avatar" src="${avatar}" alt="${name}" />
        <div class="night-card-body">
          <div class="night-name">${name}</div>
          <div class="night-roles">
            <span class="role-chip ${roleColor(initRole)}${swapped ? ' role-dim' : ''}">${roleIcon(initRole)} ${t(initRole)}</span>
            ${swapped ? `<span class="swap-arrow">→</span><span class="role-chip ${roleColor(currRole)}">${roleIcon(currRole)} ${t(currRole)}</span>` : ''}
          </div>
          ${memory ? `<div class="night-memory">${memory}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  els.night.innerHTML = `
    <div class="night-center-row">
      <span class="night-section-label">${t('Center Cards')}</span>
      <div class="center-chips">${centerChips || '-'}</div>
    </div>
    <div class="night-players-grid">${cards}</div>
  `;
}

function chatItemsFromDayTrace(day) {
  const trace = day?.day_trace || [];
  return trace
    .filter(x => x.type === 'speech' && x.player_name && x.speech)
    .map((x, i) => ({
      when: x.log_line?.match(/^\[(.*?)\]/)?.[1] || `turn-${i + 1}`,
      speaker: x.player_name,
      target: x.target || null,
      speech: x.speech,
    }));
}

function renderChat(chatText, maps, day = {}) {
  let items = chatItemsFromDayTrace(day);
  if (!items.length) {
    items = parseChatLines(chatText);
  }
  if (!items.length) {
    els.chat.innerHTML = '<div class="kv">(no chat history)</div>';
    return;
  }

  const chunkSize = Math.max(3, Math.ceil(items.length / 4));
  const scenes = [];
  for (let i = 0; i < items.length; i += chunkSize) scenes.push(items.slice(i, i + chunkSize));

  const html = scenes.map((scene, idx) => {
    const summary = summarizeScene(scene, maps);
    const lines = scene.map(it => {
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

    return `
      <section class="scene-block">
        <div class="scene-head">
          <div class="scene-title">${sceneTitle(idx, scenes.length)}</div>
          <div class="scene-summary">${summary}</div>
        </div>
        <div class="chat-thread">${lines}</div>
      </section>
    `;
  }).join('');

  els.chat.innerHTML = html;
}

function renderVote(vote, maps) {
  const votesHtml = Object.entries(vote?.votes || {}).map(([from, to]) => {
    const avatar = avatarPath[from] || './assets/avatars/blaze.svg';
    return `
      <div class="vote-row">
        <img class="vote-avatar" src="${avatar}" alt="${from}" />
        <span class="vote-from">${localizeName(from, maps)}</span>
        <span class="vote-arrow">→</span>
        <span class="vote-to">${localizeName(to, maps)}</span>
      </div>
    `;
  }).join('');

  const tally = vote?.tally || {};
  const maxVotes = Math.max(...Object.values(tally), 1);
  const tallyHtml = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => {
      const pct = Math.round((n / maxVotes) * 100);
      const isExecuted = (vote?.executed || []).includes(name);
      return `
        <div class="tally-row">
          <span class="tally-name${isExecuted ? ' tally-executed' : ''}">${localizeName(name, maps)}</span>
          <div class="tally-bar-wrap">
            <div class="tally-bar${isExecuted ? ' tally-bar-executed' : ''}" style="width:${pct}%"></div>
          </div>
          <span class="tally-count">${n}</span>
        </div>
      `;
    }).join('');

  const executed = (vote?.executed || []).map(n => localizeName(n, maps));

  els.vote.innerHTML = `
    <div class="vote-layout">
      <div class="vote-section">
        <h4 class="vote-section-head">${t('Votes')}</h4>
        <div class="vote-list">${votesHtml || '<div class="kv">-</div>'}</div>
      </div>
      <div class="vote-section">
        <h4 class="vote-section-head">${t('Tally')}</h4>
        <div class="tally-chart">${tallyHtml || '<div class="kv">-</div>'}</div>
        ${executed.length ? `<div class="executed-banner">⚔ ${t('Executed')}: ${executed.join(', ')}</div>` : ''}
      </div>
    </div>
  `;
}

function renderPostgame(postgame, maps) {
  const itv = postgame?.interviews || {};

  const moodMap = {
    en: { defiant: 'defiant', relieved: 'relieved', frustrated: 'frustrated', bitter: 'bitter' },
    zh: { defiant: '不服輸', relieved: '鬆一口氣', frustrated: '挫敗', bitter: '苦澀' },
  };
  const m = moodMap[currentLang] || moodMap.en;
  const moodText = (x) => m[x] || x || '-';

  function section(titleEn, titleZh, rows, emoji) {
    if (!rows || !rows.length) return '';
    const title = currentLang === 'zh' ? titleZh : titleEn;

    const cards = rows.map(r => {
      const name = currentLang === 'en' ? (r.player_name_en || r.player_name) : (r.player_name_zh || r.player_name);
      const avatar = avatarPath[r.player_name] || './assets/avatars/blaze.svg';
      const role = t(roleShort(r.role || ''));
      const team = t(r.team || '-');
      const quote = currentLang === 'zh' ? localizeTextByNameMap(r.quote || '', maps) : (r.quote || '');
      return `
        <div class="postgame-card">
          <img class="postgame-avatar" src="${avatar}" alt="${name}" />
          <div class="postgame-body">
            <div class="postgame-name">${emoji} ${name}</div>
            <div class="postgame-meta">${t('Role')}: ${role} · ${t('Team')}: ${team} · ${t('Mood')}: ${moodText(r.mood)}</div>
            <div class="postgame-quote">${quote}</div>
          </div>
        </div>
      `;
    }).join('');
    return `<div class="postgame-block"><h3>${title}</h3>${cards}</div>`;
  }

  els.postgame.innerHTML = `
    ${section('Interview: Executed Players', '賽後訪問：被處決玩家', itv.dead, '💀')}
    ${section('Interview: Winners', '賽後訪問：勝方', itv.winners, '🏆')}
    ${section('Interview: Losers', '賽後訪問：敗方', itv.losers, '🥀')}
  ` || '<div class="kv">(no postgame interviews)</div>';
}

function renderResolve(resolve, maps, day = {}) {
  const outcome = resolve?.outcome;
  const winners = resolve?.winners || [];
  const executed = resolve?.executed || [];
  const winnerNames = winners.map(n => localizeName(n, maps));
  const executedNames = executed.map(n => localizeName(n, maps));

  const bannerClass = outcome === 'werewolf_win' ? 'outcome-wolf' : outcome === 'tanner_win' ? 'outcome-tanner' : 'outcome-village';
  const outcomeIcon = outcome === 'werewolf_win' ? '🐺' : outcome === 'tanner_win' ? '⚙' : '🏡';

  const speakCounts = day?.player_stats || {};
  const targeted = {};
  for (const item of (day?.day_trace || [])) {
    if (item.type === 'speech' && item.target) targeted[item.target] = (targeted[item.target] || 0) + 1;
  }
  const mostActive = Object.entries(speakCounts).sort((a, b) => (b[1].speak_count || 0) - (a[1].speak_count || 0))[0]?.[0] || '-';
  const mostTargeted = Object.entries(targeted).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const speechTurns = (day?.day_trace || []).filter(x => x.type === 'speech').length;
  const passTurns = (day?.day_trace || []).filter(x => x.type === 'pass').length;

  const finalRoles = Object.entries(resolve?.final_roles || {}).map(([name, payload]) => {
    const avatar = avatarPath[name] || './assets/avatars/blaze.svg';
    const localName = localizeName(name, maps);
    const initRole = roleShort(payload.initial_role);
    const currRole = roleShort(payload.current_role);
    const swapped = initRole !== currRole;
    const isWinner = winners.includes(name);
    const isExecuted = executed.includes(name);
    const tc = teamClass(payload.team);
    return `
      <div class="reveal-player-card ${tc}${isWinner ? ' reveal-winner' : ''}${isExecuted ? ' reveal-executed' : ''}">
        ${isWinner ? '<div class="winner-crown">👑</div>' : ''}
        ${isExecuted ? '<div class="executed-mark">⚔</div>' : ''}
        <img class="reveal-avatar" src="${avatar}" alt="${localName}" />
        <div class="reveal-name">${localName}</div>
        <div class="reveal-roles">
          ${swapped
            ? `<span class="role-chip ${roleColor(initRole)} role-dim">${t(initRole)}</span><span class="swap-arrow">→</span><span class="role-chip ${roleColor(currRole)}">${t(currRole)}</span>`
            : `<span class="role-chip ${roleColor(currRole)}">${t(currRole)}</span>`
          }
        </div>
        <div class="reveal-team ${tc}-label">${t(payload.team)}</div>
      </div>
    `;
  }).join('');

  els.resolve.innerHTML = `
    <div class="outcome-banner ${bannerClass}">
      <span class="outcome-icon">${outcomeIcon}</span>
      <div class="outcome-main">
        <div class="outcome-text">${t(outcome) || '-'}</div>
        <div class="outcome-detail">${t('Winners')}: ${winnerNames.join(', ')} · ${t('Executed')}: ${executedNames.join(', ') || '-'}</div>
        ${resolve?.reason ? `<div class="outcome-reason">${t(resolve.reason)}</div>` : ''}
      </div>
    </div>
    <div class="reveal-grid">${finalRoles}</div>
    <div class="stats-row">
      <div class="stat-chip"><span class="stat-label">${t('Most Active Speaker')}</span><span class="stat-val">${localizeName(mostActive, maps)}</span></div>
      <div class="stat-chip"><span class="stat-label">${t('Most Targeted Player')}</span><span class="stat-val">${localizeName(mostTargeted, maps)}</span></div>
      <div class="stat-chip"><span class="stat-label">${t('Speech Turns')}</span><span class="stat-val">${speechTurns}</span></div>
      <div class="stat-chip"><span class="stat-label">${t('Pass Turns')}</span><span class="stat-val">${passTurns}</span></div>
    </div>
  `;
}

function renderCurrentDetails() {
  if (!selectedPayload || !selected) return;

  const night = currentLang === 'en' && selectedPayload.night_en ? selectedPayload.night_en : selectedPayload.night;
  const day = currentLang === 'en' && selectedPayload.day_en ? selectedPayload.day_en : selectedPayload.day;
  const vote = currentLang === 'en' && selectedPayload.vote_en ? selectedPayload.vote_en : selectedPayload.vote;
  const postgame = currentLang === 'en' && selectedPayload.postgame_en ? selectedPayload.postgame_en : selectedPayload.postgame;
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
  renderChat(chat || '', maps, day || {});
  renderVote(vote || {}, maps);
  renderPostgame(postgame || {}, maps);
  renderResolve(resolve || {}, maps, day || {});
}

async function showGame(game) {
  selected = game;
  document.querySelectorAll('.game-card').forEach(i => i.classList.toggle('active', i.dataset.id === game.game_id));

  const base = `./data/games/${game.game_id}`;
  const [night, day, vote, postgame, resolve, chat, nightEn, dayEn, voteEn, postgameEn, resolveEn, chatEn] = await Promise.all([
    loadJson(`${base}/night_result.json`).catch(() => ({})),
    loadJson(`${base}/day_result.json`).catch(() => ({})),
    loadJson(`${base}/vote_result.json`).catch(() => ({})),
    loadJsonOptional(`${base}/postgame_result.json`),
    loadJson(`${base}/resolve_result.json`).catch(() => ({})),
    loadText(`${base}/chat_history.md`).catch(() => ''),
    loadJsonOptional(`${base}/night_result_en.json`),
    loadJsonOptional(`${base}/day_result_en.json`),
    loadJsonOptional(`${base}/vote_result_en.json`),
    loadJsonOptional(`${base}/postgame_result_en.json`),
    loadJsonOptional(`${base}/resolve_result_en.json`),
    loadText(`${base}/chat_history_en.md`).catch(() => ''),
  ]);

  selectedPayload = {
    night, day, vote, postgame, resolve, chat,
    night_en: nightEn,
    day_en: dayEn,
    vote_en: voteEn,
    postgame_en: postgameEn,
    resolve_en: resolveEn,
    chat_en: chatEn,
  };

  els.empty.classList.add('hidden');
  els.details.classList.remove('hidden');
  renderCurrentDetails();
  setTab('chat');
  els.details.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function outcomeTagline(g) {
  if (currentLang === 'zh') {
    if (g.winner_team === 'werewolf_team') return '🐺 狼人大勝';
    if (g.winner_team === 'village_team') return '🏘️ 村民倖存';
    if (g.winner_team === 'tanner') return '⚙️ 皮匠反勝';
    return '❔ 結局未明';
  }
  if (g.winner_team === 'werewolf_team') return '🐺 Werewolves Prevail';
  if (g.winner_team === 'village_team') return '🏘️ Village Survives';
  if (g.winner_team === 'tanner') return '⚙️ Tanner Steals It';
  return '❔ Outcome Unknown';
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
    const banner = isWolf ? './assets/banner-redmoon.png' : isVillage ? './assets/bg-enchanted-forest.png' : './assets/banner-tanner.png';

    const card = document.createElement('div');
    card.className = `game-card ${cardClass}`.trim();
    card.dataset.id = g.game_id;
    card.innerHTML = `
      <div class="game-thumb" style="background-image:url('${banner}')"></div>
      <div class="game-card-body">
        <div class="gid">${g.game_id}</div>
        <div class="tagline">${outcomeTagline(g)}</div>
        <div class="gmeta">${t('Executed')}: ${((g.executed || []).map(n => localizeName(n, buildNameMaps((selectedPayload?.night || selectedPayload?.night_en || {})))).join(', ') || '-')}</div>
      </div>
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

  document.querySelectorAll('.tabs button').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  if (games.length) showGame(games[0]);
}

init().catch(err => {
  console.error(err);
  if (els.list) els.list.innerHTML = `<div class="kv">Failed to load games: ${err.message}</div>`;
});
