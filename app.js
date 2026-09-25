const FALLBACK = [
  { id: '7172183875538488582', author: 'Guinness World Records', caption: 'The most viewed TikTok illusion' },
  { id: '6718335390845095173', author: 'Scout, Suki & Stella', caption: 'Scramble your name and I’ll try to guess it' },
  { id: '7401574939616218400', author: 'Gordon Ramsay', caption: 'Cooking with Uncle Roger' },
  { id: '7291353778534583584', author: 'Gordon Ramsay', caption: 'Air fryer reaction' },
  { id: '7105466470464851205', author: 'Gordon Ramsay', caption: 'Ramsay reacts' },
];

const $ = id => document.getElementById(id);
const playerLayer = $('player-layer');
const viewer = $('viewer');
const menu = $('menu');
const menuActions = $('menu-actions');
const addForm = $('add-form');
const input = $('clip-url');
const buttons = [...menuActions.querySelectorAll('button')];
const STORAGE_KEY = 'socials-tiktok-saved-v1';
const LAST_CLIP_KEY = 'socials-tiktok-last-clip-v1';
const PROFILE_KEY = 'socials-tiktok-preferences-v1';
let saved = readSaved();
let profile = readProfile();
let catalog = FALLBACK;
let source = 'discover';
let index = 0;
let playing = false;
let ready = false;
let failed = false;
let started = false;
let menuIndex = 0;
let flashTimer;
let touchStartY = null;
let activeClip = null;
let watchSeconds = 0;
let clipDuration = 0;
let lastPlayerTime = null;
let hasTimeSamples = false;
let activeSlot = null;
let warmSlot = null;
let wantsPlayback = true;
let preparedIndex = -1;
let frontierIndex = 0;
let warmCooldownUntil = 0;
let warmTimeout = null;
let stallTimeout = null;
let sessionStalls = 0;
let lastStartSeconds = null;
let liveRefreshStarted = false;

function readProfile() {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (value && typeof value === 'object') {
      return {
        authors: value.authors && typeof value.authors === 'object' ? value.authors : {},
        views: value.views && typeof value.views === 'object' ? value.views : {},
      };
    }
  } catch { /* Start with no preferences. */ }
  return { authors: {}, views: {} };
}

function saveProfile() {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
  catch { /* Playback still works without stored preferences. */ }
}

function adjustAuthor(author, amount) {
  const previous = Number(profile.authors[author]) || 0;
  profile.authors[author] = Math.max(-4, Math.min(6, previous + amount));
  saveProfile();
}

function recordExperience() {
  if (!activeClip || !started || !hasTimeSamples || failed) return;
  const id = activeClip.id;
  const author = activeClip.author;
  const ratio = clipDuration > 0 ? watchSeconds / clipDuration : 0;
  if (ratio >= 0.7 || watchSeconds >= 20) adjustAuthor(author, 0.8);
  else if (clipDuration >= 8 && watchSeconds < 3) adjustAuthor(author, -0.35);
  const previousViews = Number(profile.views[id]) || 0;
  delete profile.views[id];
  profile.views[id] = previousViews + 1;
  const ids = Object.keys(profile.views);
  for (const oldId of ids.slice(0, Math.max(0, ids.length - 400))) delete profile.views[oldId];
  saveProfile();
  hasTimeSamples = false;
}

function considerNext() {
  if (source !== 'discover' || index >= catalog.length - 1) return;
  const previousAuthor = catalog[index]?.author;
  const penultimateAuthor = catalog[index - 1]?.author;
  let total = 0;
  let selected = index + 1;
  for (let i = index + 1; i < catalog.length; i++) {
    const clip = catalog[i];
    const interest = Math.max(-4, Math.min(6, Number(profile.authors[clip.author]) || 0));
    const seen = Math.max(0, Number(profile.views[clip.id]) || 0);
    const variety = clip.author === previousAuthor ? (clip.author === penultimateAuthor ? 0.08 : 0.3) : 1;
    const freshness = 0.6 + 0.4 * (1 - (i - index - 1) / (catalog.length - index));
    const weight = Math.exp(interest * 0.28) * variety * freshness / (1 + seen);
    total += weight;
    if (Math.random() * total < weight) selected = i;
  }
  [catalog[index + 1], catalog[selected]] = [catalog[selected], catalog[index + 1]];
}

function notePlayerTime(value) {
  if (!started || !ready || !playing || !value || typeof value.currentTime !== 'number') return false;
  const currentTime = value.currentTime;
  const duration = Number(value.duration);
  if (Number.isFinite(duration) && duration > 0) clipDuration = duration;
  if (lastPlayerTime !== null) {
    let elapsed = currentTime - lastPlayerTime;
    if (elapsed < 0 && clipDuration > 0 && lastPlayerTime > clipDuration - 3 && currentTime < 3) {
      elapsed = clipDuration - lastPlayerTime + currentTime;
    }
    if (elapsed > 0 && elapsed <= 3) {
      watchSeconds += elapsed;
      hasTimeSamples = true;
    }
    if (elapsed > 0) {
      lastPlayerTime = currentTime;
      return true;
    }
  }
  lastPlayerTime = currentTime;
  return false;
}

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value.filter(item => item && /^\d{15,22}$/.test(item.id)).slice(0, 100) : [];
  } catch { return []; }
}

function persistSaved() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }
  catch { setStatus('Could not save on this device'); }
}

function clips() { return source === 'saved' ? saved : catalog; }
function current() { return clips()[index]; }
function setStatus(message) { $('status').textContent = message; }

function flash(symbol) {
  const indicator = $('mid-indicator');
  indicator.textContent = symbol;
  indicator.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => indicator.classList.remove('show'), 650);
}

function createSlot(clip, preparing) {
  const frame = document.createElement('iframe');
  frame.className = `player-frame${preparing ? ' preparing' : ''}`;
  frame.title = preparing ? 'Preparing next TikTok clip' : 'TikTok video';
  frame.setAttribute('allow', 'autoplay; fullscreen');
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.tabIndex = -1;
  const slot = { frame, clipId: clip.id, ready: false, failed: false, state: -1, activatedAt: preparing ? null : performance.now(), firstProgress: false };
  playerLayer.append(frame);
  frame.src = `https://www.tiktok.com/player/v1/${encodeURIComponent(clip.id)}?controls=0&loop=1&autoplay=${preparing ? 0 : 1}&rel=0`;
  return slot;
}

function disposeSlot(slot) {
  if (slot) slot.frame.remove();
}

function postToSlot(slot, type) {
  if (!slot?.ready || !slot.frame.contentWindow) return;
  slot.frame.contentWindow.postMessage({ type, value: null, 'x-tiktok-player': true }, 'https://www.tiktok.com');
}

function send(type) { postToSlot(activeSlot, type); }

function cancelWarm(cooldown = false) {
  clearTimeout(warmTimeout);
  warmTimeout = null;
  if (warmSlot) { disposeSlot(warmSlot); warmSlot = null; }
  if (cooldown) warmCooldownUntil = performance.now() + 15000;
}

function prepareNext() {
  if (!activeSlot || !ready || !playing || !wantsPlayback || document.visibilityState !== 'visible') return;
  if (!menu.classList.contains('hidden') || performance.now() < warmCooldownUntil || clips().length < 2) return;
  if (index >= clips().length - 1) return;
  if (source === 'discover' && index === frontierIndex && preparedIndex !== index) {
    considerNext();
    preparedIndex = index;
  }
  const next = clips()[index + 1];
  if (warmSlot?.clipId === next.id) return;
  cancelWarm();
  warmSlot = createSlot(next, true);
  const pending = warmSlot;
  warmTimeout = setTimeout(() => {
    if (warmSlot === pending && !pending.ready) cancelWarm(true);
  }, 9000);
}

function scheduleStallCheck(slot) {
  clearTimeout(stallTimeout);
  if (!wantsPlayback || !playing) return;
  stallTimeout = setTimeout(() => {
    if (activeSlot !== slot || !wantsPlayback || !playing || document.visibilityState !== 'visible') return;
    sessionStalls++;
    setStatus('Buffering…');
    cancelWarm(true);
  }, 8000);
}

function showClip() {
  recordExperience();
  const clip = current();
  if (!clip) { openMenu(); return; }
  clearTimeout(stallTimeout);
  activeClip = clip;
  watchSeconds = 0;
  clipDuration = 0;
  lastPlayerTime = null;
  hasTimeSamples = false;
  const prepared = warmSlot?.clipId === clip.id ? warmSlot : null;
  if (prepared) {
    clearTimeout(warmTimeout);
    warmTimeout = null;
    warmSlot = null;
    disposeSlot(activeSlot);
    activeSlot = prepared;
    activeSlot.activatedAt = performance.now();
    activeSlot.frame.classList.remove('preparing');
    activeSlot.frame.title = 'TikTok video';
  } else {
    cancelWarm();
    disposeSlot(activeSlot);
    activeSlot = createSlot(clip, false);
  }
  ready = activeSlot.ready;
  failed = activeSlot.failed;
  playing = false;
  wantsPlayback = true;
  $('author').textContent = clip.author || 'TikTok creator';
  $('caption').textContent = clip.caption || 'Saved TikTok clip';
  $('counter').textContent = `${index + 1} / ${clips().length}`;
  if (source === 'discover') {
    try { localStorage.setItem(LAST_CLIP_KEY, clip.id); } catch { /* Playback still works without storage. */ }
  }
  setStatus(failed ? 'Clip unavailable. Down or pinch for the next one.' : prepared ? 'Opening prepared clip…' : 'Loading clip…');
  if (ready && !failed) { send('play'); if (started) send('unMute'); }
  viewer.focus({ preventScroll: true });
}

function move(delta) {
  const list = clips();
  if (!list.length) { openMenu(); return; }
  recordExperience();
  if (delta > 0 && source === 'discover' && index === frontierIndex && preparedIndex !== index) considerNext();
  const wrappedForward = delta > 0 && index === list.length - 1;
  index = (index + delta + list.length) % list.length;
  if (source === 'discover') frontierIndex = wrappedForward ? 0 : Math.max(frontierIndex, index);
  preparedIndex = -1;
  showClip();
}

function togglePlayback() {
  started = true;
  if (failed) { move(1); return; }
  if (!ready) { wantsPlayback = true; setStatus('Waiting for TikTok player…'); return; }
  if (wantsPlayback && (playing || activeSlot?.state === 3)) {
    wantsPlayback = false;
    send('pause');
    playing = false;
    clearTimeout(stallTimeout);
    cancelWarm();
    flash('Ⅱ');
    setStatus('Paused');
  } else {
    wantsPlayback = true;
    send('play');
    send('unMute');
    flash('▶');
    setStatus('Starting clip…');
  }
}

function toggleSave() {
  const clip = current();
  if (!clip) return;
  const existing = saved.findIndex(item => item.id === clip.id);
  if (existing < 0) { saved.unshift(clip); adjustAuthor(clip.author, 1); flash('♡'); setStatus('Saved clip'); }
  else { saved.splice(existing, 1); adjustAuthor(clip.author, -1); flash('−'); setStatus('Removed from saved'); }
  persistSaved();
  if (source === 'saved' && !saved.length) openMenu();
  else if (source === 'saved') { index = Math.min(index, saved.length - 1); showClip(); }
}

function openMenu() {
  wantsPlayback = false;
  send('pause');
  playing = false;
  clearTimeout(stallTimeout);
  cancelWarm();
  const watches = Object.values(profile.views).reduce((total, count) => total + (Number(count) || 0), 0);
  $('learning-status').textContent = watches ? `Learning from ${watches} watched clip${watches === 1 ? '' : 's'} on this device` : 'Watch or save clips to shape Discover';
  menu.classList.remove('hidden');
  menu.setAttribute('aria-hidden', 'false');
  menuActions.classList.remove('hidden');
  addForm.classList.add('hidden');
  $('menu-message').textContent = lastStartSeconds === null ? '' : `Last start ${lastStartSeconds.toFixed(1)}s · ${sessionStalls} stalls this session`;
  menuIndex = 0;
  buttons[0].focus();
}

function closeMenu(resume = true) {
  if (!current()) { $('menu-message').textContent = 'Add a clip to start watching.'; return; }
  menu.classList.add('hidden');
  menu.setAttribute('aria-hidden', 'true');
  viewer.focus();
  if (resume) {
    wantsPlayback = true;
    if (ready && !failed) { send('play'); if (started) send('unMute'); setStatus('Starting clip…'); }
  }
}

function action(name) {
  if (name === 'resume') closeMenu();
  else if (name === 'discover') { source = 'discover'; index = 0; frontierIndex = 0; preparedIndex = -1; closeMenu(false); showClip(); }
  else if (name === 'saved') {
    if (!saved.length) { $('menu-message').textContent = 'No saved clips yet. Press right while watching to save one.'; return; }
    source = 'saved'; index = 0; preparedIndex = -1; closeMenu(false); showClip();
  } else if (name === 'add') {
    menuActions.classList.add('hidden');
    addForm.classList.remove('hidden');
    $('menu-message').textContent = '';
    input.focus();
  } else if (name === 'reset') {
    profile = { authors: {}, views: {} };
    watchSeconds = 0;
    clipDuration = 0;
    lastPlayerTime = null;
    hasTimeSamples = false;
    saveProfile();
    $('learning-status').textContent = 'Watch or save clips to shape Discover';
    $('menu-message').textContent = 'Recommendations reset on this device. Saved clips remain.';
  }
}

function parseVideoId(value) {
  try {
    const url = new URL(value.trim());
    if (!['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'].includes(url.hostname)) return null;
    const match = url.pathname.match(/\/video\/(\d{15,22})(?:\/|$)/);
    return match ? match[1] : null;
  } catch { return null; }
}

menuActions.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button) action(button.dataset.action);
});

addForm.addEventListener('submit', event => {
  event.preventDefault();
  const id = parseVideoId(input.value);
  if (!id) { $('menu-message').textContent = 'Use a full TikTok link containing /video/ and its number.'; return; }
  if (!saved.some(item => item.id === id)) saved.unshift({ id, author: 'Added clip', caption: 'Your TikTok link' });
  persistSaved();
  source = 'saved';
  index = saved.findIndex(item => item.id === id);
  input.value = '';
  closeMenu(false);
  showClip();
});

$('cancel-add').addEventListener('click', () => {
  addForm.classList.add('hidden');
  menuActions.classList.remove('hidden');
  buttons[3].focus();
});

window.addEventListener('keydown', event => {
  const key = event.key;
  if (menu.classList.contains('hidden')) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) event.preventDefault();
    if (key === 'ArrowUp') move(-1);
    else if (key === 'ArrowDown') move(1);
    else if (key === 'ArrowLeft' || key === 'Escape' || key === 'Backspace') openMenu();
    else if (key === 'ArrowRight') toggleSave();
  } else if (!addForm.classList.contains('hidden')) {
    if (key === 'Escape') { event.preventDefault(); $('cancel-add').click(); }
  } else {
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      menuIndex = (menuIndex + (key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[menuIndex].focus();
    } else if (key === 'ArrowLeft' || key === 'Escape' || key === 'Backspace') { event.preventDefault(); closeMenu(); }
  }
});

viewer.addEventListener('click', () => togglePlayback());
viewer.addEventListener('touchstart', event => { touchStartY = event.changedTouches[0]?.clientY ?? null; }, { passive: true });
viewer.addEventListener('touchend', event => {
  if (touchStartY === null) return;
  const distance = (event.changedTouches[0]?.clientY ?? touchStartY) - touchStartY;
  touchStartY = null;
  if (Math.abs(distance) > 45) { event.preventDefault(); move(distance < 0 ? 1 : -1); }
}, { passive: false });

window.addEventListener('message', event => {
  if (event.origin !== 'https://www.tiktok.com') return;
  const slot = [activeSlot, warmSlot].find(item => item && event.source === item.frame.contentWindow);
  if (!slot) return;
  const message = event.data;
  if (!message || message['x-tiktok-player'] !== true) return;
  if (slot === warmSlot) {
    if (message.type === 'onPlayerReady') {
      slot.ready = true;
      clearTimeout(warmTimeout);
      warmTimeout = null;
      postToSlot(slot, 'pause');
    } else if (message.type === 'onStateChange' && message.value === 1) {
      postToSlot(slot, 'pause');
    } else if (message.type === 'onPlayerError' || message.type === 'onError') {
      slot.failed = true;
      cancelWarm(true);
    }
    return;
  }
  if (message.type === 'onPlayerReady') {
    slot.ready = true;
    ready = true;
    setStatus(wantsPlayback ? 'Starting clip…' : 'Pinch to play');
    if (wantsPlayback && document.visibilityState === 'visible') { send('play'); if (started) send('unMute'); }
  } else if (message.type === 'onStateChange') {
    const previousState = slot.state;
    slot.state = message.value;
    if (message.value === 1) {
      if (!wantsPlayback) { send('pause'); return; }
      playing = true;
      started = true;
      setStatus('Playing');
    } else if (message.value === 2) {
      playing = false;
      clearTimeout(stallTimeout);
      if (wantsPlayback && !slot.firstProgress) setStatus('Starting clip…');
      else { wantsPlayback = false; setStatus('Paused. Pinch to play'); }
    } else if (message.value === 3) {
      playing = false;
      clearTimeout(stallTimeout);
      if (slot.firstProgress && previousState !== 3) sessionStalls++;
      setStatus(slot.firstProgress ? 'Buffering…' : 'Starting clip…');
      cancelWarm(true);
    }
  } else if (message.type === 'onCurrentTime') {
    if (notePlayerTime(message.value)) {
      if (!slot.firstProgress) {
        slot.firstProgress = true;
        lastStartSeconds = (performance.now() - slot.activatedAt) / 1000;
      }
      if ($('status').textContent === 'Buffering…') setStatus('Playing');
      scheduleStallCheck(slot);
      if (watchSeconds >= 3) prepareNext();
      if (watchSeconds >= 20 && !liveRefreshStarted) {
        liveRefreshStarted = true;
        void refreshCatalog();
      }
    }
  } else if (message.type === 'onPlayerError' || message.type === 'onError') {
    const code = Number(message.value?.errorCode ?? message.value);
    if (code === 3002) {
      playing = false;
      wantsPlayback = false;
      setStatus('Pinch to start this clip');
    } else {
      slot.failed = true;
      failed = true;
      playing = false;
      clearTimeout(stallTimeout);
      cancelWarm(true);
      setStatus('Clip unavailable. Down or pinch for the next one.');
    }
  }
});

window.addEventListener('pagehide', () => {
  recordExperience();
  wantsPlayback = false;
  send('pause');
  clearTimeout(stallTimeout);
  cancelWarm();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    wantsPlayback = false;
    send('pause');
    clearTimeout(stallTimeout);
    cancelWarm();
  } else if (activeSlot && !failed) {
    setStatus('Pinch to resume');
  }
});

function validCatalog(data) {
  if (!data || !Array.isArray(data.clips)) return null;
  const seen = new Set();
  const result = [];
  for (const clip of data.clips) {
    if (!clip || !/^\d{15,22}$/.test(clip.id) || seen.has(clip.id)) continue;
    seen.add(clip.id);
    result.push({
      id: clip.id,
      author: String(clip.author || 'TikTok creator').slice(0, 80),
      caption: String(clip.caption || 'Public TikTok clip').slice(0, 160),
    });
  }
  return result.length >= 20 ? result : null;
}

async function fetchCatalog(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    return validCatalog(await response.json());
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function refreshCatalog() {
  const live = await fetchCatalog('https://raw.githubusercontent.com/VexD1/Socials/main/catalog.json');
  if (!live) return;
  const knownIds = new Set(catalog.map(clip => clip.id));
  if (!live.some(clip => !knownIds.has(clip.id))) return;
  if (source === 'discover') {
    const activeId = current()?.id;
    const nextIndex = live.findIndex(clip => clip.id === activeId);
    if (nextIndex < 0) live.push(current());
    catalog = live;
    index = nextIndex < 0 ? catalog.length - 1 : nextIndex;
    frontierIndex = index;
    preparedIndex = -1;
    cancelWarm();
    $('counter').textContent = `${index + 1} / ${catalog.length}`;
  } else catalog = live;
}

async function boot() {
  setStatus('Loading public clips…');
  const local = await fetchCatalog('./catalog.json');
  if (local) catalog = local;
  if (catalog.length > FALLBACK.length) {
    let lastId;
    try { lastId = localStorage.getItem(LAST_CLIP_KEY); } catch { /* Start at first clip. */ }
    const lastIndex = catalog.findIndex(clip => clip.id === lastId);
    index = lastIndex < 0 ? 0 : (lastIndex + 1) % catalog.length;
  }
  frontierIndex = index;
  showClip();
}

boot();
