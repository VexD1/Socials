const STARTER = [
  { id: '7172183875538488582', author: 'Guinness World Records', caption: 'The most viewed TikTok illusion' },
  { id: '6718335390845095173', author: 'Scout, Suki & Stella', caption: 'Scramble your name and I’ll try to guess it' },
  { id: '7401574939616218400', author: 'Gordon Ramsay', caption: 'Cooking with Uncle Roger' },
  { id: '7291353778534583584', author: 'Gordon Ramsay', caption: 'Air fryer reaction' },
  { id: '7105466470464851205', author: 'Gordon Ramsay', caption: 'Ramsay reacts' },
];

const $ = id => document.getElementById(id);
const player = $('player');
const viewer = $('viewer');
const menu = $('menu');
const menuActions = $('menu-actions');
const addForm = $('add-form');
const input = $('clip-url');
const buttons = [...menuActions.querySelectorAll('button')];
const STORAGE_KEY = 'socials-tiktok-saved-v1';
let saved = readSaved();
let source = 'starter';
let index = 0;
let playing = false;
let ready = false;
let failed = false;
let started = false;
let menuIndex = 0;
let flashTimer;
let touchStartY = null;

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

function clips() { return source === 'saved' ? saved : STARTER; }
function current() { return clips()[index]; }
function setStatus(message) { $('status').textContent = message; }

function flash(symbol) {
  const indicator = $('mid-indicator');
  indicator.textContent = symbol;
  indicator.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => indicator.classList.remove('show'), 650);
}

function send(type) {
  if (!ready || !player.contentWindow) return;
  player.contentWindow.postMessage({ type, value: null, 'x-tiktok-player': true }, 'https://www.tiktok.com');
}

function showClip() {
  const clip = current();
  if (!clip) { openMenu(); return; }
  ready = false;
  failed = false;
  playing = false;
  $('author').textContent = clip.author || 'TikTok creator';
  $('caption').textContent = clip.caption || 'Saved TikTok clip';
  $('counter').textContent = `${index + 1} / ${clips().length}`;
  setStatus('Loading clip…');
  player.src = `https://www.tiktok.com/player/v1/${encodeURIComponent(clip.id)}?controls=0&loop=1&autoplay=1&rel=0`;
  viewer.focus({ preventScroll: true });
}

function move(delta) {
  const list = clips();
  if (!list.length) { openMenu(); return; }
  index = (index + delta + list.length) % list.length;
  showClip();
}

function togglePlayback() {
  started = true;
  if (failed) { move(1); return; }
  if (!ready) { setStatus('Waiting for TikTok player…'); return; }
  if (playing) { send('pause'); playing = false; flash('Ⅱ'); setStatus('Paused'); }
  else { send('play'); send('unMute'); playing = true; flash('▶'); setStatus('Playing'); }
}

function toggleSave() {
  const clip = current();
  if (!clip) return;
  const existing = saved.findIndex(item => item.id === clip.id);
  if (existing < 0) { saved.unshift(clip); flash('♡'); setStatus('Saved clip'); }
  else { saved.splice(existing, 1); flash('−'); setStatus('Removed from saved'); }
  persistSaved();
  if (source === 'saved' && !saved.length) openMenu();
  else if (source === 'saved') { index = Math.min(index, saved.length - 1); showClip(); }
}

function openMenu() {
  send('pause');
  playing = false;
  menu.classList.remove('hidden');
  menu.setAttribute('aria-hidden', 'false');
  menuActions.classList.remove('hidden');
  addForm.classList.add('hidden');
  $('menu-message').textContent = '';
  menuIndex = 0;
  buttons[0].focus();
}

function closeMenu() {
  if (!current()) { $('menu-message').textContent = 'Add a clip to start watching.'; return; }
  menu.classList.add('hidden');
  menu.setAttribute('aria-hidden', 'true');
  viewer.focus();
  if (ready && started) { send('play'); playing = true; }
}

function action(name) {
  if (name === 'resume') closeMenu();
  else if (name === 'starter') { source = 'starter'; index = 0; closeMenu(); showClip(); }
  else if (name === 'saved') {
    if (!saved.length) { $('menu-message').textContent = 'No saved clips yet. Press right while watching to save one.'; return; }
    source = 'saved'; index = 0; closeMenu(); showClip();
  } else if (name === 'add') {
    menuActions.classList.add('hidden');
    addForm.classList.remove('hidden');
    $('menu-message').textContent = '';
    input.focus();
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
  closeMenu();
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
  if (event.origin !== 'https://www.tiktok.com' || event.source !== player.contentWindow) return;
  const message = event.data;
  if (!message || message['x-tiktok-player'] !== true) return;
  if (message.type === 'onPlayerReady') {
    ready = true;
    setStatus(started ? 'Playing' : 'Pinch to play with sound');
    if (started) { send('play'); send('unMute'); playing = true; }
  } else if (message.type === 'onStateChange') {
    if (message.value === 1) { playing = true; setStatus('Playing'); }
    if (message.value === 2) { playing = false; setStatus('Paused'); }
  } else if (message.type === 'onPlayerError' || message.type === 'onError') {
    ready = false;
    failed = true;
    setStatus('Clip unavailable. Down or pinch for the next one.');
  }
});

showClip();
