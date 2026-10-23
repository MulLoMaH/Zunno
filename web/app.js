/* =============================================================
ZUNNO · Premium SPA
Glassmorphism / Neumorphism / Rose edition
============================================================= */
'use strict';

const API = '/api/v1';
const THEMES = ['dark', 'light', 'rose'];
const THEME_META = {
  dark: { label: 'Тёмная', icon: 'moon', color: '#070912' },
  light: { label: 'Светлая', icon: 'sun', color: '#eef2f8' },
  rose: { label: 'Розовая', icon: 'palette', color: '#fff1f5' },
};

const state = {
  token: localStorage.getItem('access_token') || '',
  user: null,
  groups: [],
  invitations: [],
  activeGroupId: localStorage.getItem('active_group') || null,
  view: 'dashboard',
  txTypes: {},
  dismissedInvites: new Set(),
};

try { state.txTypes = JSON.parse(localStorage.getItem('zunno-tx-types') || '{}') || {}; } catch { state.txTypes = {}; }
try { state.dismissedInvites = new Set(JSON.parse(localStorage.getItem('zunno-dismissed-invites') || '[]')); } catch { state.dismissedInvites = new Set(); }

const ui = {
  modalPrevFocus: null,
  popover: null,
  tooltipEl: null,
  fabOpen: false,
  command: { open: false, filtered: [], selected: 0 },
  tour: null,
};

let viewAnimators = [];
let ringCounter = 0;
let calendarState = {
  view: 'list',
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
};

/* =============================================================
DOM HELPERS
============================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function appendContent(parent, content) {
  if (content == null || content === false) return;
  if (Array.isArray(content)) { content.forEach((child) => appendContent(parent, child)); return; }
  if (content instanceof Node) { parent.appendChild(content); return; }
  parent.appendChild(document.createTextNode(String(content)));
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  appendContent(node, children);
  return node;
}

function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  appendContent(node, children);
  return node;
}

function stagger(node, index) {
  if (!node) return node;
  node.style.animationDelay = `${Math.min(index, 18) * 42}ms`;
  return node;
}

function staggerChildren(container) {
  Array.from(container.children).forEach((node, index) => stagger(node, index));
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function clamp(value, min, max) {
  if (max < min) max = min;
  return Math.min(Math.max(value, min), max);
}

function animateLater(fn) { viewAnimators.push(fn); }

function flushAnimators() {
  const animators = viewAnimators;
  viewAnimators = [];
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animators.forEach((fn) => { try { fn(); } catch {} });
    });
  });
}

/* =============================================================
ICONS
============================================================= */
const ICONS = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  panelLeft: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h2"/><path d="M3 9h18"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  calendarPlus: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M12 13v6M9 16h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M19 21v-1a5 5 0 0 0-3-4.58"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  palette: '<path d="M12 22a10 10 0 1 1 0-20 8 8 0 0 1 0 16h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  drag: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  invite: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  sparkles: '<path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/>',
  trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  arrowUpCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 16V8M8 12l4-4 4 4"/>',
  arrowDownCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12l4 4 4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.5 12.5 8-8"/><path d="m16 6 3 3"/><path d="m19 3 2 2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/><path d="M16 21h5v-5"/><path d="M8 21H3v-5"/><path d="M21 21l-7-7"/><path d="M3 21l7-7"/>',
  coins: '<circle cx="8" cy="8" r="5"/><circle cx="16" cy="16" r="5"/><path d="M12 12h.01"/>',
};

function icon(name, size = 20) {
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.8',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.innerHTML = ICONS[name] || ICONS.info;
  return svg;
}

function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach((node) => {
    if (node.dataset.hydrated === '1') return;
    const name = node.dataset.icon;
    const size = node.dataset.size === 'sm' ? 18 : node.dataset.size === 'lg' ? 24 : 20;
    node.innerHTML = '';
    node.appendChild(icon(name, size));
    node.dataset.hydrated = '1';
  });
}

/* =============================================================
FORMATTERS
============================================================= */
const CURRENCY_SYMBOLS = { RUB: '₽', USD: '$', EUR: '€', KZT: '₸', BYN: 'Br', UAH: '₴' };

function currencySymbol(code = state.user?.currency || 'RUB') {
  const upper = String(code || 'RUB').toUpperCase();
  return CURRENCY_SYMBOLS[upper] || upper;
}

function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  const code = String(state.user?.currency || 'RUB').toUpperCase();
  const symbol = currencySymbol(code);
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(num);
  } catch {
    const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(num);
    return `${symbol}${formatted}`;
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });
    const diffSec = (d - Date.now()) / 1000;
    const abs = Math.abs(diffSec);
    if (abs < 60) return 'сейчас';
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
    if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), 'day');
    if (abs < 2592000) return rtf.format(Math.round(diffSec / 604800), 'week');
    if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
    return rtf.format(Math.round(diffSec / 31536000), 'year');
  } catch {
    return fmtDate(iso);
  }
}

function initials(name) {
  if (!name) return '?';
  return String(name).trim().split(/\s+/).slice(0, 2).map((w) => (w[0] || '').toUpperCase()).join('') || '?';
}

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || 'друг';
}

function shortId(id) {
  return id ? String(id).slice(0, 8) : '—';
}

function colorFromId(id) {
  if (!id) return 'hsl(250, 60%, 60%)';
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 58%, 58%)`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateToEndISO(value) {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function plural(n, one, few, many) {
  const num = Number(n) || 0;
  const m10 = num % 10;
  const m100 = num % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function formatMonthLabel(value) {
  const raw = String(value || '');
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
  return raw;
}

function monthSortValue(value) {
  const raw = String(value || '');
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (match) return Number(match[1]) * 100 + Number(match[2]);
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.getFullYear() * 100 + d.getMonth();
  return 0;
}

function setBusy(busy) {
  const preloader = $('#preloader');
  if (preloader) preloader.classList.toggle('hide', !busy);
}

/* =============================================================
THEME
============================================================= */
function getPreferredTheme() {
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyTheme(theme) {
  const safeTheme = THEMES.includes(theme) ? theme : 'dark';
  const root = document.documentElement;
  root.dataset.theme = safeTheme;
  localStorage.setItem('zunno-theme', safeTheme);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_META[safeTheme].color);
  $$('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-label', `Текущая тема: ${THEME_META[safeTheme].label}. Нажми, чтобы сменить.`);
    btn.setAttribute('data-tip', `Тема: ${THEME_META[safeTheme].label}`);
  });
  $$('[data-theme-icon]').forEach((slot) => {
    slot.innerHTML = '';
    slot.appendChild(icon(THEME_META[safeTheme].icon));
  });
}

function cycleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  const idx = THEMES.indexOf(current);
  applyTheme(THEMES[(idx + 1) % THEMES.length]);
  toast(`Тема: ${THEME_META[document.documentElement.dataset.theme].label}`, 'info', 1500);
}

/* =============================================================
TOASTS
============================================================= */
function toast(message, type = 'info', timeout = 3600) {
  const root = $('#toasts');
  if (!root) return;
  const icons = { success: 'check', error: 'x', warning: 'alert', info: 'info' };
  const node = el('div', { class: `toast toast-${type}`, role: type === 'error' ? 'alert' : 'status' }, [
    el('div', { class: 'toast-ico' }, [icon(icons[type] || icons.info, 16)]),
    el('div', { class: 'toast-msg' }, [String(message)]),
  ]);
  root.appendChild(node);
  while (root.children.length > 4) root.firstElementChild?.remove();
  setTimeout(() => {
    node.classList.add('hide');
    setTimeout(() => node.remove(), 240);
  }, timeout);
}

/* =============================================================
TOOLTIP
============================================================= */
function initTooltip() {
  let hideTimer;
  function ensureTooltip() {
    if (ui.tooltipEl) return ui.tooltipEl;
    ui.tooltipEl = el('div', { class: 'app-tooltip', role: 'tooltip' });
    $('#tooltip-root').appendChild(ui.tooltipEl);
    return ui.tooltipEl;
  }
  function position(target) {
    const tip = ensureTooltip();
    const r = target.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10;
    let top = r.bottom + gap;
    if (top + tr.height > vh - 12) top = r.top - tr.height - gap;
    const maxTop = Math.max(12, vh - tr.height - 12);
    top = clamp(top, 12, maxTop);
    let left = r.left + r.width / 2 - tr.width / 2;
    const maxLeft = Math.max(12, vw - tr.width - 12);
    left = clamp(left, 12, maxLeft);
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }
  function show(target) {
    const text = target.getAttribute('data-tip');
    if (!text) return;
    clearTimeout(hideTimer);
    const tip = ensureTooltip();
    tip.textContent = text;
    tip.classList.add('visible');
    requestAnimationFrame(() => position(target));
  }
  function hide() {
    if (!ui.tooltipEl) return;
    ui.tooltipEl.classList.remove('visible');
  }
  document.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-tip]'); if (t) show(t); });
  document.addEventListener('mouseout', (e) => { const t = e.target.closest('[data-tip]'); if (t) hide(); });
  document.addEventListener('focusin', (e) => { const t = e.target.closest('[data-tip]'); if (t) show(t); });
  document.addEventListener('focusout', () => hide());
  let touchTimer;
  document.addEventListener('touchstart', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) return;
    touchTimer = setTimeout(() => show(t), 400);
  }, { passive: true });
  document.addEventListener('touchend', () => { clearTimeout(touchTimer); hide(); });
  document.addEventListener('touchmove', () => { clearTimeout(touchTimer); hide(); });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}

/* =============================================================
POPOVER
============================================================= */
function openPopover(anchor, content, opts = {}) {
  closePopover();
  const panel = el('div', { class: 'popover', role: 'dialog', 'aria-modal': 'false' });
  panel.appendChild(el('div', { class: 'popover-arrow' }));
  appendContent(panel, content);
  $('#popover-root').appendChild(panel);
  hydrateIcons(panel);
  ui.popover = { anchor, panel, opts };
  requestAnimationFrame(() => {
    positionPopover(anchor, panel, opts);
    panel.classList.add('open');
  });
  setTimeout(() => {
    document.addEventListener('pointerdown', onPopoverPointer, true);
    window.addEventListener('resize', onPopoverReposition);
    window.addEventListener('scroll', onPopoverScroll, true);
  }, 0);
}

function positionPopover(anchor, panel, opts = {}) {
  const a = anchor.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const gap = 10;
  let top = a.bottom + gap;
  if (top + p.height > window.innerHeight - 12) top = a.top - p.height - gap;
  const maxTop = Math.max(12, window.innerHeight - p.height - 12);
  top = clamp(top, 12, maxTop);
  let left = a.left + a.width / 2 - p.width / 2;
  const maxLeft = Math.max(12, window.innerWidth - p.width - 12);
  left = clamp(left, 12, maxLeft);
  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
  const arrow = panel.querySelector('.popover-arrow');
  if (arrow) {
    const arrowLeft = clamp(a.left + a.width / 2 - left, 18, p.width - 18);
    arrow.style.left = `${arrowLeft}px`;
    arrow.classList.toggle('above', top < a.top);
  }
}

function closePopover() {
  if (!ui.popover) return;
  const { panel } = ui.popover;
  ui.popover = null;
  panel.classList.remove('open');
  setTimeout(() => panel.remove(), 170);
  document.removeEventListener('pointerdown', onPopoverPointer, true);
  window.removeEventListener('resize', onPopoverReposition);
  window.removeEventListener('scroll', onPopoverScroll, true);
}

function onPopoverPointer(e) {
  if (!ui.popover) return;
  if (ui.popover.panel.contains(e.target) || ui.popover.anchor.contains(e.target)) return;
  closePopover();
}
function onPopoverReposition() {
  if (!ui.popover) return;
  positionPopover(ui.popover.anchor, ui.popover.panel, ui.popover.opts);
}
function onPopoverScroll(e) {
  if (!ui.popover) return;
  if (ui.popover.panel.contains(e.target)) return;
  closePopover();
}

function popoverHeader(title, subtitle = '') {
  return el('div', { class: 'popover-header' }, [
    el('div', {}, [
      el('div', { class: 'popover-title' }, [title]),
      subtitle ? el('div', { class: 'popover-subtitle' }, [subtitle]) : null,
    ].filter(Boolean)),
  ]);
}

function popoverAction(iconName, label, onClick, danger = false) {
  return el('button', {
    type: 'button',
    class: `popover-action ${danger ? 'danger' : ''}`.trim(),
    onclick: () => { closePopover(); onClick?.(); },
  }, [el('span', { 'data-icon': iconName, 'data-size': 'sm' }), el('span', {}, [label])]);
}

function popoverEmpty(text) { return el('div', { class: 'popover-empty' }, [text]); }

/* =============================================================
CLIPBOARD
============================================================= */
function copyText(text, successMsg = 'Скопировано') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast(successMsg, 'success')).catch(() => fallbackCopy(text, successMsg));
    return;
  }
  fallbackCopy(text, successMsg);
}

function fallbackCopy(text, successMsg) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(textarea);
  if (ok) toast(successMsg, 'success');
  else showCopyFallback(text);
}

function showCopyFallback(text) {
  openModal({
    title: 'Скопируйте вручную',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, ['Автокопирование недоступно. Выделите и скопируйте значение ниже:']),
      el('input', { class: 'copy-input', type: 'text', value: text, readonly: true, onclick: (e) => e.target.select() }),
    ]),
    saveLabel: 'Готово',
    onSave: async () => {},
  });
}

/* =============================================================
API CLIENT
============================================================= */
async function apiCall(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      credentials: 'include',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Сеть недоступна'), { status: 0 });
  }
  if (res.status === 204) return { ok: true, status: 204, data: null };
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (res.status === 401 && !opts.noRetry && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiCall(method, path, body, { ...opts, noRetry: true });
    logout();
    throw new Error('Сессия истекла');
  }
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || (typeof data === 'string' && data) || `Ошибка ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }
  return { ok: true, status: res.status, data };
}

async function tryRefresh() {
  try {
    const res = await fetch(API + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.access_token) {
      state.token = data.access_token;
      localStorage.setItem('access_token', data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function safeApi(promise, fallback) {
  try {
    const res = await promise;
    return res?.data ?? fallback;
  } catch (err) {
    if (err?.status === 401) logout();
    return fallback;
  }
}

/* =============================================================
AUTH
============================================================= */
async function login(phone, password) {
  const res = await apiCall('POST', '/auth/login', { phone_number: phone, password }, { noRetry: true });
  state.token = res.data.access_token;
  localStorage.setItem('access_token', state.token);
  await bootstrapApp();
}

async function register(fullName, age, phone, password) {
  const res = await apiCall('POST', '/auth/register', {
    phone_number: phone,
    password,
    full_name: fullName,
    age: Number(age),
  }, { noRetry: true });
  state.token = res.data.access_token;
  localStorage.setItem('access_token', state.token);
  await bootstrapApp();
}

async function logout() {
  try { await apiCall('POST', '/auth/logout', null, { noRetry: true }); } catch {}
  state.token = '';
  state.user = null;
  state.groups = [];
  state.invitations = [];
  state.activeGroupId = null;
  state.txTypes = {};
  state.dismissedInvites = new Set();
  localStorage.removeItem('access_token');
  localStorage.removeItem('active_group');
  localStorage.removeItem('zunno-tx-types');
  localStorage.removeItem('zunno-dismissed-invites');
  closeAllOverlays();
  if (typeof closeCreditDetail === 'function') closeCreditDetail();
  showScreen('auth');
}

/* =============================================================
SCREENS
============================================================= */
function showScreen(name) {
  $('#screen-auth')?.classList.toggle('hidden', name !== 'auth');
  $('#screen-app')?.classList.toggle('hidden', name !== 'app');
  document.body.classList.toggle('app-active', name === 'app');
  if (name !== 'app') closeFab();
}

function closeAllOverlays() {
  closeModal();
  closePopover();
  closeCommandPalette();
  closeFab();
}

/* =============================================================
AUTH SCREEN
============================================================= */
function initAuthScreen() {
  const tabs = $$('.segmented-btn');
  const thumb = $('.segmented-thumb');
  function switchTab(tab) {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
    thumb?.classList.toggle('right', tab === 'register');
    $('#form-login')?.classList.toggle('hidden', tab !== 'login');
    $('#form-register')?.classList.toggle('hidden', tab !== 'register');
  }
  tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  $('#form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const phone = String(fd.get('phone_number') || '').replace(/\s+/g, '').trim();
    const password = String(fd.get('password') || '');
    try { setBusy(true); await login(phone, password); }
    catch (err) { toast(err.message || 'Ошибка входа', 'error'); }
    finally { setBusy(false); }
  });

  $('#form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const fullName = String(fd.get('full_name') || '').trim();
    const age = fd.get('age');
    const phone = String(fd.get('phone_number') || '').replace(/\s+/g, '').trim();
    const password = String(fd.get('password') || '');
    try { setBusy(true); await register(fullName, age, phone, password); }
    catch (err) { toast(err.message || 'Ошибка регистрации', 'error'); }
    finally { setBusy(false); }
  });
}

/* =============================================================
BOOTSTRAP
============================================================= */
async function bootstrapApp() {
  try {
    setBusy(true);
    const me = await apiCall('GET', '/users/me');
    state.user = me.data;
    const groups = await apiCall('GET', '/groups');
    state.groups = groups.data || [];
    if (!state.activeGroupId || !state.groups.some((g) => g.id === state.activeGroupId)) {
      state.activeGroupId = state.groups[0]?.id || null;
      if (state.activeGroupId) localStorage.setItem('active_group', state.activeGroupId);
      else localStorage.removeItem('active_group');
    }
    const inv = await safeApi(apiCall('GET', '/invitations'), []);
    state.invitations = (inv || []).filter((x) => !isDismissedInvitation(x));
    showScreen('app');
    renderShell();
    await renderActiveView();
    if (!localStorage.getItem('zunno-onboarded')) setTimeout(() => startOnboardingTour(false), 750);
  } catch (err) {
    toast(err.message || 'Не удалось загрузить данные', 'error');
    if (err.status === 401) logout();
    else showScreen('auth');
  } finally {
    setBusy(false);
  }
}

function renderShell() {
  renderSidebarUser();
  renderSidebarGroups();
  renderTopbarGroup();
  renderTopbarUser();
  updateInvitationBadge();
  hydrateIcons();
}

/* =============================================================
SIDEBAR
============================================================= */
function isPersonalGroup(g) {
  if (!g) return false;
  if (g.is_personal === true || g.type === 'personal') return true;
  const name = String(g.name || '').trim().toLowerCase();
  return ['моё', 'мое', 'личное', 'личная', 'my', 'personal'].includes(name);
}

function renderSidebarUser() {
  const box = $('#sidebar-user');
  if (!box) return;
  box.innerHTML = '';
  const u = state.user;
  if (!u) return;
  box.appendChild(el('button', { type: 'button', class: 'user-chip', onclick: () => switchView('profile') }, [
    el('div', { class: 'avatar' }, [initials(u.full_name)]),
    el('div', { class: 'user-chip-info' }, [
      el('div', { class: 'user-chip-name' }, [u.full_name || 'Без имени']),
      el('div', { class: 'user-chip-phone' }, [u.phone_number || '']),
    ]),
  ]));
}

function renderSidebarGroups() {
  const box = $('#sidebar-group-list');
  if (!box) return;
  box.innerHTML = '';
  if (!state.groups.length) {
    box.appendChild(el('div', { class: 'text-xs text-3', style: 'padding: 8px 10px;' }, ['Нет групп']));
    return;
  }
  const personalGroup = state.groups.find(isPersonalGroup);
  const otherGroups = state.groups.filter((g) => g !== personalGroup);
  if (personalGroup) {
    box.appendChild(el('div', { class: 'text-xs text-3 nav-label', style: 'padding: 8px 10px 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;' }, ['Личное']));
    box.appendChild(renderSidebarGroupItem(personalGroup, true));
    if (otherGroups.length) box.appendChild(el('div', { style: 'height: 1px; background: var(--border); margin: 8px 10px;' }));
  }
  if (otherGroups.length) {
    box.appendChild(el('div', { class: 'text-xs text-3 nav-label', style: 'padding: 8px 10px 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;' }, ['Мои группы']));
    otherGroups.forEach((g) => box.appendChild(renderSidebarGroupItem(g, false)));
  }
}

function renderSidebarGroupItem(g, personal) {
  return el('button', {
    type: 'button',
    class: 'sidebar-group-item' + (g.id === state.activeGroupId ? ' is-active' : ''),
    'data-tip': g.name,
    onclick: () => switchGroup(g.id),
  }, [
    el('span', {
      class: 'group-dot',
      style: personal ? 'background: linear-gradient(135deg, var(--primary), var(--accent));' : `background:${colorFromId(g.id)}`,
    }),
    el('span', { class: 'sidebar-group-item-name nav-label' }, [g.name]),
  ]);
}

function initSidebar() {
  const app = $('#screen-app');
  const saved = localStorage.getItem('zunno-sidebar') === 'collapsed';
  if (app) app.dataset.sidebar = saved ? 'collapsed' : 'expanded';
  $('#sidebar-collapse')?.addEventListener('click', () => {
    const collapsed = app.dataset.sidebar === 'collapsed';
    app.dataset.sidebar = collapsed ? 'expanded' : 'collapsed';
    localStorage.setItem('zunno-sidebar', collapsed ? 'expanded' : 'collapsed');
  });

  const block = $('#sidebar-group-block');
  const savedOpen = localStorage.getItem('zunno-groups-open') !== 'false';
  if (block) block.dataset.open = savedOpen ? 'true' : 'false';
  $('#sidebar-groups-toggle')?.addEventListener('click', () => {
    const open = block?.dataset.open === 'true';
    if (block) block.dataset.open = open ? 'false' : 'true';
    localStorage.setItem('zunno-groups-open', open ? 'false' : 'true');
  });
}

/* =============================================================
TOPBAR
============================================================= */
function renderTopbarGroup() {
  const g = activeGroup();
  const nameEl = $('#topbar-group-name');
  const metaEl = $('#topbar-group-meta');
  const avatarEl = $('#topbar-group-avatar');
  if (!g) {
    if (nameEl) nameEl.textContent = 'Нет группы';
    if (metaEl) metaEl.textContent = 'Создайте или присоединитесь';
    if (avatarEl) { avatarEl.textContent = '?'; avatarEl.style.background = ''; }
    return;
  }
  if (nameEl) nameEl.textContent = g.name;
  if (metaEl) metaEl.textContent = isPersonalGroup(g) ? 'Личное пространство' : `ID: ${shortId(g.id)}`;
  if (avatarEl) {
    avatarEl.textContent = initials(g.name);
    avatarEl.style.background = `linear-gradient(135deg, ${colorFromId(g.id)}, var(--accent))`;
  }
}

function renderTopbarUser() {
  const btn = $('#topbar-user-btn');
  if (!btn) return;
  btn.textContent = initials(state.user?.full_name);
}

function updateInvitationBadge() {
  const badge = $('#invitation-badge');
  if (!badge) return;
  const count = state.invitations?.length || 0;
  badge.textContent = String(count);
  badge.classList.toggle('hidden', count === 0);
}

function activeGroup() {
  return state.groups.find((g) => g.id === state.activeGroupId) || null;
}

function switchGroup(id) {
  if (!id) return;
  state.activeGroupId = id;
  localStorage.setItem('active_group', id);
  renderSidebarGroups();
  renderTopbarGroup();
  renderActiveView();
  closePopover();
  closeCommandPalette();
}

function initTopbar() {
  $('#group-switcher-btn')?.addEventListener('click', (e) => openGroupPopover(e.currentTarget));
  $('#invitations-btn')?.addEventListener('click', (e) => openInvitationsPopover(e.currentTarget));
  $('#user-menu-btn')?.addEventListener('click', (e) => openUserPopover(e.currentTarget));
  $('#btn-new-group')?.addEventListener('click', openCreateGroupModal);
  $('#btn-join-group')?.addEventListener('click', openJoinGroupModal);
}

function openGroupPopover(anchor) {
  const g = activeGroup();
  const listWrap = el('div', { class: 'popover-list' });
  const search = el('input', {
    class: 'input popover-search',
    type: 'text',
    placeholder: 'Поиск группы...',
    oninput: (e) => renderGroupList(e.target.value, listWrap),
  });

  const actions = el('div', { class: 'popover-actions' }, [
    popoverAction('plus', 'Создать группу', openCreateGroupModal),
    popoverAction('login', 'Присоединиться по ID', openJoinGroupModal),
    g ? popoverAction('copy', 'Скопировать ID группы', () => copyText(g.id, 'ID группы скопирован')) : null,
    g ? popoverAction('settings', 'Настройки группы', openGroupSettingsModal) : null,
  ].filter(Boolean));

  renderGroupList('', listWrap);

  openPopover(anchor, el('div', {}, [
    popoverHeader('Группы', state.groups.length ? `${state.groups.length} доступно` : ''),
    search,
    listWrap,
    el('div', { class: 'popover-divider' }),
    actions,
  ]));
}

function renderGroupList(query, listWrap) {
  const q = String(query || '').trim().toLowerCase();
  const groups = state.groups.filter((g) => !q || `${g.name} ${g.id}`.toLowerCase().includes(q));
  listWrap.innerHTML = '';
  if (!groups.length) { listWrap.appendChild(popoverEmpty('Ничего не найдено')); return; }
  groups.forEach((group) => {
    listWrap.appendChild(el('button', {
      type: 'button',
      class: 'popover-item' + (group.id === state.activeGroupId ? ' is-active' : ''),
      onclick: () => { closePopover(); switchGroup(group.id); },
    }, [
      el('span', {
        class: 'group-avatar',
        style: `width:30px;height:30px;border-radius:11px;background:linear-gradient(135deg, ${colorFromId(group.id)}, var(--accent));`,
      }, [initials(group.name)]),
      el('span', { class: 'popover-item-main' }, [
        el('span', { class: 'popover-item-title' }, [group.name]),
        el('span', { class: 'popover-item-sub' }, [isPersonalGroup(group) ? 'Личное пространство' : `ID: ${shortId(group.id)}`]),
      ]),
      group.id === state.activeGroupId ? el('span', { 'data-icon': 'check', 'data-size': 'sm', style: 'color: var(--success);' }) : null,
    ].filter(Boolean)));
  });
  hydrateIcons(listWrap);
}

function openUserPopover(anchor) {
  const u = state.user;
  const currentTheme = document.documentElement.dataset.theme || 'dark';
  openPopover(anchor, el('div', {}, [
    el('div', { class: 'popover-header' }, [
      el('div', { class: 'row', style: 'gap:10px;' }, [
        el('div', { class: 'avatar' }, [initials(u?.full_name)]),
        el('div', {}, [
          el('div', { class: 'popover-title' }, [u?.full_name || 'Профиль']),
          el('div', { class: 'popover-subtitle' }, [u?.phone_number || '']),
        ]),
      ]),
    ]),
    el('div', { class: 'popover-divider' }),
    el('div', { class: 'theme-row' }, THEMES.map((t) => el('button', {
      type: 'button',
      class: 'theme-option' + (currentTheme === t ? ' is-active' : ''),
      onclick: () => { applyTheme(t); closePopover(); toast(`Тема: ${THEME_META[t].label}`, 'info', 1500); },
    }, [icon(THEME_META[t].icon, 18), el('span', {}, [THEME_META[t].label])]))),
    el('div', { class: 'popover-divider' }),
    el('div', { class: 'popover-actions' }, [
      popoverAction('user', 'Мой профиль', () => switchView('profile')),
      popoverAction('bell', 'Приглашения', () => openInvitationsPopover(anchor)),
      popoverAction('logout', 'Выйти', logout, true),
    ]),
  ]));
}

function openInvitationsPopover(anchor) {
  const items = state.invitations?.length
    ? state.invitations.map((inv) => renderInvitationItem(inv, true))
    : [popoverEmpty('Новых приглашений нет')];
  openPopover(anchor, el('div', {}, [
    popoverHeader('Приглашения', state.invitations?.length ? `${state.invitations.length} новых` : ''),
    el('div', { class: 'popover-list' }, items),
  ]));
}

/* =============================================================
VIEW ROUTER
============================================================= */
const VIEWS = {
  dashboard: { title: 'Обзор', icon: 'dashboard', render: renderDashboard },
  goals: { title: 'Цели', icon: 'target', render: renderGoals },
  budget: { title: 'Бюджет', icon: 'wallet', render: renderBudget },
  plans: { title: 'Планы', icon: 'calendar', render: renderPlans },
  credits: { title: 'Кредиты', icon: 'coins', render: renderCredits },
  profile: { title: 'Профиль', icon: 'user', render: renderProfile },
};

async function renderActiveView() {
  const view = VIEWS[state.view];
  if (!view) return;
  viewAnimators = [];
  $$('.nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.view === state.view));
  $$('.mobile-nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.view === state.view));
  const container = $('#view');
  if (!container) return;
  container.scrollTop = 0;
  container.innerHTML = '';
  renderSkeleton(container);
  try {
    await view.render(container);
    staggerChildren(container);
    hydrateIcons(container);
    flushAnimators();
  } catch (err) {
    renderError(container, err);
  }
}

function switchView(name) {
  state.view = name;
  renderActiveView();
  closePopover();
  closeCommandPalette();
  closeFab();
}

function renderSkeleton(container) {
  container.innerHTML = `
    <div class="skeleton skeleton-hero"></div>
    <div class="skeleton-grid">
      <div class="skeleton skeleton-stat"></div>
      <div class="skeleton skeleton-stat"></div>
      <div class="skeleton skeleton-stat"></div>
      <div class="skeleton skeleton-stat"></div>
    </div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-line" style="width: 38%"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-line" style="width: 52%"></div>
    <div class="skeleton skeleton-line" style="width: 28%"></div>
  `;
}

function renderError(container, err) {
  container.innerHTML = '';
  container.appendChild(emptyState('alert', 'Не удалось загрузить раздел', err?.message || 'Неизвестная ошибка'));
}

/* =============================================================
UI HELPERS
============================================================= */
function field(label, control, hint) {
  const children = [el('span', { class: 'field-label' }, [label]), control];
  if (hint) children.push(el('span', { class: 'field-hint' }, [hint]));
  return el('label', { class: 'field' }, children);
}

function sectionHead(title, desc, action = null) {
  return el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('div', { class: 'section-title' }, [title]),
      el('div', { class: 'section-desc' }, [desc]),
    ]),
    action,
  ].filter(Boolean));
}

function sectionBlock(title, desc, action, content, attrs = {}) {
  return el('section', { class: 'section', ...attrs }, [sectionHead(title, desc, action), content]);
}

function emptyState(iconName, title, text, actions = []) {
  return el('div', { class: 'card' }, [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, [icon(iconName, 30)]),
      el('div', { class: 'empty-title' }, [title]),
      el('div', { class: 'empty-text' }, [text]),
      actions.length ? el('div', { class: 'empty-actions' }, actions) : null,
    ].filter(Boolean)),
  ]);
}

function miniEmpty(text) { return el('div', { class: 'mini-empty' }, [text]); }

function chartCard(title, subtitle, content) {
  return el('div', { class: 'card chart-card' }, [
    el('div', { class: 'card-head' }, [
      el('div', {}, [
        el('div', { class: 'card-title' }, [title]),
        el('div', { class: 'card-subtitle' }, [subtitle]),
      ]),
    ]),
    content,
  ]);
}

function statTile(label, value, variant = '', formatter = fmtMoney) {
  const valueNode = el('div', { class: `stat-value ${variant}`.trim() }, ['—']);
  const node = el('div', { class: 'stat-card' }, [
    el('div', { class: 'stat-label' }, [label]),
    valueNode,
  ]);
  animateNumber(valueNode, Number(value) || 0, formatter);
  return node;
}

function animateNumber(node, value, formatter) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    node.textContent = formatter(value);
    return;
  }
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = formatter(value * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function chip(iconName, label, onClick) {
  return el('button', { type: 'button', class: 'chip', onclick: onClick }, [
    el('span', { 'data-icon': iconName, 'data-size': 'sm' }),
    el('span', {}, [label]),
  ]);
}

function progressRing(percent, size = 48, stroke = 5) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamp(percent, 0, 100) / 100) * c;
  const gid = `ringGradient-${++ringCounter}`;
  const defs = svgEl('defs', {}, [
    svgEl('linearGradient', { id: gid, x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, [
      svgEl('stop', { offset: '0%', 'stop-color': 'var(--primary)' }),
      svgEl('stop', { offset: '100%', 'stop-color': 'var(--accent)' }),
    ]),
  ]);
  const bg = svgEl('circle', { class: 'ring-bg', cx: size / 2, cy: size / 2, r, fill: 'none', 'stroke-width': stroke });
  const fg = svgEl('circle', {
    class: 'ring-fg',
    cx: size / 2,
    cy: size / 2,
    r,
    fill: 'none',
    'stroke-width': stroke,
    stroke: `url(#${gid})`,
    transform: `rotate(-90 ${size / 2} ${size / 2})`,
    style: `stroke-dasharray:${c}; stroke-dashoffset:${c};`,
  });
  animateLater(() => { fg.style.strokeDashoffset = String(offset); });
  return svgEl('svg', { class: 'progress-ring', viewBox: `0 0 ${size} ${size}` }, [defs, bg, fg]);
}

/* =============================================================
CHARTS
============================================================= */
function donutChart(items, options = {}) {
  const valid = items.map((item) => ({ ...item, value: Number(item.value || 0) })).filter((item) => item.value > 0).slice(0, 8);
  if (!valid.length) return miniEmpty(options.empty || 'Нет данных для диаграммы');
  const total = valid.reduce((sum, item) => sum + item.value, 0);
  const size = 170;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = valid.map((item, idx) => {
    const dash = (item.value / total) * circumference;
    const color = item.color || colorFromId(`${item.label}-${idx}`);
    const circle = svgEl('circle', {
      cx: size / 2,
      cy: size / 2,
      r: radius,
      fill: 'none',
      stroke: color,
      'stroke-width': stroke,
      'stroke-linecap': 'round',
      'stroke-dasharray': `0 ${circumference}`,
      'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${size / 2} ${size / 2})`,
    });
    circle.appendChild(svgEl('title', {}, [`${item.label}: ${fmtMoney(item.value)}`]));
    animateLater(() => { circle.style.strokeDasharray = `${dash} ${circumference - dash}`; });
    offset += dash;
    return circle;
  });
  const centerValue = options.centerValue === false ? String(valid.length) : fmtMoney(total);
  const svgNode = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, class: 'donut-svg', role: 'img', 'aria-label': options.aria || 'Круговая диаграмма' }, [
    ...circles,
    svgEl('text', { x: '50%', y: '48%', 'text-anchor': 'middle', class: 'donut-center-value' }, [centerValue]),
    svgEl('text', { x: '50%', y: '62%', 'text-anchor': 'middle', class: 'donut-center-label' }, [options.centerLabel || 'всего']),
  ]);
  const legend = el('div', { class: 'chart-legend' }, valid.map((item, idx) => el('div', { class: 'legend-item' }, [
    el('span', { class: 'legend-dot', style: `background:${item.color || colorFromId(`${item.label}-${idx}`)}` }),
    el('span', { class: 'legend-label' }, [item.label]),
    el('span', { class: 'legend-value mono' }, [fmtMoney(item.value)]),
  ])));
  return el('div', { class: 'donut-chart' }, [svgNode, legend]);
}

function barChart(items) {
  const valid = items.map((item) => ({ label: item.label || '—', value: Number(item.value || 0) })).filter((item) => Number.isFinite(item.value)).slice(0, 10);
  if (!valid.length) return miniEmpty('Нет данных для диаграммы');
  const max = Math.max(...valid.map((item) => item.value), 1);
  return el('div', { class: 'chart-bars' }, valid.map((item) => {
    const pct = Math.max(2, (item.value / max) * 100);
    const fill = el('div', { class: 'bar-fill', style: 'width:0%' });
    animateLater(() => { fill.style.width = `${pct}%`; });
    return el('div', { class: 'bar-row' }, [
      el('div', { class: 'bar-label' }, [item.label]),
      el('div', { class: 'bar-track' }, [fill]),
      el('div', { class: 'bar-value mono' }, [fmtMoney(item.value)]),
    ]);
  }));
}

function normalizeAnalytics(raw) {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data) ? raw.data : [];
  return arr.map((item) => ({
    raw: item.month || item.date || item.period || '',
    label: formatMonthLabel(item.month || item.date || item.period || ''),
    income: Number(item.income ?? 0),
    expense: Number(item.expense ?? 0),
  })).filter((item) => item.label).sort((a, b) => monthSortValue(a.raw) - monthSortValue(b.raw)).slice(-12);
}

function buildAnalyticsFromTransactions(txs) {
  const map = new Map();
  (txs || []).forEach((t) => {
    const iso = t.date || t.created_at;
    if (!iso) return;
    const month = String(iso).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const cur = map.get(month) || { raw: month, label: formatMonthLabel(month), income: 0, expense: 0 };
    const type = txType(t);
    const amount = Math.abs(Number(t.amount || 0));
    if (type === 'income') cur.income += amount;
    else cur.expense += amount;
    map.set(month, cur);
  });
  return Array.from(map.values()).sort((a, b) => monthSortValue(a.raw) - monthSortValue(b.raw)).slice(-12);
}

function trendChart(items) {
  const data = normalizeAnalytics(items);
  if (data.length < 2) return miniEmpty('Недостаточно данных для графика');
  const w = 620;
  const h = 190;
  const pad = { t: 20, r: 20, b: 30, l: 42 };
  const values = data.flatMap((d) => [d.income, d.expense]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const x = (i) => pad.l + i * ((w - pad.l - pad.r) / (data.length - 1));
  const y = (v) => h - pad.b - ((v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  const expensePoints = data.map((d, i) => ({ x: x(i), y: y(d.expense), d }));
  const incomePoints = data.map((d, i) => ({ x: x(i), y: y(d.income), d }));
  const toPath = (points) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const expensePath = toPath(expensePoints);
  const incomePath = toPath(incomePoints);
  const areaPath = `${expensePath} L${expensePoints.at(-1).x.toFixed(1)} ${h - pad.b} L${expensePoints[0].x.toFixed(1)} ${h - pad.b} Z`;
  const step = Math.max(1, Math.ceil(data.length / 6));
  const labels = data.map((d, i) => ({ d, i })).filter(({ i }) => i % step === 0 || i === data.length - 1).map(({ d, i }) => svgEl('text', { x: x(i), y: h - 8, 'text-anchor': 'middle', class: 'chart-axis-label' }, [d.label]));
  const expenseDots = expensePoints.map((p) => svgEl('circle', { cx: p.x, cy: p.y, r: 3, class: 'chart-dot expense' }, [svgEl('title', {}, [`Расход: ${fmtMoney(p.d.expense)}`])]));
  const incomeDots = incomePoints.map((p) => svgEl('circle', { cx: p.x, cy: p.y, r: 3, class: 'chart-dot income' }, [svgEl('title', {}, [`Доход: ${fmtMoney(p.d.income)}`])]));
  const expenseLine = svgEl('path', { d: expensePath, class: 'chart-line expense' });
  const incomeLine = svgEl('path', { d: incomePath, class: 'chart-line income' });
  animateLater(() => {
    [expenseLine, incomeLine].forEach((path) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      requestAnimationFrame(() => {
        path.style.transition = 'stroke-dashoffset 1.1s var(--ease)';
        path.style.strokeDashoffset = '0';
      });
    });
  });
  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'line-svg', preserveAspectRatio: 'none' }, [
    svgEl('path', { d: areaPath, class: 'chart-area' }),
    expenseLine,
    incomeLine,
    ...expenseDots,
    ...incomeDots,
    ...labels,
  ]);
  const legend = el('div', { class: 'chart-legend', style: 'margin-top:10px;' }, [
    el('div', { class: 'legend-item' }, [el('span', { class: 'legend-dot', style: 'background: var(--danger);' }), el('span', { class: 'legend-label' }, ['Расходы'])]),
    el('div', { class: 'legend-item' }, [el('span', { class: 'legend-dot', style: 'background: var(--success);' }), el('span', { class: 'legend-label' }, ['Доходы'])]),
  ]);
  return el('div', {}, [el('div', { class: 'line-chart-wrap' }, [svg]), legend]);
}

/* =============================================================
INVITATIONS
============================================================= */
function invitationKey(inv) {
  return `${inv?.group_id || ''}|${inv?.created_at || ''}`;
}
function isDismissedInvitation(inv) {
  return state.dismissedInvites.has(invitationKey(inv));
}
function dismissInvitation(inv) {
  state.dismissedInvites.add(invitationKey(inv));
  const arr = Array.from(state.dismissedInvites).slice(-200);
  state.dismissedInvites = new Set(arr);
  localStorage.setItem('zunno-dismissed-invites', JSON.stringify(arr));
}
function saveTxTypes() {
  const entries = Object.entries(state.txTypes).slice(-300);
  state.txTypes = Object.fromEntries(entries);
  localStorage.setItem('zunno-tx-types', JSON.stringify(state.txTypes));
}
function rememberTxType(id, type) {
  if (!id || !type) return;
  state.txTypes[id] = type;
  saveTxTypes();
}
function txType(t) {
  return t?.type || state.txTypes?.[t?.id] || 'expense';
}

function getInvitationTitle(inv) {
  return inv.group_name || inv.group?.name || (inv.group_id ? `Группа ${shortId(inv.group_id)}` : 'Группа');
}
function getInviterName(inv) {
  return inv.inviter_name || inv.invited_by_name || inv.from_name || inv.sender_name || inv.inviter?.full_name || inv.from_user?.full_name || '';
}
function getInvitationTask(inv) {
  const title = inv.plan_title || inv.task_title || inv.event_title || inv.title || '';
  return title && title !== getInvitationTitle(inv) ? title : '';
}

function renderInvitationItem(inv, compact = false) {
  const title = getInvitationTitle(inv);
  const inviter = getInviterName(inv);
  const task = getInvitationTask(inv);
  const roleLabel = inv.role === 'admin' ? 'Администратор' : 'Участник';
  const meta = [roleLabel, inviter ? `от ${inviter}` : '', inv.created_at ? fmtRelative(inv.created_at) : ''].filter(Boolean).join(' · ');
  return el('div', { class: 'invite-item' + (compact ? ' compact' : '') }, [
    el('div', { class: 'invite-avatar' }, [initials(title)]),
    el('div', { class: 'item-main' }, [
      el('div', { class: 'item-title' }, [title]),
      el('div', { class: 'item-sub' }, [meta]),
      task ? el('div', { class: 'invite-task' }, [task]) : null,
    ].filter(Boolean)),
    el('div', { class: 'row gap-8' }, [
      el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: (e) => respondInvitation(inv, true, e.currentTarget.closest('.invite-item')) }, ['Принять']),
      el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: (e) => respondInvitation(inv, false, e.currentTarget.closest('.invite-item')) }, ['Отклонить']),
    ]),
  ]);
}

async function respondInvitation(inv, accept, row = null) {
  if (!inv?.group_id) { toast('Некорректное приглашение', 'error'); return; }
  const buttons = row ? $$('button', row) : [];
  buttons.forEach((b) => (b.disabled = true));
  try {
    if (accept) {
      await apiCall('POST', `/groups/${inv.group_id}/join`);
      toast('Вы присоединились к группе', 'success');
      await bootstrapApp();
    } else {
      try {
        await apiCall('POST', `/groups/${inv.group_id}/decline`);
        toast('Приглашение отклонено', 'success');
        await bootstrapApp();
      } catch (err) {
        if (err?.status === 403 || err?.status === 404) {
          dismissInvitation(inv);
          state.invitations = state.invitations.filter((x) => invitationKey(x) !== invitationKey(inv));
          row?.remove();
          updateInvitationBadge();
          toast('Приглашение скрыто локально (бэкенд отклонения требует правки)', 'warning');
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    toast(err.message || 'Не удалось обработать приглашение', 'error');
    buttons.forEach((b) => (b.disabled = false));
  }
}

/* =============================================================
ONBOARDING TOUR
============================================================= */
function startOnboardingTour(force = false) {
  const driverFactory = window.driver?.js?.driver || window.driver;
  if (typeof driverFactory !== 'function') { toast('Модуль тура не загружен', 'warning'); return; }
  if (!force && localStorage.getItem('zunno-onboarded') === '1') return;
  if (ui.tour) { try { ui.tour.destroy(); } catch {} }
  const steps = [
    { popover: { title: 'Добро пожаловать в Zunno 👋', description: 'Короткий тур по обновлённому интерфейсу. Можно пропустить в любой момент.', nextBtnText: 'Поехали', prevBtnText: 'Назад', doneBtnText: 'Начать' } },
  ];
  if (isVisible('.sidebar-nav')) steps.push({ element: '.sidebar-nav', popover: { title: 'Навигация', description: 'Разделы: Обзор, Цели, Бюджет, Планы, Профиль. На мобильных — нижнее меню.', side: 'right', align: 'start' } });
  if (isVisible('#group-switcher-btn')) steps.push({ element: '#group-switcher-btn', popover: { title: 'Активная группа', description: 'Переключение групп, создание, вход по ID и настройки.', side: 'bottom', align: 'start' } });
  if (isVisible('#invitations-btn')) steps.push({ element: '#invitations-btn', popover: { title: 'Приглашения', description: 'Принимай или отклоняй приглашения в группы.', side: 'bottom', align: 'end' } });
  if (isVisible('#fab-main')) steps.push({ element: '#fab-main', popover: { title: 'Быстрые действия', description: 'Расход, доход, событие или цель в один тап.', side: 'left', align: 'end' } });
  if (isVisible('#user-menu-btn')) steps.push({ element: '#user-menu-btn', popover: { title: 'Профиль и темы', description: 'Три темы: тёмная, светлая и розовая. Плюс выход и настройки.', side: 'bottom', align: 'end' } });
  steps.push({ popover: { title: 'Готово 🎉', description: 'Тур завершён. Повторить можно в профиле.', nextBtnText: 'Понятно' } });

  ui.tour = driverFactory({
    showProgress: true,
    progressText: '{{current}} из {{total}}',
    nextBtnText: 'Далее',
    prevBtnText: 'Назад',
    doneBtnText: 'Завершить',
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: 'zunno-tour-popover',
    onDestroyed: () => { localStorage.setItem('zunno-onboarded', '1'); ui.tour = null; },
    steps,
  });
  ui.tour.drive();
}

function isVisible(selector) {
  const node = typeof selector === 'string' ? document.querySelector(selector) : selector;
  return !!node && node.offsetParent !== null;
}

/* =============================================================
DRAG & DROP
============================================================= */
function createSortable(container, options) {
  if (!window.Sortable || !container) return null;
  const existing = window.Sortable.get(container);
  if (existing) { try { existing.destroy(); } catch {} }
  return new window.Sortable(container, options);
}

function initSortableItems(categoryID, containerEl) {
  createSortable(containerEl, {
    animation: 200,
    delay: 200,
    delayOnTouchOnly: true,
    touchStartThreshold: 4,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: async () => {
      const g = activeGroup();
      if (!g) return;
      const ids = Array.from(containerEl.children).filter((n) => n.dataset.itemId).map((n) => n.dataset.itemId);
      try {
        await apiCall('POST', `/groups/${g.id}/goal-categories/${categoryID}/items/reorder`, { ids });
        toast('Порядок сохранён', 'success', 1500);
      } catch (err) {
        toast(err.message, 'error');
        renderActiveView();
      }
    },
  });
}

function initSortableCategories(groupID, containerEl) {
  createSortable(containerEl, {
    animation: 200,
    delay: 200,
    delayOnTouchOnly: true,
    touchStartThreshold: 4,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: async () => {
      const ids = Array.from(containerEl.children).filter((n) => n.dataset.catId).map((n) => n.dataset.catId);
      try {
        await apiCall('POST', `/groups/${groupID}/goal-categories/reorder`, { ids });
        toast('Порядок сохранён', 'success', 1500);
      } catch (err) {
        toast(err.message, 'error');
        renderActiveView();
      }
    },
  });
}

/* =============================================================
FAB
============================================================= */
function initFab() {
  const wrap = $('#fab');
  const main = $('#fab-main');
  if (!wrap || !main) return;
  main.addEventListener('click', () => { ui.fabOpen ? closeFab() : openFab(); });
  $$('#fab-menu .fab-item').forEach((btn) => {
    btn.addEventListener('click', () => { const action = btn.dataset.action; closeFab(); handleFabAction(action); });
  });
  document.addEventListener('pointerdown', (e) => { if (ui.fabOpen && !wrap.contains(e.target)) closeFab(); });
}
function openFab() { ui.fabOpen = true; $('#fab')?.classList.add('open'); $('#fab-main')?.setAttribute('aria-expanded', 'true'); }
function closeFab() { ui.fabOpen = false; $('#fab')?.classList.remove('open'); $('#fab-main')?.setAttribute('aria-expanded', 'false'); }
function handleFabAction(action) {
  const g = activeGroup();
  if (!g) { toast('Сначала создайте или выберите группу', 'warning'); openCreateGroupModal(); return; }
  if (action === 'expense') openTransactionModal(g, 'expense');
  if (action === 'income') openTransactionModal(g, 'income');
  if (action === 'plan') openCreatePlanModal(g);
  if (action === 'goal') openCreateGoalCategoryModal(g);
  if (action === 'credit') openCreateCreditModal(g);
}

/* =============================================================
CALENDAR
============================================================= */
function shiftCalendarMonth(delta) {
  calendarState.month += delta;
  if (calendarState.month < 0) { calendarState.month = 11; calendarState.year -= 1; }
  else if (calendarState.month > 11) { calendarState.month = 0; calendarState.year += 1; }
  renderActiveView();
}
function resetCalendarMonth() {
  const now = new Date();
  calendarState.month = now.getMonth();
  calendarState.year = now.getFullYear();
  renderActiveView();
}
function renderCalendar(g, plans) {
  const year = calendarState.year;
  const month = calendarState.month;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const monthName = firstDay.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const head = el('div', { class: 'calendar-head' }, [
    el('div', { class: 'calendar-title' }, [monthName]),
    el('div', { class: 'calendar-nav' }, [
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Предыдущий месяц', onclick: () => shiftCalendarMonth(-1) }, [icon('chevronLeft', 18)]),
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Сегодня', onclick: resetCalendarMonth }, [icon('clock', 18)]),
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Следующий месяц', onclick: () => shiftCalendarMonth(1) }, [icon('chevronRight', 18)]),
    ]),
  ]);
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weekdayRow = el('div', { class: 'calendar-grid' }, weekdays.map((d) => el('div', { class: 'calendar-weekday' }, [d])));
  const grid = el('div', { class: 'calendar-grid' });
  for (let i = 0; i < startWeekday; i++) grid.appendChild(el('div', { style: 'opacity: 0;' }));
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayPlans = plans.filter((p) => {
      const pd = new Date(p.event_date);
      return pd.getFullYear() === year && pd.getMonth() === month && pd.getDate() === d;
    });
    const isToday = isCurrentMonth && today.getDate() === d;
    const dayCell = el('div', { class: 'calendar-day' + (isToday ? ' today' : ''), onclick: () => openCreatePlanModalWithDate(g, date) }, [
      el('div', { class: 'calendar-day-num' }, [String(d)]),
      ...dayPlans.slice(0, 3).map((p) => el('div', {
        class: 'calendar-event' + (p.is_done ? ' done' : ''),
        title: p.title,
        onclick: (e) => { e.stopPropagation(); openEditPlanModal(g, p); },
      }, [p.title])),
      dayPlans.length > 3 ? el('div', { class: 'calendar-more' }, [`+${dayPlans.length - 3}`]) : null,
    ].filter(Boolean));
    grid.appendChild(dayCell);
  }
  return el('div', { class: 'calendar' }, [head, weekdayRow, grid]);
}
function openCreatePlanModalWithDate(g, date) {
  const titleInput = el('input', { class: 'input', name: 'title', required: true, maxlength: 200, placeholder: 'Пикник в парке' });
  const descInput = el('textarea', { class: 'input', name: 'description', placeholder: 'Необязательно' });
  const dateInput = el('input', { class: 'input', name: 'event_date', type: 'datetime-local', value: toLocalInput(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0).toISOString()), required: true });
  openModal({
    title: 'Новое событие',
    body: el('div', {}, [field('Название', titleInput), field('Описание', descInput), field('Дата и время', dateInput)]),
    onSave: async () => {
      try {
        await apiCall('POST', `/groups/${g.id}/plans`, {
          title: titleInput.value.trim(),
          description: descInput.value.trim(),
          event_date: fromLocalInput(dateInput.value),
        });
        toast('Событие создано', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

/* =============================================================
SWIPE GESTURES (fixed)
============================================================= */
function makeSwipeable(node, onSwipeLeft) {
  const content = node.querySelector('.swipeable-content') || node;
  let startX = 0, startY = 0, lastX = 0, dx = 0;
  let started = false, decided = null, active = false;

  const isInteractive = (target) => !!target?.closest?.('button, a, input, select, textarea, [data-no-swipe]');

  node.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (isInteractive(e.target)) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    lastX = t.clientX;
    dx = 0;
    started = true;
    decided = null;
    active = false;
  }, { passive: true });

  node.addEventListener('touchmove', (e) => {
    if (!started || e.touches.length !== 1) return;
    const t = e.touches[0];
    const currentX = t.clientX;
    const currentY = t.clientY;
    dx = currentX - startX;
    const dy = currentY - startY;

    if (!decided) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.1) {
        decided = 'vertical';
        started = false;
        return;
      }
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        decided = 'horizontal';
        active = true;
        node.classList.add('dragging');
      }
    }

    if (decided === 'horizontal') {
      e.preventDefault();
      const offset = clamp(dx, -120, 0);
      content.style.transform = `translateX(${offset}px)`;
    }
    lastX = currentX;
  }, { passive: false });

  function endSwipe() {
    if (!active) {
      started = false;
      decided = null;
      return;
    }
    node.classList.remove('dragging');
    if (dx < -80) {
      content.style.transform = 'translateX(-100%)';
      setTimeout(() => { try { onSwipeLeft?.(); } catch {} }, 180);
    } else {
      content.style.transform = 'translateX(0)';
    }
    started = false;
    decided = null;
    active = false;
  }

  node.addEventListener('touchend', endSwipe, { passive: true });
  node.addEventListener('touchcancel', () => {
    if (active) content.style.transform = 'translateX(0)';
    node.classList.remove('dragging');
    started = false; decided = null; active = false;
  }, { passive: true });
}

function resetSwipeRow(txId) {
  const content = $(`[data-tx-id="${txId}"]`);
  const wrapper = content?.closest('.swipeable');
  if (wrapper) {
    wrapper.style.display = '';
    wrapper.classList.remove('dragging');
    content.style.transform = 'translateX(0)';
  }
}

function noGroupBanner() {
  return el('div', { class: 'card' }, [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, [icon('wallet', 30)]),
      el('div', { class: 'empty-title' }, ['Нет активной группы']),
      el('div', { class: 'empty-text' }, ['Создайте свою или присоединитесь по ID']),
      el('div', { class: 'empty-actions' }, [
        el('button', { type: 'button', class: 'btn btn-primary', onclick: openCreateGroupModal }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Создать группу'])]),
        el('button', { type: 'button', class: 'btn btn-ghost', onclick: openJoinGroupModal }, [el('span', { 'data-icon': 'login', 'data-size': 'sm' }), el('span', {}, ['Присоединиться'])]),
      ]),
    ]),
  ]);
}

/* =============================================================
VIEW: DASHBOARD
============================================================= */
async function renderDashboard(container) {
  const g = activeGroup();
  container.innerHTML = '';
  if (!g) { container.appendChild(noGroupBanner()); return; }
  const now = new Date();
  const month = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const [summary, membersSpent, plans, members, analyticsRaw, recentTx, debtsRaw, recurringsRaw, creditsRaw] = await Promise.all([
    safeApi(apiCall('GET', `/groups/${g.id}/budget/summary?month=${month}`), null),
    safeApi(apiCall('GET', `/groups/${g.id}/budget/members?month=${month}`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/plans?from=${from}&to=${to}`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/members`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/analytics`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/transactions?limit=50`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/debts`), { incoming: [], outgoing: [] }),
    safeApi(apiCall('GET', `/groups/${g.id}/recurring`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/credits`), []),
  ]);
  const debts = normalizeDebts(debtsRaw);
  const categories = await safeApi(apiCall('GET', `/groups/${g.id}/categories`), []);
  container.appendChild(renderHero(g, members.length, plans.length));
  if (state.invitations?.length) {
    container.appendChild(sectionBlock('Приглашения', `${state.invitations.length} ${plural(state.invitations.length, 'приглашение', 'приглашения', 'приглашений')}`, null, el('div', { class: 'invite-list' }, state.invitations.map((inv) => renderInvitationItem(inv, false)))));
  }
  const spent = Number(summary?.total_spent || 0);
  const limit = Number(summary?.total_limit || 0);
  const remaining = limit > 0 ? limit - spent : 0;
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  // Расчет обязательных платежей и свободных денег
  const recIncome = (recurringsRaw || []).filter(r => r.is_active && r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const recExpense = (recurringsRaw || []).filter(r => r.is_active && r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
  const creditExpense = (creditsRaw || []).filter(c => !c.credit.is_closed).reduce((s, c) => s + Number(c.summary.monthly_payment || 0), 0);
  
  const totalIncome = recIncome + Number(summary?.total_income || 0);
  const totalFixed = recExpense + creditExpense;
  const freeMoney = totalIncome - totalFixed;

  container.appendChild(el('div', { class: 'stat-grid' }, [
    statTile('Потрачено', spent, 'primary'),
    statTile('Лимит', limit, limit > 0 && spent > limit ? 'danger' : ''),
    statTile('Остаток', remaining, remaining < 0 ? 'danger' : 'success'),
    statTile('Участников', members.length, '', (n) => String(Math.round(n))),
  ]));

  if (totalIncome > 0) {
    container.appendChild(el('div', { class: 'card mt-16', style: 'border-color: rgba(var(--primary-rgb), 0.3); background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.05), transparent);' }, [
      el('div', { class: 'card-title mb-16' }, ['Бюджет на месяц (план)']),
      el('div', { class: 'row-between text-sm mb-8' }, [
        el('span', { class: 'text-2' }, ['Доходы (Зарплата и др.)']),
        el('span', { class: 'mono text-success', style: 'font-weight:800;' }, [`+${fmtMoney(totalIncome)}`])
      ]),
      el('div', { class: 'row-between text-sm mb-8' }, [
        el('span', { class: 'text-2' }, ['Кредиты']),
        el('span', { class: 'mono text-danger' }, [`−${fmtMoney(creditExpense)}`])
      ]),
      el('div', { class: 'row-between text-sm mb-12' }, [
        el('span', { class: 'text-2' }, ['Обязательные расходы']),
        el('span', { class: 'mono text-danger' }, [`−${fmtMoney(recExpense)}`])
      ]),
      el('div', { class: 'row-between', style: 'padding-top:12px; border-top:1px solid var(--border);' }, [
        el('span', { style: 'font-weight:850;' }, ['Свободные деньги']),
        el('span', { class: 'mono ' + (freeMoney < 0 ? 'text-danger' : 'text-success'), style: 'font-size:18px; font-weight:900;' }, [fmtMoney(freeMoney)])
      ])
    ]));
  }


  if (limit > 0) {
    container.appendChild(el('div', { class: 'card mt-16' }, [
      el('div', { class: 'row-between' }, [
        el('div', { class: 'text-sm text-2' }, ['Общий прогресс месяца']),
        el('div', { class: 'text-sm mono' }, [`${pct.toFixed(0)}%`]),
      ]),
      el('div', { class: 'progress mt-12' }, [el('div', { class: `progress-fill${pct >= 100 && spent > limit ? ' danger' : ''}`, style: 'width:0%' })]),
    ]));
    const fill = container.querySelector('.progress-fill');
    animateLater(() => { fill.style.width = `${pct}%`; });
  }
  const categoryItems = (summary?.categories || []).map((c) => ({ label: c.name || 'Без названия', value: Number(c.spent || 0), color: colorFromId(c.category_id || c.name) }));
  const memberItems = (membersSpent || []).map((m) => ({ label: m.full_name || 'Участник', value: Number(m.spent ?? 0) }));
  const analyticsData = normalizeAnalytics(analyticsRaw);
  const finalAnalytics = analyticsData.length >= 2 ? analyticsData : buildAnalyticsFromTransactions(recentTx);
  container.appendChild(el('div', { class: 'charts-grid' }, [
    chartCard('Расходы по категориям', month, donutChart(categoryItems, { centerLabel: 'категорий', centerValue: false })),
    chartCard('Участники', 'Кто сколько потратил', barChart(memberItems)),
    chartCard('Динамика', 'Доходы и расходы', trendChart(finalAnalytics)),
  ]));
  const me = members.find((m) => m.user_id === state.user?.id);
  const isAdmin = me?.role === 'admin';
  const personal = isPersonalGroup(g);
  if (!personal) {
    container.appendChild(sectionBlock('Участники', `${members.length} ${plural(members.length, 'человек', 'человека', 'человек')} в группе`, el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => openInviteModal(g) }, [el('span', { 'data-icon': 'invite', 'data-size': 'sm' }), el('span', {}, ['Пригласить'])]), el('div', { class: 'list' }, members.map((m, i) => stagger(renderMemberRow(m, isAdmin && m.user_id !== state.user?.id), i)))));
  }
  const upcoming = plans.filter((p) => !p.is_done).sort((a, b) => new Date(a.event_date) - new Date(b.event_date)).slice(0, 5);
  if (upcoming.length) {
    container.appendChild(sectionBlock('Ближайшие планы', `${upcoming.length} ${plural(upcoming.length, 'событие', 'события', 'событий')}`, el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => switchView('plans') }, ['Все']), el('div', { class: 'list' }, upcoming.map((p, i) => stagger(el('button', { type: 'button', class: 'item', onclick: () => openEditPlanModal(g, p) }, [
      el('div', { class: 'avatar-sm', style: `background:${colorFromId(p.id)}` }, [icon('calendar', 16)]),
      el('div', { class: 'item-main' }, [
        el('div', { class: 'item-title' }, [p.title]),
        el('div', { class: 'item-sub' }, [`${fmtDateTime(p.event_date)} · ${fmtRelative(p.event_date)}`]),
      ]),
    ]), i)))));
  }
  if (recentTx.length) {
    container.appendChild(sectionBlock('Последние операции', 'Свежие транзакции группы', el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => switchView('budget') }, ['Все']), el('div', { class: 'list' }, recentTx.map((t, i) => stagger(renderTransactionRow(t, categories, true), i)))));
  }
  if ((debts?.incoming?.length || debts?.outgoing?.length)) {
    container.appendChild(renderDebtsSection(debts, members, true));
  }
}

function renderHero(g, membersCount, plansCount) {
  const u = state.user;
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const dateStr = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const personal = isPersonalGroup(g);
  return el('section', { class: 'card hero-card' }, [
    el('div', { class: 'hero-bg' }),
    el('div', { class: 'hero-content' }, [
      el('div', { class: 'hero-top' }, [
        el('div', {}, [
          el('h2', { class: 'hero-title' }, [`${greet}, ${firstName(u?.full_name)}`]),
          el('p', { class: 'hero-sub' }, [dateStr]),
        ]),
        el('div', { class: 'hero-group' }, [
          el('div', { class: 'hero-avatar' }, [initials(g.name)]),
          el('div', {}, [
            el('strong', {}, [g.name]),
            el('small', {}, [personal ? 'Личное пространство' : `${membersCount} ${plural(membersCount, 'участник', 'участника', 'участников')} · ${plansCount} ${plural(plansCount, 'план', 'плана', 'планов')}`]),
          ]),
        ]),
      ]),
      el('div', { class: 'hero-actions' }, [
        chip('arrowDownCircle', 'Расход', () => openTransactionModal(g, 'expense')),
        chip('arrowUpCircle', 'Доход', () => openTransactionModal(g, 'income')),
        chip('calendarPlus', 'Событие', () => openCreatePlanModal(g)),
        personal ? null : chip('invite', 'Пригласить', () => openInviteModal(g)),
      ].filter(Boolean)),
    ]),
  ]);
}

function renderMemberRow(m, canManage = false) {
  const isMe = state.user && m.user_id === state.user.id;
  const roleTag = m.role === 'admin' ? el('span', { class: 'tag tag-primary' }, ['Админ']) : el('span', { class: 'tag tag-mute' }, ['Участник']);
  const displayName = isMe ? 'Вы' : m.full_name || 'Без имени';
  const subLine = isMe ? (m.phone_number ? `${m.phone_number} · это вы` : 'это вы') : m.phone_number || `ID: ${shortId(m.user_id)}`;
  return el('div', { class: 'item' }, [
    el('div', { class: 'avatar-sm', style: `background:${colorFromId(m.user_id)}` }, [initials(m.full_name || shortId(m.user_id).slice(0, 2))]),
    el('div', { class: 'item-main' }, [
      el('div', { class: 'item-title' }, [displayName]),
      el('div', { class: 'item-sub' }, [`${subLine} · ${fmtDate(m.joined_at)}`]),
    ]),
    roleTag,
    canManage ? el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Действия с участником', onclick: () => openMemberActionsModal(m) }, [icon('more', 18)]) : null,
  ].filter(Boolean));
}

function openMemberActionsModal(m) {
  const g = activeGroup();
  if (!g) return;
  const isTargetAdmin = m.role === 'admin';
  const actions = [
    el('button', {
      type: 'button',
      class: 'btn btn-ghost btn-block mb-8',
      onclick: async () => {
        closeModal();
        try {
          await apiCall('PATCH', `/groups/${g.id}/members/${m.user_id}`, { role: isTargetAdmin ? 'member' : 'admin' });
          toast('Роль изменена', 'success');
          await renderActiveView();
        } catch (err) { toast(err.message, 'error'); }
      },
    }, [isTargetAdmin ? 'Разжаловать до участника' : 'Сделать админом']),
    el('button', {
      type: 'button',
      class: 'btn btn-danger btn-block',
      onclick: () => {
        closeModal();
        confirmDelete(`Вы уверены, что хотите исключить ${m.full_name || 'участника'}?`, async () => {
          try {
            await apiCall('DELETE', `/groups/${g.id}/members/${m.user_id}`);
            toast('Участник исключён', 'success');
            await renderActiveView();
          } catch (err) { toast(err.message, 'error'); }
        });
      },
    }, ['Исключить из группы']),
  ];
  openModal({ title: m.full_name || 'Участник', body: el('div', { style: 'display:flex;flex-direction:column;' }, actions), saveLabel: 'Закрыть', onSave: async () => {} });
}

async function openGroupSettingsModal() {
  const g = activeGroup();
  if (!g) return;
  const members = await safeApi(apiCall('GET', `/groups/${g.id}/members`), []);
  const me = members.find((m) => m.user_id === state.user?.id);
  const isAdmin = me?.role === 'admin';
  const isOwner = g.owner_id === state.user?.id;
  const personal = isPersonalGroup(g);
  const actions = [];
  if (!personal && isAdmin) actions.push(el('button', { type: 'button', class: 'btn btn-ghost btn-block mb-8', onclick: () => { closeModal(); openRenameGroupModal(g); } }, ['Переименовать группу']));
  if (!personal && !isOwner) actions.push(el('button', { type: 'button', class: 'btn btn-danger-ghost btn-block mb-8', onclick: () => { closeModal(); confirmDelete('Вы уверены, что хотите покинуть группу?', async () => { try { await apiCall('POST', `/groups/${g.id}/leave`); toast('Вы покинули группу', 'success'); await bootstrapApp(); } catch (err) { toast(err.message, 'error'); } }); } }, ['Покинуть группу']));
  if (!personal && isOwner) actions.push(el('button', { type: 'button', class: 'btn btn-danger btn-block', onclick: () => { closeModal(); confirmDelete('УДАЛИТЬ ГРУППУ? Это действие необратимо. Все данные будут потеряны.', async () => { try { await apiCall('DELETE', `/groups/${g.id}`); toast('Группа удалена', 'success'); await bootstrapApp(); } catch (err) { toast(err.message, 'error'); } }); } }, ['Удалить группу']));
  openModal({ title: 'Настройки группы', body: actions.length ? el('div', { style: 'display:flex;flex-direction:column;' }, actions) : el('div', { class: 'text-2' }, ['Для этой группы доступны только базовые действия.']), saveLabel: 'Закрыть', onSave: async () => {} });
}

function openRenameGroupModal(g) {
  const input = el('input', { class: 'input', type: 'text', value: g.name, required: true, maxlength: 100 });
  openModal({
    title: 'Переименовать группу',
    body: el('div', {}, [el('p', { class: 'text-sm text-2', style: 'margin-bottom: 8px;' }, ['Новое название:']), input]),
    saveLabel: 'Сохранить',
    onSave: async () => {
      const newName = input.value.trim();
      if (!newName) throw new Error('Введите название');
      try {
        await apiCall('PATCH', `/groups/${g.id}`, { name: newName, version: Number(g.version ?? 0) });
        toast('Группа переименована', 'success');
        await bootstrapApp();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

/* =============================================================
VIEW: GOALS
============================================================= */
async function renderGoals(container) {
  const g = activeGroup();
  container.innerHTML = '';
  if (!g) { container.appendChild(noGroupBanner()); return; }
  const cats = await safeApi(apiCall('GET', `/groups/${g.id}/goal-categories`), []);
  container.appendChild(sectionHead('Категории целей', `${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`, el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => openCreateGoalCategoryModal(g) }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Категория'])])));
  if (!cats.length) { container.appendChild(emptyState('target', 'Пока нет категорий', 'Создайте первую — «Фильмы», «Книги», «Места»')); return; }
  const grid = el('div', { class: 'grid-auto' });
  const cards = await Promise.all(cats.map((c) => renderGoalCategoryCard(g, c)));
  cards.forEach((card, i) => grid.appendChild(stagger(card, i)));
  container.appendChild(grid);
  setTimeout(() => initSortableCategories(g.id, grid), 80);
}

async function renderGoalCategoryCard(g, c) {
  const items = await safeApi(apiCall('GET', `/groups/${g.id}/goal-categories/${c.id}/items`), []);
  const done = items.filter((i) => i.done ?? i.is_done).length;
  const pct = items.length ? (done / items.length) * 100 : 0;
  const card = el('div', { class: 'card', 'data-cat-id': c.id });
  card.appendChild(el('div', { class: 'card-head' }, [
    el('div', { class: 'row', style: 'gap:10px;' }, [
      el('div', { class: 'drag-handle', title: 'Перетащить категорию' }, [icon('drag', 18)]),
      progressRing(pct),
      el('div', {}, [
        el('div', { class: 'card-title' }, [c.name, c.due_date ? el('span', { class: 'tag tag-warning due-tag' }, [fmtDate(c.due_date)]) : null]),
        el('div', { class: 'card-subtitle' }, [items.length ? `${done} / ${items.length}` : 'Пусто']),
      ]),
    ]),
    el('div', { class: 'item-actions' }, [
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Переименовать / срок', onclick: () => openRenameGoalCategoryModal(g, c) }, [icon('edit', 18)]),
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Удалить', onclick: () => confirmDelete(`Удалить категорию «${c.name}»?`, async () => { try { await apiCall('DELETE', `/groups/${g.id}/goal-categories/${c.id}`); toast('Удалено', 'success'); await renderActiveView(); } catch (err) { toast(err.message, 'error'); } }) }, [icon('trash', 18)]),
    ]),
  ]));
  const list = el('div', { class: 'list mt-12' });
  items.forEach((it, i) => {
    const isDone = !!(it.done ?? it.is_done);
    const check = el('button', { type: 'button', class: 'check' + (isDone ? ' on' : ''), 'aria-label': isDone ? 'Отменить выполнение' : 'Отметить выполненным', onclick: () => toggleGoalItem(g, it, check) });
    list.appendChild(stagger(el('div', { class: 'item' + (isDone ? ' is-done' : ''), 'data-item-id': it.id }, [
      el('div', { class: 'drag-handle' }, [icon('drag', 18)]),
      check,
      el('div', { class: 'item-main' }, [
        el('div', { class: 'item-title' }, [it.title]),
        it.description ? el('div', { class: 'item-sub' }, [it.description]) : null,
      ].filter(Boolean)),
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Удалить', onclick: () => confirmDelete('Удалить элемент?', async () => { try { await apiCall('DELETE', `/groups/${g.id}/goal-items/${it.id}`); toast('Удалено', 'success'); await renderActiveView(); } catch (err) { toast(err.message, 'error'); } }) }, [icon('trash', 18)]),
    ]), i));
  });
  if (!items.length) list.appendChild(el('div', { class: 'text-sm text-3', style: 'padding:8px 0;text-align:center;' }, ['Нет элементов']));
  card.appendChild(list);
  setTimeout(() => initSortableItems(c.id, list), 80);
  card.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-block mt-12', onclick: () => openCreateGoalItemModal(g, c) }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Добавить элемент'])]));
  return card;
}

async function toggleGoalItem(g, item, checkNode) {
  const current = !!(item.done ?? item.is_done);
  const next = !current;
  item.done = next;
  item.is_done = next;
  checkNode.classList.toggle('on', next);
  try {
    await apiCall('PATCH', `/groups/${g.id}/goal-items/${item.id}`, { done: next, version: Number(item.version ?? 0) });
    await renderActiveView();
  } catch (err) {
    item.done = current;
    item.is_done = current;
    checkNode.classList.toggle('on', current);
    toast(err.message, 'error');
  }
}

function openCreateGoalCategoryModal(g) {
  const input = el('input', { class: 'input', name: 'name', required: true, maxlength: 100, placeholder: 'Фильмы' });
  const due = el('input', { class: 'input', name: 'due_date', type: 'date' });
  openModal({
    title: 'Новая категория целей',
    body: el('div', {}, [field('Название', input), field('Срок (необязательно)', due)]),
    onSave: async () => {
      try {
        const res = await apiCall('POST', `/groups/${g.id}/goal-categories`, { name: input.value.trim() });
        const dueISO = dateToEndISO(due.value);
        if (dueISO) await apiCall('PUT', `/groups/${g.id}/goal-categories/${res.data.id}/due`, { due_date: dueISO });
        toast('Создано', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openRenameGoalCategoryModal(g, c) {
  const input = el('input', { class: 'input', name: 'name', required: true, maxlength: 100, value: c.name });
  const due = el('input', { class: 'input', name: 'due_date', type: 'date', value: toDateInput(c.due_date) });
  openModal({
    title: 'Категория целей',
    body: el('div', {}, [field('Название', input), field('Срок (необязательно)', due)]),
    onSave: async () => {
      try {
        await apiCall('PATCH', `/groups/${g.id}/goal-categories/${c.id}`, { name: input.value.trim(), version: Number(c.version ?? 0) });
        const dueISO = dateToEndISO(due.value);
        await apiCall('PUT', `/groups/${g.id}/goal-categories/${c.id}/due`, { due_date: dueISO });
        toast('Обновлено', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openCreateGoalItemModal(g, c) {
  const title = el('input', { class: 'input', name: 'title', required: true, maxlength: 200, placeholder: 'Посмотреть Дюну' });
  const description = el('textarea', { class: 'input', name: 'description', placeholder: 'Необязательно' });
  openModal({
    title: 'Новый элемент',
    body: el('div', {}, [field('Название', title), field('Описание', description)]),
    onSave: async () => {
      try {
        await apiCall('POST', `/groups/${g.id}/goal-categories/${c.id}/items`, { title: title.value.trim(), description: description.value.trim() });
        toast('Добавлено', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

/* =============================================================
VIEW: BUDGET
============================================================= */
async function renderBudget(container) {
  const g = activeGroup();
  container.innerHTML = '';
  if (!g) { container.appendChild(noGroupBanner()); return; }
  const now = new Date();
  const month = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const [cats, txs, summary, membersSpent, analyticsRaw, members, debtsRaw] = await Promise.all([
    safeApi(apiCall('GET', `/groups/${g.id}/categories`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/transactions?limit=100`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/budget/summary?month=${month}`), null),
    safeApi(apiCall('GET', `/groups/${g.id}/budget/members?month=${month}`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/analytics`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/members`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/debts`), { incoming: [], outgoing: [] }),
  ]);
  const debts = normalizeDebts(debtsRaw); 
  if (summary) {
    const spent = Number(summary.total_spent || 0);
    const limit = Number(summary.total_limit || 0);
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    container.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'row-between' }, [
        el('div', {}, [el('div', { class: 'stat-label' }, ['Потрачено за месяц']), el('div', { class: 'stat-value primary' }, [fmtMoney(spent)])]),
        el('div', { style: 'text-align:right;' }, [el('div', { class: 'stat-label' }, ['Лимит']), el('div', { class: 'stat-value' }, [fmtMoney(limit)])]),
      ]),
      limit > 0 ? el('div', { class: 'progress mt-16' }, [el('div', { class: `progress-fill${spent > limit ? ' danger' : ''}`, style: 'width:0%' })]) : null,
    ].filter(Boolean)));
    const fill = container.querySelector('.progress-fill');
    animateLater(() => { fill.style.width = `${pct}%`; });
  }
  const categoryItems = (summary?.categories || []).map((c) => ({ label: c.name || 'Без названия', value: Number(c.spent || 0), color: colorFromId(c.category_id || c.name) }));
  const memberItems = (membersSpent || []).map((m) => ({ label: m.full_name || 'Участник', value: Number(m.spent ?? 0) }));
  const analyticsData = normalizeAnalytics(analyticsRaw);
  const finalAnalytics = analyticsData.length >= 2 ? analyticsData : buildAnalyticsFromTransactions(txs);
  container.appendChild(el('div', { class: 'charts-grid' }, [
    chartCard('Структура расходов', month, donutChart(categoryItems)),
    chartCard('По участникам', month, barChart(memberItems)),
    chartCard('Динамика', 'Доходы и расходы', trendChart(finalAnalytics)),
  ]));
  container.appendChild(sectionBlock('Категории', `${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`, el('div', { class: 'row', style: 'gap:8px;' }, [
    el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => exportTransactionsCsv(g) }, [el('span', { 'data-icon': 'download', 'data-size': 'sm' }), el('span', {}, ['CSV'])]),
    el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => openCreateCategoryModal(g) }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Категория'])]),
  ]), cats.length ? el('div', { class: 'grid-auto' }, cats.map((c, i) => stagger(renderCategoryCard(g, c, summary), i))) : emptyState('wallet', 'Нет категорий', 'Добавьте «Еду», «Транспорт», «Развлечения»')));

  const searchInput = el('input', { type: 'text', class: 'input', placeholder: 'Поиск по описанию...', style: 'flex:1;min-width:150px;' });
  const catSelect = el('select', { class: 'input' }, [el('option', { value: '' }, ['Все категории']), ...cats.map((c) => el('option', { value: c.id }, [c.name]))]);
  const userSelect = el('select', { class: 'input' }, [el('option', { value: '' }, ['Все участники']), ...members.map((m) => el('option', { value: m.user_id }, [m.full_name || 'Участник']))]);
  const typeSelect = el('select', { class: 'input' }, [el('option', { value: '' }, ['Все типы']), el('option', { value: 'expense' }, ['Расходы']), el('option', { value: 'income' }, ['Доходы'])]);
  const list = el('div', { class: 'list' });
  const applyFilters = debounce(async () => {
    list.innerHTML = '';
    list.appendChild(miniEmpty('Загрузка...'));
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.append('q', searchInput.value.trim());
    if (catSelect.value) params.append('category_id', catSelect.value);
    if (userSelect.value) params.append('user_id', userSelect.value);
    params.append('limit', '100');
    try {
      const res = await apiCall('GET', `/groups/${g.id}/transactions?${params.toString()}`);
      let data = res.data || [];
      if (typeSelect.value) data = data.filter((t) => txType(t) === typeSelect.value);
      renderTransactionRows(list, data, cats);
    } catch (err) {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'mini-empty text-danger' }, [err.message || 'Ошибка']));
    }
  }, 300);
  searchInput.addEventListener('input', applyFilters);
  catSelect.addEventListener('change', applyFilters);
  userSelect.addEventListener('change', applyFilters);
  typeSelect.addEventListener('change', applyFilters);
  container.appendChild(sectionBlock('Транзакции', `Последние ${txs.length}`, el('div', { class: 'row', style: 'gap:8px;' }, [
    el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => openSplitTransactionModal(g, cats, members) }, [el('span', { 'data-icon': 'split', 'data-size': 'sm' }), el('span', {}, ['Разделить'])]),
    el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => openTransactionModal(g, 'expense') }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Транзакция'])]),
  ]), el('div', {}, [
    el('div', { class: 'card mt-12 mb-12', style: 'display:flex;gap:8px;flex-wrap:wrap;padding:12px;' }, [searchInput, catSelect, userSelect, typeSelect]),
    list,
  ])));
  renderTransactionRows(list, txs, cats);
  container.appendChild(renderDebtsSection(debts, members, false));
  container.appendChild(await renderRecurringSection(g, cats));
}

function renderTransactionRows(list, txs, cats) {
  list.innerHTML = '';
  if (!txs.length) { list.appendChild(emptyState('wallet', 'Ничего не найдено', 'Попробуйте изменить фильтры или добавить транзакцию')); return; }
  txs.forEach((t, i) => list.appendChild(stagger(renderTransactionRow(t, cats, true), i)));
}

function renderCategoryCard(g, c, summary) {
  const item = summary?.categories?.find((x) => x.category_id === c.id) || null;
  const spent = Number(item?.spent || 0);
  const limit = Number(item?.limit ?? c.budget_limit ?? c.limit ?? 0);
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  return el('div', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('div', {}, [
        el('div', { class: 'card-title' }, [c.name]),
        el('div', { class: 'card-subtitle' }, [el('span', { class: `tag ${c.type === 'fixed' ? 'tag-primary' : 'tag-mute'}` }, [c.type === 'fixed' ? 'Постоянная' : 'Спонтанная'])]),
      ]),
      el('div', { class: 'item-actions' }, [
        el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Редактировать', onclick: () => openEditCategoryModal(g, c) }, [icon('edit', 18)]),
        el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Удалить', onclick: () => confirmDelete(`Удалить «${c.name}»?`, async () => { try { await apiCall('DELETE', `/groups/${g.id}/categories/${c.id}`); toast('Удалено', 'success'); await renderActiveView(); } catch (err) { toast(err.message, 'error'); } }) }, [icon('trash', 18)]),
      ]),
    ]),
    el('div', { class: 'row-between text-sm' }, [el('span', { class: 'text-2' }, ['Потрачено']), el('span', { class: 'mono' }, [fmtMoney(spent)])]),
    el('div', { class: 'row-between text-sm mt-8' }, [el('span', { class: 'text-2' }, ['Лимит']), el('span', { class: 'mono' }, [fmtMoney(limit)])]),
    el('div', { class: 'progress mt-12' }, [el('div', { class: `progress-fill${spent > limit && limit > 0 ? ' danger' : ''}`, style: 'width:0%' })]),
  ]);
}

function renderTransactionRow(t, cats, swipe = true) {
  const g = activeGroup();
  const cat = cats.find((c) => c.id === t.category_id);
  const isMe = state.user && t.user_id === state.user.id;
  const userName = t.user_full_name || t.full_name || t.user?.full_name || '';
  const type = txType(t);
  const content = el('div', { class: 'item swipeable-content', 'data-tx-id': t.id }, [
    el('div', { class: 'avatar-sm', style: `background:${colorFromId(t.category_id || t.id)}` }, [icon(type === 'income' ? 'arrowUpCircle' : 'arrowDownCircle', 18)]),
    el('div', { class: 'flex-1' }, [
      el('div', { class: 'item-title' }, [t.description || cat?.name || 'Без описания']),
      el('div', { class: 'item-sub' }, [[cat ? cat.name : 'Без категории', fmtDateTime(t.date), userName ? (isMe ? 'вы' : userName) : ''].filter(Boolean).join(' · ')]),
    ]),
    el('div', { class: `mono ${type === 'income' ? 'amount-positive' : 'amount-negative'}`, style: 'margin-right:8px;' }, [`${type === 'income' ? '+' : '−'}${fmtMoney(t.amount)}`]),
    el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Удалить транзакцию', onclick: () => handleDeleteTransaction(t, g) }, [icon('trash', 18)]),
  ]);
  if (!swipe) return content;
  const wrapper = el('div', { class: 'swipeable' }, [
    el('div', { class: 'swipeable-actions' }, [el('div', { class: 'swipe-action' }, ['Удалить'])]),
    content,
  ]);
  makeSwipeable(wrapper, () => handleDeleteTransaction(t, g));
  return wrapper;
}

function handleDeleteTransaction(t, g) {
  if (!g) return;
  const wrapper = $(`[data-tx-id="${t.id}"]`)?.closest('.swipeable');
  if (wrapper) wrapper.style.display = 'none';
  deleteWithUndo({
    label: `Транзакция «${t.description || 'Без описания'}»`,
    onConfirm: async () => {
      try {
        await apiCall('DELETE', `/groups/${g.id}/transactions/${t.id}`);
        await renderActiveView();
      } catch (err) {
        toast(err.message, 'error');
        resetSwipeRow(t.id);
      }
    },
    onCancel: () => resetSwipeRow(t.id),
  });
}

async function exportTransactionsCsv(g) {
  try {
    const res = await fetch(`${API}/groups/${g.id}/transactions/export`, { headers: { Authorization: `Bearer ${state.token}` }, credentials: 'include' });
    if (!res.ok) throw new Error('Не удалось экспортировать');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: `zunno-transactions-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('CSV скачан', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

function openCreateCategoryModal(g) {
  const name = el('input', { class: 'input', name: 'name', required: true, maxlength: 100, placeholder: 'Еда' });
  const type = el('select', { class: 'input', name: 'type', required: true }, [el('option', { value: 'fixed' }, ['Постоянная (еда, дом)']), el('option', { value: 'spontaneous' }, ['Спонтанная'])]);
  const limit = el('input', { class: 'input', name: 'budget_limit', type: 'number', min: 0, step: '0.01', value: 0, required: true });
  openModal({
    title: 'Новая категория',
    body: el('div', {}, [field('Название', name), field('Тип', type), field(`Лимит в месяц (${currencySymbol()})`, limit)]),
    onSave: async () => {
      try {
        await apiCall('POST', `/groups/${g.id}/categories`, { name: name.value.trim(), type: type.value, budget_limit: Number(limit.value) });
        toast('Создано', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openEditCategoryModal(g, c) {
  const name = el('input', { class: 'input', name: 'name', required: true, maxlength: 100, value: c.name });
  const type = el('select', { class: 'input', name: 'type', required: true }, [el('option', { value: 'fixed', selected: c.type === 'fixed' }, ['Постоянная']), el('option', { value: 'spontaneous', selected: c.type !== 'fixed' }, ['Спонтанная'])]);
  const limit = el('input', { class: 'input', name: 'budget_limit', type: 'number', min: 0, step: '0.01', value: Number(c.budget_limit ?? c.limit ?? 0), required: true });
  openModal({
    title: 'Редактировать категорию',
    body: el('div', {}, [field('Название', name), field('Тип', type), field(`Лимит в месяц (${currencySymbol()})`, limit)]),
    onSave: async () => {
      try {
        await apiCall('PATCH', `/groups/${g.id}/categories/${c.id}`, { name: name.value.trim(), type: type.value, budget_limit: Number(limit.value), version: Number(c.version ?? 0) });
        toast('Обновлено', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openTransactionModal(g, presetType = 'expense') {
  safeApi(apiCall('GET', `/groups/${g.id}/categories`), []).then((cats) => {
    if (!cats.length) { toast('Сначала создайте категорию в разделе Бюджет', 'warning'); switchView('budget'); return; }
    let type = presetType;
    const amountInput = el('input', { type: 'number', step: '0.01', min: '0.01', required: true, placeholder: `Сумма (${currencySymbol()})`, class: 'input', style: 'width:100%;padding:16px;font-size:24px;text-align:center;font-weight:900;border-radius:16px;' });
    const presets = [100, 500, 1000, 5000];
    const presetsRow = el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;' }, presets.map((p) => el('button', { type: 'button', class: 'preset-btn', onclick: () => { amountInput.value = p; amountInput.focus(); } }, [`${p} ${currencySymbol()}`])));
    const expenseBtn = el('button', { type: 'button', class: `btn ${type === 'expense' ? 'btn-danger' : 'btn-ghost'} btn-sm flex-1`, onclick: () => { type = 'expense'; expenseBtn.className = 'btn btn-danger btn-sm flex-1'; incomeBtn.className = 'btn btn-ghost btn-sm flex-1'; } }, ['Расход']);
    const incomeBtn = el('button', { type: 'button', class: `btn ${type === 'income' ? 'btn-primary' : 'btn-ghost'} btn-sm flex-1`, onclick: () => { type = 'income'; expenseBtn.className = 'btn btn-ghost btn-sm flex-1'; incomeBtn.className = 'btn btn-primary btn-sm flex-1'; } }, ['Доход']);
    const catSelect = el('select', { class: 'input', required: true }, cats.map((c) => el('option', { value: c.id }, [c.name])));
    const dateInput = el('input', { class: 'input', type: 'datetime-local', value: toLocalInput(new Date().toISOString()), required: true });
    const descInput = el('input', { type: 'text', placeholder: 'Описание (необязательно)', maxlength: '255', class: 'input' });
    openModal({
      title: '⚡ Быстрая запись',
      body: el('div', {}, [amountInput, presetsRow, el('div', { class: 'row gap-8' }, [expenseBtn, incomeBtn]), field('Категория', catSelect), field('Дата', dateInput), field('Описание', descInput)]),
      saveLabel: 'Добавить',
      onSave: async () => {
        const amount = parseFloat(amountInput.value);
        if (!amount || amount <= 0) throw new Error('Введите сумму');
        try {
          const res = await apiCall('POST', `/groups/${g.id}/transactions`, {
            category_id: catSelect.value,
            amount,
            type,
            date: fromLocalInput(dateInput.value) || new Date().toISOString(),
            description: descInput.value.trim(),
          });
          rememberTxType(res.data?.id, type);
          toast('Добавлено!', 'success');
          await renderActiveView();
        } catch (err) { toast(err.message, 'error'); throw err; }
      },
    });
  });
}

function openSplitTransactionModal(g, cats, members) {
  if (!cats.length) { toast('Сначала создайте категорию', 'warning'); switchView('budget'); return; }
  const participants = members.filter((m) => m.user_id !== state.user?.id);
  if (!participants.length) { toast('Нет других участников для разделения', 'warning'); return; }
  const amountInput = el('input', { class: 'input', type: 'number', min: '0.01', step: '0.01', required: true, placeholder: `Сумма (${currencySymbol()})` });
  const catSelect = el('select', { class: 'input', required: true }, cats.map((c) => el('option', { value: c.id }, [c.name])));
  const dateInput = el('input', { class: 'input', type: 'datetime-local', value: toLocalInput(new Date().toISOString()), required: true });
  const descInput = el('input', { class: 'input', type: 'text', maxlength: 255, placeholder: 'Описание' });
  const checkboxList = el('div', { class: 'list' }, participants.map((m) => el('label', { class: 'item', style: 'cursor:pointer;' }, [
    el('input', { type: 'checkbox', value: m.user_id, class: 'split-participant', style: 'width:auto;' }),
    el('div', { class: 'avatar-sm', style: `background:${colorFromId(m.user_id)}` }, [initials(m.full_name)]),
    el('div', { class: 'item-main' }, [el('div', { class: 'item-title' }, [m.full_name || 'Участник']), el('div', { class: 'item-sub' }, [m.phone_number || shortId(m.user_id)])]),
  ])));
  openModal({
    title: 'Разделить расход',
    body: el('div', {}, [
      el('p', { class: 'text-sm text-2' }, ['Выберите участников, кроме себя. Сумма разделится поровну.']),
      field('Сумма', amountInput),
      field('Категория', catSelect),
      field('Дата', dateInput),
      field('Описание', descInput),
      el('div', { class: 'field-label mt-8' }, ['Участники']),
      checkboxList,
    ]),
    saveLabel: 'Разделить',
    onSave: async () => {
      const amount = parseFloat(amountInput.value);
      if (!amount || amount <= 0) throw new Error('Введите сумму');
      const participantIds = $$('.split-participant:checked').map((x) => x.value);
      if (!participantIds.length) throw new Error('Выберите участников');
      try {
        const res = await apiCall('POST', `/groups/${g.id}/transactions/split`, {
          category_id: catSelect.value,
          amount,
          date: fromLocalInput(dateInput.value) || new Date().toISOString(),
          description: descInput.value.trim(),
          participant_ids: participantIds,
        });
        rememberTxType(res.data?.transaction?.id, 'expense');
        toast(`Расход разделён на ${participantIds.length + 1}`, 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function normalizeDebts(raw) {
  if (!raw) return { incoming: [], outgoing: [] };
  
  // Приводим ID текущего юзера к строке для надежности
  const myId = String(state.user?.id || ''); 

  // Если бэкенд вернул массив (или объект с массивом внутри)
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw.data)) arr = raw.data;
  else if (Array.isArray(raw.debts)) arr = raw.debts;

  if (arr.length > 0 || Array.isArray(raw)) {
    const incoming = [];
    const outgoing = [];
    arr.forEach(d => {
      // Ищем ID во всех возможных полях и приводим к строке
      const debtor = String(d.debtor_id || d.debtor?.id || d.from_id || d.from || '');
      const creditor = String(d.creditor_id || d.creditor?.id || d.to_id || d.to || '');
      
      if (creditor === myId) incoming.push(d);
      else if (debtor === myId) outgoing.push(d);
    });
    return { incoming, outgoing };
  }
  
  // Если объект с готовыми ключами
  return {
    incoming: raw.incoming || raw.owed_to_me || raw.creditors || [],
    outgoing: raw.outgoing || raw.i_owe || raw.debtors || []
  };
}

function renderDebtsSection(debts, members, compact) {
  const memberMap = new Map((members || []).map((m) => [m.user_id, m]));
  const resolveName = (id, name) => name || memberMap.get(id)?.full_name || (id ? `Участник ${shortId(id)}` : '—');
  const incoming = debts?.incoming || [];
  const outgoing = debts?.outgoing || [];
  const renderList = (arr, direction) => {
    if (!arr.length) return miniEmpty(direction === 'incoming' ? 'Нет долгов вам' : 'Вы никому не должны');
    return el('div', { class: 'list' }, arr.map((d, i) => stagger(el('div', { class: 'debt-item' }, [
      el('div', { class: 'avatar-sm', style: `background:${colorFromId(direction === 'incoming' ? d.debtor_id : d.creditor_id)}` }, [initials(resolveName(direction === 'incoming' ? d.debtor_id : d.creditor_id, direction === 'incoming' ? d.debtor_name : d.creditor_name))]),
      el('div', { class: 'debt-main' }, [
        el('div', { class: 'item-title' }, [direction === 'incoming' ? resolveName(d.debtor_id, d.debtor_name) : resolveName(d.creditor_id, d.creditor_name)]),
        el('div', { class: 'item-sub' }, [fmtDate(d.created_at), d.is_paid ? ' · оплачено' : '']),
      ]),
      el('div', { class: `debt-amount ${direction === 'incoming' ? 'text-success' : 'text-danger'}` }, [fmtMoney(d.amount)]),
      direction === 'incoming' && !d.is_paid && d.creditor_id === state.user?.id
        ? el('button', { type: 'button', class: 'btn btn-primary btn-xs', onclick: async () => { try { await apiCall('POST', `/groups/${activeGroup()?.id}/debts/${d.id}/pay`); toast('Долг закрыт', 'success'); await renderActiveView(); } catch (err) { toast(err.message, 'error'); } } }, ['Получено'])
        : d.is_paid ? el('span', { class: 'tag tag-success' }, ['Закрыт']) : null,
    ].filter(Boolean)), i)));
  };
  return sectionBlock('Долги', `Вам должны: ${incoming.length} · Вы должны: ${outgoing.length}`, null, el('div', { class: 'debts-grid' }, [
    el('div', { class: 'card' }, [el('div', { class: 'card-title mb-8' }, ['Мне должны']), renderList(incoming, 'incoming')]),
    el('div', { class: 'card' }, [el('div', { class: 'card-title mb-8' }, ['Я должен']), renderList(outgoing, 'outgoing')]),
  ]), { id: compact ? 'debts-preview' : 'debts-section' });
}

/* =============================================================
VIEW: PLANS
============================================================= */
async function renderPlans(container) {
  const g = activeGroup();
  container.innerHTML = '';
  if (!g) { container.appendChild(noGroupBanner()); return; }
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
  const plans = await safeApi(apiCall('GET', `/groups/${g.id}/plans?from=${from}&to=${to}`), []);
  const toggle = el('div', { class: 'view-toggle' }, [
    el('button', { type: 'button', class: calendarState.view === 'list' ? 'active' : '', onclick: () => { calendarState.view = 'list'; renderActiveView(); } }, ['Список']),
    el('button', { type: 'button', class: calendarState.view === 'calendar' ? 'active' : '', onclick: () => { calendarState.view = 'calendar'; renderActiveView(); } }, ['Календарь']),
  ]);
  container.appendChild(sectionHead('События', `${plans.length} ${plural(plans.length, 'событие', 'события', 'событий')}`, el('div', { class: 'row', style: 'gap:8px;' }, [
    toggle,
    el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => openCreatePlanModal(g) }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Событие'])]),
  ])));
  if (calendarState.view === 'calendar') {
    const calFrom = new Date(calendarState.year, calendarState.month - 1, 1).toISOString();
    const calTo = new Date(calendarState.year, calendarState.month + 2, 0).toISOString();
    const calPlans = await safeApi(apiCall('GET', `/groups/${g.id}/plans?from=${calFrom}&to=${calTo}`), []);
    container.appendChild(renderCalendar(g, calPlans));
    return;
  }
  if (!plans.length) { container.appendChild(emptyState('calendar', 'Пока нет планов', 'Создайте первое событие — пикник, поездку, вечеринку')); return; }
  const grid = el('div', { class: 'grid-auto' });
  const cards = await Promise.all(plans.map((p) => renderPlanCard(g, p)));
  cards.forEach((card, i) => grid.appendChild(stagger(card, i)));
  container.appendChild(grid);
}

async function renderPlanCard(g, p) {
  const [items, rsvpRaw, commentsRaw] = await Promise.all([
    safeApi(apiCall('GET', `/groups/${g.id}/plans/${p.id}/checklist`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/plans/${p.id}/rsvp`), []),
    safeApi(apiCall('GET', `/groups/${g.id}/plans/${p.id}/comments`), []),
  ]);
  const done = items.filter((i) => i.is_checked ?? i.checked).length;
  const pct = items.length ? (done / items.length) * 100 : 0;
  const rsvps = normalizeRsvp(rsvpRaw);
  const comments = normalizeComments(commentsRaw);
  const card = el('div', { class: 'card' + (p.is_done ? ' is-done' : '') });
  card.appendChild(el('div', { class: 'card-head' }, [
    el('div', { class: 'row', style: 'gap:10px;' }, [
      progressRing(pct),
      el('div', {}, [
        el('div', { class: 'card-title' }, [p.title, p.recurrence_rule ? el('span', { class: 'tag tag-primary recurrence-tag' }, [recurrenceLabel(p.recurrence_rule)]) : null]),
        el('div', { class: 'card-subtitle' }, [`${fmtDateTime(p.event_date)} · ${fmtRelative(p.event_date)}`]),
      ]),
    ]),
    el('div', { class: 'item-actions' }, [
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Редактировать', onclick: () => openEditPlanModal(g, p) }, [icon('edit', 18)]),
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': p.is_done ? 'Вернуть в активные' : 'Отметить выполненным', onclick: () => togglePlan(g, p) }, [icon(p.is_done ? 'clock' : 'check', 18)]),
      el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Удалить', onclick: () => confirmDelete('Удалить событие?', async () => { try { await apiCall('DELETE', `/groups/${g.id}/plans/${p.id}`); toast('Удалено', 'success'); await renderActiveView(); } catch (err) { toast(err.message, 'error'); } }) }, [icon('trash', 18)]),
    ]),
  ]));
  if (p.description) card.appendChild(el('div', { class: 'text-sm text-2', style: 'margin-bottom:8px;' }, [p.description]));
  card.appendChild(renderRsvpRow(g, p, rsvps));
  card.appendChild(renderCommentsSection(g, p, comments));
  if (items.length) {
    card.appendChild(el('div', { class: 'text-xs text-3 mt-8' }, [`${done} / ${items.length} пунктов`]));
    const list = el('div', { class: 'list mt-12' });
    items.forEach((it, i) => {
      const isChecked = !!(it.is_checked ?? it.checked);
      const check = el('button', { type: 'button', class: 'check' + (isChecked ? ' on' : ''), 'aria-label': isChecked ? 'Отменить выполнение' : 'Отметить выполненным', onclick: () => toggleChecklistItem(g, it, check) });
      list.appendChild(stagger(el('div', { class: 'item' + (isChecked ? ' is-done' : '') }, [
        check,
        el('div', { class: 'item-main' }, [el('div', { class: 'item-title', style: 'font-size:13px;font-weight:650;' }, [it.text])]),
        el('button', { type: 'button', class: 'icon-btn sm', 'data-tip': 'Удалить', onclick: async () => { try { await apiCall('DELETE', `/groups/${g.id}/checklist/${it.id}`); toast('Удалено', 'success'); await renderActiveView(); } catch (err) { toast(err.message, 'error'); } } }, [icon('trash', 18)]),
      ]), i));
    });
    card.appendChild(list);
  }
  card.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-block mt-12', onclick: () => openCreateChecklistModal(g, p) }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Пункт'])]));
  return card;
}

function normalizeRsvp(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((x) => ({ userId: x.UserID || x.user_id, status: x.Status || x.status || 'maybe' }));
}
function normalizeComments(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((x) => ({ id: x.ID || x.id, userId: x.UserID || x.user_id, fullName: x.FullName || x.full_name || 'Участник', text: x.Text || x.text, createdAt: x.CreatedAt || x.created_at }));
}
function recurrenceLabel(rule) {
  return { daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно' }[rule] || rule;
}

function renderRsvpRow(g, p, rsvps) {
  const counts = { going: 0, maybe: 0, not_going: 0 };
  rsvps.forEach((r) => { if (counts[r.status] != null) counts[r.status]++; });
  const mine = rsvps.find((r) => r.userId === state.user?.id)?.status || '';
  const btn = (status, label, cls) => el('button', { type: 'button', class: `rsvp-btn ${mine === status ? cls : ''}`, onclick: () => setPlanRsvp(g, p, status) }, [`${label} ${counts[status] || 0}`]);
  return el('div', { class: 'rsvp-row' }, [
    btn('going', 'Иду', 'active-going'),
    btn('maybe', 'Возможно', 'active-maybe'),
    btn('not_going', 'Не иду', 'active-not'),
  ]);
}

async function setPlanRsvp(g, p, status) {
  try {
    await apiCall('POST', `/groups/${g.id}/plans/${p.id}/rsvp`, { status });
    await renderActiveView();
  } catch (err) { toast(err.message, 'error'); }
}

function renderCommentsSection(g, p, comments) {
  const list = el('div', { class: 'comment-list' }, comments.slice(-10).reverse().map((c) => el('div', { class: 'comment-item' }, [
    el('div', { class: 'comment-meta' }, [el('strong', {}, [c.fullName]), el('span', {}, [fmtRelative(c.createdAt)])]),
    el('div', { class: 'comment-text' }, [c.text]),
  ])));
  if (!comments.length) list.appendChild(miniEmpty('Комментариев пока нет'));
  const input = el('input', { class: 'input', type: 'text', maxlength: 500, placeholder: 'Написать комментарий...' });
  const form = el('form', { class: 'comment-form', onsubmit: async (e) => { e.preventDefault(); const text = input.value.trim(); if (!text) return; try { await apiCall('POST', `/groups/${g.id}/plans/${p.id}/comments`, { text }); input.value = ''; await renderActiveView(); } catch (err) { toast(err.message, 'error'); } } }, [input, el('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, [icon('send', 18)])]);
  return el('div', { class: 'mt-12' }, [el('div', { class: 'text-xs text-3' }, ['Обсуждение']), list, form]);
}

async function togglePlan(g, p) {
  const next = !p.is_done;
  try {
    await apiCall('PATCH', `/groups/${g.id}/plans/${p.id}`, { title: p.title, description: p.description || '', event_date: p.event_date, is_done: next, version: Number(p.version ?? 0) });
    toast(next ? 'Событие выполнено' : 'Событие возвращено в планы', 'success');
    await renderActiveView();
  } catch (err) { toast(err.message, 'error'); }
}

async function toggleChecklistItem(g, item, checkNode) {
  const current = !!(item.is_checked ?? item.checked);
  const next = !current;
  item.is_checked = next;
  item.checked = next;
  checkNode.classList.toggle('on', next);
  try {
    await apiCall('PATCH', `/groups/${g.id}/checklist/${item.id}`, { text: item.text, is_checked: next, version: Number(item.version ?? 0) });
    await renderActiveView();
  } catch (err) {
    item.is_checked = current;
    item.checked = current;
    checkNode.classList.toggle('on', current);
    toast(err.message, 'error');
  }
}

function openCreatePlanModal(g, presetDate = null) {
  const title = el('input', { class: 'input', name: 'title', required: true, maxlength: 200, placeholder: 'Пикник в парке' });
  const description = el('textarea', { class: 'input', name: 'description', placeholder: 'Необязательно' });
  const eventDate = el('input', { class: 'input', name: 'event_date', type: 'datetime-local', value: presetDate ? toLocalInput(new Date(presetDate.getFullYear(), presetDate.getMonth(), presetDate.getDate(), 12, 0).toISOString()) : toLocalInput(new Date().toISOString()), required: true });
  const rule = el('select', { class: 'input', name: 'recurrence_rule' }, [el('option', { value: '' }, ['Без повтора']), el('option', { value: 'daily' }, ['Ежедневно']), el('option', { value: 'weekly' }, ['Еженедельно']), el('option', { value: 'monthly' }, ['Ежемесячно'])]);
  const until = el('input', { class: 'input', name: 'recurrence_until', type: 'date' });
  openModal({
    title: 'Новое событие',
    body: el('div', {}, [field('Название', title), field('Описание', description), field('Дата и время', eventDate), field('Повтор', rule), field('Повторять до (необязательно)', until)]),
    onSave: async () => {
      try {
        await apiCall('POST', `/groups/${g.id}/plans`, {
          title: title.value.trim(),
          description: description.value.trim(),
          event_date: fromLocalInput(eventDate.value),
          recurrence_rule: rule.value || null,
          recurrence_until: rule.value ? dateToEndISO(until.value) : null,
        });
        toast('Создано', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openEditPlanModal(g, plan) {
  const title = el('input', { class: 'input', name: 'title', required: true, maxlength: 200, value: plan.title });
  const description = el('textarea', { class: 'input', name: 'description' }, [plan.description || '']);
  const eventDate = el('input', { class: 'input', name: 'event_date', type: 'datetime-local', value: toLocalInput(plan.event_date), required: true });
  openModal({
    title: 'Редактировать событие',
    body: el('div', {}, [field('Название', title), field('Описание', description), field('Дата и время', eventDate)]),
    onSave: async () => {
      try {
        await apiCall('PATCH', `/groups/${g.id}/plans/${plan.id}`, { title: title.value.trim(), description: description.value.trim(), event_date: fromLocalInput(eventDate.value), is_done: !!plan.is_done, version: Number(plan.version ?? 0) });
        toast('Обновлено', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openCreateChecklistModal(g, p) {
  const text = el('input', { class: 'input', name: 'text', required: true, maxlength: 500, placeholder: 'Взять плед' });
  openModal({
    title: 'Новый пункт',
    body: field('Текст', text),
    onSave: async () => {
      try {
        await apiCall('POST', `/groups/${g.id}/plans/${p.id}/checklist`, { text: text.value.trim() });
        toast('Добавлено', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

/* =============================================================
VIEW: PROFILE
============================================================= */
async function renderProfile(container) {
  const me = await apiCall('GET', '/users/me');
  state.user = me.data;
  renderTopbarUser();
  renderSidebarUser();
  container.innerHTML = '';
  const u = state.user;
  const wrap = el('div', { style: 'max-width:680px;' });
  wrap.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'row', style: 'gap:14px;margin-bottom:18px;' }, [
      el('div', { class: 'avatar', style: 'width:58px;height:58px;font-size:18px;border-radius:20px;' }, [initials(u.full_name)]),
      el('div', {}, [
        el('div', { style: 'font-size:16px;font-weight:850;' }, [u.full_name || '—']),
        el('div', { class: 'text-sm text-3' }, [u.phone_number || '—']),
      ]),
    ]),
    el('form', { class: 'form', onsubmit: async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const res = await apiCall('PATCH', '/users/me', {
          full_name: String(fd.get('full_name') || '').trim(),
          age: Number(fd.get('age')),
          phone_number: String(fd.get('phone_number') || '').trim(),
          currency: String(fd.get('currency') || 'RUB').trim(),
          version: Number(u.version ?? 0),
        });
        state.user = res.data;
        toast('Профиль обновлён', 'success');
        renderShell();
        await renderProfile(container);
      } catch (err) { toast(err.message, 'error'); }
    } }, [
      field('Имя', el('input', { class: 'input', name: 'full_name', value: u.full_name || '', required: true, minlength: 3, maxlength: 100 })),
      field('Возраст', el('input', { class: 'input', name: 'age', type: 'number', value: u.age ?? '', min: 18, max: 100, required: true })),
      field('Телефон', el('input', { class: 'input', name: 'phone_number', type: 'tel', value: u.phone_number || '', required: true })),
      field('Валюта', el('select', { class: 'input', name: 'currency' }, [
        el('option', { value: 'RUB', selected: (u.currency || 'RUB') === 'RUB' }, ['₽ Рубль']),
        el('option', { value: 'USD', selected: u.currency === 'USD' }, ['$ Доллар']),
        el('option', { value: 'EUR', selected: u.currency === 'EUR' }, ['€ Евро']),
        el('option', { value: 'KZT', selected: u.currency === 'KZT' }, ['₸ Тенге']),
        el('option', { value: 'BYN', selected: u.currency === 'BYN' }, ['Br Белорусский рубль']),
      ])),
      el('button', { type: 'submit', class: 'btn btn-primary btn-block mt-8' }, ['Сохранить']),
    ]),
    el('div', { class: 'text-xs text-3 mt-16' }, [`Создан: ${fmtDate(u.created_at)}${u.version != null ? ` · версия ${u.version}` : ''}`]),
  ]));
  if (state.groups.length) {
    wrap.appendChild(el('div', { class: 'card mt-16' }, [
      sectionHead('Мои группы', `${state.groups.length} ${plural(state.groups.length, 'группа', 'группы', 'групп')}`),
      el('div', { class: 'list' }, state.groups.map((g, i) => stagger(el('button', { type: 'button', class: 'item', onclick: () => switchGroup(g.id) }, [
        el('div', { class: 'avatar-sm', style: `background:${colorFromId(g.id)}` }, [initials(g.name)]),
        el('div', { class: 'item-main' }, [
          el('div', { class: 'item-title' }, [g.name]),
          el('div', { class: 'item-sub' }, [isPersonalGroup(g) ? 'Личное пространство' : `ID: ${shortId(g.id)}`]),
        ]),
        g.id === state.activeGroupId ? el('span', { class: 'tag tag-primary' }, ['активна']) : null,
      ].filter(Boolean)), i))),
    ]));
  }
  wrap.appendChild(el('div', { class: 'card mt-16' }, [
    el('div', { class: 'card-title' }, ['Аккаунт и безопасность']),
    el('div', { class: 'text-sm text-3 mt-8' }, ['Управление паролем, Telegram-уведомлениями и опасные действия.']),
    el('button', { type: 'button', class: 'btn btn-ghost btn-block mt-12', onclick: openChangePasswordModal }, [el('span', { 'data-icon': 'key', 'data-size': 'sm' }), el('span', {}, ['Сменить пароль'])]),
    el('button', { type: 'button', class: 'btn btn-ghost btn-block mt-8', onclick: openTelegramLinkModal }, [el('span', { 'data-icon': 'send', 'data-size': 'sm' }), el('span', {}, ['Привязать Telegram'])]),
    el('button', { type: 'button', class: 'btn btn-danger-ghost btn-block mt-8', onclick: () => confirmDelete('Отвязать Telegram?', async () => { try { await apiCall('DELETE', '/users/me/telegram'); toast('Telegram отвязан', 'success'); } catch (err) { toast(err.message, 'error'); } }) }, [el('span', { 'data-icon': 'x', 'data-size': 'sm' }), el('span', {}, ['Отвязать Telegram'])]),
    el('button', { type: 'button', class: 'btn btn-ghost btn-block mt-8', onclick: () => startOnboardingTour(true) }, [el('span', { 'data-icon': 'sparkles', 'data-size': 'sm' }), el('span', {}, ['Пройти тур заново'])]),
    el('div', { class: 'card-title mt-16', style: 'color: var(--danger);' }, ['Опасная зона']),
    el('button', { type: 'button', class: 'btn btn-danger btn-block mt-12', onclick: openDeleteAccountModal }, [el('span', { 'data-icon': 'trash', 'data-size': 'sm' }), el('span', {}, ['Удалить аккаунт'])]),
    el('button', { type: 'button', class: 'btn btn-ghost btn-block mt-8', onclick: logout }, [el('span', { 'data-icon': 'logout', 'data-size': 'sm' }), el('span', {}, ['Выйти из аккаунта'])]),
  ]));
  container.appendChild(wrap);
}

function openChangePasswordModal() {
  const oldPwd = el('input', { class: 'input', type: 'password', placeholder: 'Текущий пароль' });
  const newPwd = el('input', { class: 'input', type: 'password', placeholder: 'Новый пароль (мин. 8 символов)' });
  openModal({
    title: 'Смена пароля',
    body: el('div', {}, [el('p', { class: 'text-sm text-2', style: 'margin-bottom:12px;' }, ['Введите старый и новый пароль.']), field('Текущий пароль', oldPwd), field('Новый пароль', newPwd)]),
    saveLabel: 'Сохранить',
    onSave: async () => {
      if (!oldPwd.value || !newPwd.value) throw new Error('Заполните все поля');
      try { await apiCall('PATCH', '/users/me/password', { old_password: oldPwd.value, new_password: newPwd.value }); toast('Пароль успешно изменён', 'success'); }
      catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

async function openTelegramLinkModal() {
  try {
    const res = await apiCall('POST', '/users/me/telegram/link');
    const data = res.data || {};
    openModal({
      title: 'Привязка Telegram',
      body: el('div', {}, [
        el('p', { class: 'text-sm text-2' }, [data.instruction || 'Откройте Telegram-бота и отправьте код.']),
        field('Код', el('input', { class: 'copy-input', type: 'text', value: data.code || '', readonly: true, onclick: (e) => e.target.select() })),
        el('div', { class: 'row gap-8 mt-12' }, [
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => copyText(data.code || '', 'Код скопирован') }, [icon('copy', 18), el('span', {}, ['Копировать'])]),
          el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => window.open(`https://t.me/zunno_notify_bot?start=${encodeURIComponent(data.code || '')}`, '_blank') }, [icon('send', 18), el('span', {}, ['Открыть бота'])]),
        ]),
        data.expires_at ? el('div', { class: 'text-xs text-3 mt-8' }, [`Код действует до ${fmtDateTime(data.expires_at)}`]) : null,
      ].filter(Boolean)),
      saveLabel: 'Готово',
      onSave: async () => {},
    });
  } catch (err) { toast(err.message, 'error'); }
}

function openDeleteAccountModal() {
  const password = el('input', { class: 'input', name: 'password', type: 'password', required: true });
  openModal({
    title: 'Удалить аккаунт?',
    body: el('div', {}, [el('p', { class: 'text-2 text-sm' }, ['Это действие необратимо. Введите пароль для подтверждения.']), field('Пароль', password)]),
    saveLabel: 'Удалить навсегда',
    danger: true,
    onSave: async () => {
      try { await apiCall('DELETE', '/users/me', { password: password.value }); toast('Аккаунт удалён', 'success'); logout(); }
      catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

/* =============================================================
MODAL
============================================================= */
function openModal({ title, body, onSave, saveLabel = 'Сохранить', danger = false }) {
  const root = $('#modal-root');
  if (!root) return;
  closeModal();
  ui.modalPrevFocus = document.activeElement;
  const backdrop = el('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === backdrop) closeModal(); } });
  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  modal.appendChild(el('div', { class: 'modal-title' }, [title]));
  const form = el('form', { class: 'modal-body', novalidate: true });
  appendContent(form, body);
  const submit = el('button', { type: 'submit', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}` }, [saveLabel]);
  form.appendChild(el('div', { class: 'modal-actions' }, [
    el('button', { type: 'button', class: 'btn btn-ghost', onclick: closeModal }, ['Отмена']),
    submit,
  ]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = '…';
    try { await onSave(new FormData(form)); closeModal(); }
    catch (err) { toast(err.message || 'Ошибка', 'error'); }
    finally { submit.disabled = false; submit.textContent = oldLabel; }
  });
  modal.appendChild(form);
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])', modal).filter((node) => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  backdrop.appendChild(modal);
  root.appendChild(backdrop);
  hydrateIcons(modal);
  const first = modal.querySelector('input, select, textarea, button');
  if (first) setTimeout(() => first.focus(), 80);
}

function closeModal() {
  const root = $('#modal-root');
  if (!root) return;
  root.innerHTML = '';
  if (ui.modalPrevFocus && ui.modalPrevFocus.isConnected) ui.modalPrevFocus.focus();
  ui.modalPrevFocus = null;
}

function confirmDelete(message, onConfirm, confirmLabel = 'Удалить') {
  openModal({ title: 'Подтверждение', body: el('div', { class: 'confirm-text' }, [message]), saveLabel: confirmLabel, danger: true, onSave: async () => { await onConfirm(); } });
}

/* =============================================================
UNDO DELETE
============================================================= */
function deleteWithUndo({ label, onConfirm, onCancel }) {
  const root = $('#toasts');
  if (!root) { onConfirm(); return; }
  let timer;
  const node = el('div', { class: 'toast toast-warning', role: 'status' }, [
    el('div', { class: 'toast-ico' }, [icon('alert', 16)]),
    el('div', { class: 'toast-msg', style: 'flex:1;' }, [`${label} удалено`]),
    el('button', { type: 'button', class: 'btn btn-xs', style: 'background:transparent;border:1px solid currentColor;color:inherit;padding:4px 8px;font-size:11px;border-radius:8px;margin-left:4px;', onclick: () => { clearTimeout(timer); node.classList.add('hide'); setTimeout(() => node.remove(), 240); onCancel?.(); toast('Отменено', 'info', 1500); } }, ['Отменить']),
  ]);
  root.appendChild(node);
  timer = setTimeout(() => { node.classList.add('hide'); setTimeout(() => node.remove(), 240); onConfirm(); }, 5000);
}

/* =============================================================
GROUP MODALS
============================================================= */
function openCreateGroupModal() {
  const name = el('input', { class: 'input', name: 'name', required: true, maxlength: 100, placeholder: 'Например, Семья' });
  openModal({
    title: 'Новая группа',
    body: field('Название', name),
    onSave: async () => {
      try {
        const res = await apiCall('POST', '/groups', { name: name.value.trim() });
        state.groups.push(res.data);
        state.activeGroupId = res.data.id;
        localStorage.setItem('active_group', res.data.id);
        renderShell();
        await renderActiveView();
        toast('Группа создана', 'success');
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openJoinGroupModal() {
  const groupId = el('input', { class: 'copy-input', name: 'group_id', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' });
  openModal({
    title: 'Присоединиться по ID',
    body: el('div', {}, [el('p', { class: 'text-2 text-sm' }, ['Введите ID группы, который вам прислал администратор.']), field('Group ID', groupId)]),
    saveLabel: 'Присоединиться',
    onSave: async () => {
      const gid = groupId.value.trim();
      try { await apiCall('POST', `/groups/${gid}/join`); toast('Вы присоединились', 'success'); await bootstrapApp(); }
      catch (err) { toast(err.message, 'error'); throw err; }
    },
  });
}

function openInviteModal(g) {
  const phone = el('input', { class: 'input', type: 'tel', placeholder: '+79991234567', inputmode: 'tel' });
  openModal({
    title: 'Пригласить в группу',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, ['Введите телефон пользователя. Если он зарегистрирован, получит приглашение.']),
      field('Телефон', phone),
      el('div', { class: 'row gap-8 mt-12' }, [
        el('input', { class: 'copy-input flex-1', type: 'text', value: g.id, readonly: true, onclick: (e) => e.target.select() }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => copyText(g.id, 'ID группы скопирован') }, [icon('copy', 18)]),
      ]),
      el('p', { class: 'text-xs text-3 mt-8' }, ['Альтернатива: отправьте другу ID группы, он нажмёт «Присоединиться».']),
    ]),
    saveLabel: 'Отправить приглашение',
    onSave: async () => {
      const value = phone.value.replace(/\s+/g, '').trim();
      if (!value) throw new Error('Введите телефон');
      try { await apiCall('POST', `/groups/${g.id}/invite`, { phone_number: value }); toast('Приглашение отправлено', 'success'); }
      catch (err) { if (err.status === 404) throw new Error('Пользователь с таким телефоном не найден'); throw err; }
    },
  });
}

/* =============================================================
COMMAND PALETTE
============================================================= */
function getCommands() {
  const cmds = [];
  const g = activeGroup();
  for (const [key, view] of Object.entries(VIEWS)) cmds.push({ id: `view-${key}`, title: view.title, hint: 'Раздел', icon: view.icon, run: () => switchView(key) });
  for (const group of state.groups) cmds.push({ id: `group-${group.id}`, title: group.name, hint: 'Группа', icon: 'users', run: () => switchGroup(group.id) });
  cmds.push({ id: 'action-create-group', title: 'Создать группу', hint: 'Действие', icon: 'plus', run: openCreateGroupModal });
  cmds.push({ id: 'action-join-group', title: 'Присоединиться по ID', hint: 'Действие', icon: 'login', run: openJoinGroupModal });
  if (g) {
    cmds.push(
      { id: 'action-expense', title: 'Добавить расход', hint: 'Действие', icon: 'arrowDownCircle', run: () => openTransactionModal(g, 'expense') },
      { id: 'action-income', title: 'Добавить доход', hint: 'Действие', icon: 'arrowUpCircle', run: () => openTransactionModal(g, 'income') },
      { id: 'action-split', title: 'Разделить расход', hint: 'Действие', icon: 'split', run: async () => { const cats = await safeApi(apiCall('GET', `/groups/${g.id}/categories`), []); const members = await safeApi(apiCall('GET', `/groups/${g.id}/members`), []); openSplitTransactionModal(g, cats, members); } },
      { id: 'action-plan', title: 'Создать событие', hint: 'Действие', icon: 'calendarPlus', run: () => openCreatePlanModal(g) },
      { id: 'action-goal', title: 'Создать категорию целей', hint: 'Действие', icon: 'target', run: () => openCreateGoalCategoryModal(g) },
      { id: 'action-credit', title: 'Создать кредит', hint: 'Кредиты', icon: 'coins', run: () => openCreateCreditModal(g) },
      { id: 'action-invite', title: 'Пригласить в группу', hint: 'Действие', icon: 'invite', run: () => openInviteModal(g) },
      { id: 'action-copy-group-id', title: 'Скопировать ID группы', hint: 'Действие', icon: 'copy', run: () => copyText(g.id, 'ID группы скопирован') },
      { id: 'action-debts', title: 'Открыть долги', hint: 'Бюджет', icon: 'coins', run: () => { switchView('budget'); setTimeout(() => $('#debts-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); } }
    );
  }
  cmds.push({ id: 'action-toggle-theme', title: 'Переключить тему', hint: 'Интерфейс', icon: THEME_META[document.documentElement.dataset.theme || 'dark'].icon, run: cycleTheme });
  if (state.user) cmds.push({ id: 'action-logout', title: 'Выйти из аккаунта', hint: 'Аккаунт', icon: 'logout', run: logout });
  return cmds;
}

function openCommandPalette() {
  if (ui.command.open) return;
  ui.command.open = true;
  const root = $('#command-palette');
  const input = $('#command-input');
  root?.classList.remove('hidden');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 30); }
  renderCommands('');
}

function closeCommandPalette() {
  if (!ui.command.open) return;
  ui.command.open = false;
  $('#command-palette')?.classList.add('hidden');
}

function renderCommands(query = '') {
  const list = $('#command-list');
  if (!list) return;
  const all = getCommands();
  const q = query.trim().toLowerCase();
  ui.command.filtered = q ? all.filter((cmd) => `${cmd.title} ${cmd.hint}`.toLowerCase().includes(q)) : all;
  if (ui.command.selected >= ui.command.filtered.length) ui.command.selected = Math.max(0, ui.command.filtered.length - 1);
  list.innerHTML = '';
  if (!ui.command.filtered.length) { list.appendChild(el('div', { class: 'cmdk-empty' }, ['Ничего не найдено'])); return; }
  ui.command.filtered.forEach((cmd, index) => {
    const item = el('button', {
      type: 'button',
      class: 'cmdk-item' + (index === ui.command.selected ? ' is-selected' : ''),
      onclick: () => { closeCommandPalette(); cmd.run(); },
      onmouseenter: () => { ui.command.selected = index; updateCommandSelection(); },
    }, [
      el('span', { class: 'cmdk-item-icon' }, [icon(cmd.icon || 'info', 18)]),
      el('span', { class: 'cmdk-item-main' }, [
        el('span', { class: 'cmdk-item-title' }, [cmd.title]),
        el('span', { class: 'cmdk-item-hint' }, [cmd.hint || '']),
      ]),
    ]);
    list.appendChild(item);
  });
}

function updateCommandSelection() {
  const items = $$('#command-list .cmdk-item');
  items.forEach((node, index) => node.classList.toggle('is-selected', index === ui.command.selected));
  items[ui.command.selected]?.scrollIntoView({ block: 'nearest' });
}

function moveCommandSelection(delta) {
  if (!ui.command.filtered.length) return;
  ui.command.selected = (ui.command.selected + delta + ui.command.filtered.length) % ui.command.filtered.length;
  updateCommandSelection();
}

function initCommandPalette() {
  $('#command-btn')?.addEventListener('click', () => { ui.command.open ? closeCommandPalette() : openCommandPalette(); });
  $('#command-input')?.addEventListener('input', (e) => { ui.command.selected = 0; renderCommands(e.target.value); });
  $('#command-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCommandSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCommandSelection(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); const cmd = ui.command.filtered[ui.command.selected]; if (cmd) { closeCommandPalette(); cmd.run(); } }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCommandPalette(); }
  });
  $('#command-palette')?.addEventListener('click', (e) => { if (e.target.id === 'command-palette') closeCommandPalette(); });
}

/* =============================================================
RIPPLE
============================================================= */
function initRipple() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn,.icon-btn,.nav-item,.mobile-nav-item,.popover-action,.popover-item,.fab-item,.fab-main,.preset-btn,.cmdk-item,.chip,.theme-option,.rsvp-btn');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const span = el('span', { class: 'ripple' });
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.left = `${e.clientX - rect.left - size / 2}px`;
    span.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 600);
  });
}

/* =============================================================
GLOBAL KEYS
============================================================= */
function initGlobalKeys() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const appVisible = !$('#screen-app')?.classList.contains('hidden');
      if (!appVisible) return;
      ui.command.open ? closeCommandPalette() : openCommandPalette();
      return;
    }
    if (e.key === 'Escape') {
      if (ui.command.open) { closeCommandPalette(); return; }
      if ($('#modal-root')?.children.length) { closeModal(); return; }
      if (ui.popover) { closePopover(); return; }
      if (ui.fabOpen) closeFab();
    }
  });
}

/* =============================================================
INIT
============================================================= */
function initApp() {
  hydrateIcons();
  initTooltip();
  initRipple();
  initAuthScreen();
  initSidebar();
  initTopbar();
  initFab();
  initCommandPalette();
  initGlobalKeys();
  $$('.nav-item').forEach((n) => n.addEventListener('click', () => switchView(n.dataset.view)));
  $$('.mobile-nav-item').forEach((n) => n.addEventListener('click', () => switchView(n.dataset.view)));
  $$('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', cycleTheme));
}

async function main() {
  applyTheme(localStorage.getItem('zunno-theme') || getPreferredTheme());
  initApp();
  if (state.token) {
    try { await bootstrapApp(); } catch { showScreen('auth'); }
  } else {
    showScreen('auth');
  }
  setBusy(false);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

main();
/* =============================================================
CREDIT DETAIL
============================================================= */
let creditDetailState = {
  overlay: null,
  data: null,
  activeTab: 'schedule',
  creditId: null,
  groupId: null,
};

async function openCreditDetail(g, creditId) {
  closeCreditDetail();

  creditDetailState.creditId = creditId;
  creditDetailState.groupId = g.id;
  creditDetailState.activeTab = 'schedule';

  // Overlay
  const overlay = el('div', { class: 'credit-detail-overlay', role: 'dialog', 'aria-modal': 'true' });
  const header = el('div', { class: 'credit-detail-header' }, [
    el('button', {
      type: 'button',
      class: 'icon-btn sm',
      'data-tip': 'Назад',
      onclick: closeCreditDetail,
    }, [icon('chevronLeft', 20)]),
    el('div', { class: 'credit-detail-title', id: 'credit-detail-title' }, ['Загрузка…']),
    el('div', { style: 'width:36px;flex-shrink:0;' }), // балансир
  ]);
  const body = el('div', { class: 'credit-detail-body' }, [
    el('div', { class: 'credit-detail-inner', id: 'credit-detail-inner' }, [
      el('div', { class: 'skeleton skeleton-hero' }),
      el('div', { class: 'skeleton-grid' }, [
        el('div', { class: 'skeleton skeleton-stat' }),
        el('div', { class: 'skeleton skeleton-stat' }),
        el('div', { class: 'skeleton skeleton-stat' }),
      ]),
    ]),
  ]);

  overlay.appendChild(header);
  overlay.appendChild(body);
  document.body.appendChild(overlay);
  creditDetailState.overlay = overlay;
  hydrateIcons(overlay);

  // Esc закрывает
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeCreditDetail();
    }
  };
  document.addEventListener('keydown', escHandler);
  overlay._escHandler = escHandler;

  // Загружаем данные
  try {
    const res = await apiCall('GET', `/groups/${g.id}/credits/${creditId}`);
    creditDetailState.data = res.data;
    renderCreditDetailInner(g);
  } catch (err) {
    toast(err.message || 'Не удалось загрузить кредит', 'error');
    closeCreditDetail();
  }
}

function closeCreditDetail() {
  if (creditDetailState.overlay) {
    if (creditDetailState.overlay._escHandler) {
      document.removeEventListener('keydown', creditDetailState.overlay._escHandler);
    }
    creditDetailState.overlay.remove();
  }
  creditDetailState = {
    overlay: null,
    data: null,
    activeTab: 'schedule',
    creditId: null,
    groupId: null,
  };
}

function renderCreditDetailInner(g) {
  const data = creditDetailState.data;
  if (!data) return;
  const c = data.credit;
  const s = data.summary;

  const titleEl = document.getElementById('credit-detail-title');
  if (titleEl) titleEl.textContent = c.name;

  const inner = document.getElementById('credit-detail-inner');
  if (!inner) return;
  inner.innerHTML = '';

  // 1. Hero-карточка с прогрессом
  inner.appendChild(
    el('div', { class: 'card hero-card mb-16' }, [
      el('div', { class: 'hero-bg' }),
      el('div', { class: 'hero-content' }, [
        el('div', { class: 'row', style: 'gap:14px;' }, [
          progressRing(Math.min(100, s.progress_percent || 0), 64, 6),
          el('div', { style: 'flex:1;min-width:0;' }, [
            el('div', { style: 'font-size:18px;font-weight:900;' }, [c.name]),
            el('div', { class: 'text-2 text-sm mt-8' }, [
              c.is_closed ? 'Погашен' : `Ставка ${(c.annual_rate || 0).toFixed(2)}% · ${c.term_months} мес`,
            ]),
          ]),
        ]),
        el('div', { class: 'credit-summary-grid mt-16' }, [
          el('div', { class: 'credit-summary-tile' }, [
            el('div', { class: 'stat-label' }, ['Платёж в месяц']),
            el('div', { class: 'credit-stat-value primary' }, [fmtMoney(s.monthly_payment || 0)]),
          ]),
          el('div', { class: 'credit-summary-tile' }, [
            el('div', { class: 'stat-label' }, ['Осталось']),
            el('div', { class: 'credit-stat-value ' + (s.remaining_principal > 0 ? 'danger' : 'success') }, [
              fmtMoney(s.remaining_principal || 0),
            ]),
          ]),
          el('div', { class: 'credit-summary-tile' }, [
            el('div', { class: 'stat-label' }, ['Выплачено']),
            el('div', { class: 'credit-stat-value success' }, [fmtMoney(s.paid_principal || 0)]),
          ]),
          el('div', { class: 'credit-summary-tile' }, [
            el('div', { class: 'stat-label' }, ['Переплата']),
            el('div', { class: 'credit-stat-value warning' }, [fmtMoney(s.total_overpayment || 0)]),
          ]),
        ]),
      ]),
    ])
  );

  // 2. Действия
  if (!c.is_closed) {
    inner.appendChild(
      el('div', { class: 'row gap-8 mb-16', style: 'flex-wrap:wrap;' }, [
        el('button', {
          type: 'button',
          class: 'btn btn-primary',
          onclick: () => openCreditPayModal(g, c, s, false, () => reloadCreditDetail(g)),
        }, [icon('check', 18), el('span', {}, ['Оплатить'])]),
        el('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onclick: () => openCreditPayModal(g, c, s, true, () => reloadCreditDetail(g)),
        }, [icon('trendUp', 18), el('span', {}, ['Досрочное погашение'])]),
      ])
    );
  }

  // 3. Табы
  const tabs = [
    { id: 'schedule', label: 'График' },
    { id: 'payments', label: `История (${(data.payments || []).length})` },
    { id: 'info', label: 'Инфо' },
  ];

  inner.appendChild(
    el('div', { class: 'credit-tabs' }, tabs.map((t) =>
      el('button', {
        type: 'button',
        class: 'credit-tab' + (creditDetailState.activeTab === t.id ? ' is-active' : ''),
        onclick: () => {
          creditDetailState.activeTab = t.id;
          renderCreditDetailInner(g);
        },
      }, [t.label])
    ))
  );

  // 4. Содержимое активного таба
  const tabContent = el('div', { class: 'credit-tab-content' });
  inner.appendChild(tabContent);

  if (creditDetailState.activeTab === 'schedule') {
    tabContent.appendChild(renderScheduleTab(g, c, data.schedule || []));
  } else if (creditDetailState.activeTab === 'payments') {
    tabContent.appendChild(renderPaymentsTab(g, c, data.payments || []));
  } else {
    tabContent.appendChild(renderInfoTab(c, s));
  }

  hydrateIcons(inner);
}

function renderScheduleTab(g, c, schedule) {
  if (!schedule.length) {
    return emptyState('calendar', 'График пуст', 'Проверьте параметры кредита');
  }

  // Найдём следующую неоплаченную строку
  const now = Date.now();
  let nextIndex = -1;
  for (let i = 0; i < schedule.length; i++) {
    if (!schedule[i].is_paid && new Date(schedule[i].date).getTime() >= now) {
      nextIndex = i;
      break;
    }
  }
  if (nextIndex === -1) {
    // берём первую неоплаченную
    for (let i = 0; i < schedule.length; i++) {
      if (!schedule[i].is_paid) { nextIndex = i; break; }
    }
  }

  const rows = schedule.map((e, i) => {
    const classes = [];
    if (e.is_paid) classes.push('is-paid');
    else if (e.is_past) classes.push('is-past');
    if (i === nextIndex) classes.push('is-next');

    return el('tr', { class: classes.join(' ') }, [
      el('td', {}, [
        el('span', { class: 'schedule-month-badge' }, [String(e.month)]),
      ]),
      el('td', {}, [fmtDate(e.date)]),
      el('td', { class: 'amount' }, [fmtMoney(e.amount)]),
      el('td', {}, [fmtMoney(e.interest_part)]),
      el('td', {}, [fmtMoney(e.principal_part)]),
      el('td', {}, [fmtMoney(e.remaining)]),
    ]);
  });

  return el('div', { class: 'schedule-table-wrap' }, [
    el('table', { class: 'schedule-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', {}, ['#']),
          el('th', {}, ['Дата']),
          el('th', {}, ['Платёж']),
          el('th', {}, ['Проценты']),
          el('th', {}, ['Тело']),
          el('th', {}, ['Остаток']),
        ]),
      ]),
      el('tbody', {}, rows),
    ]),
  ]);
}

function renderPaymentsTab(g, c, payments) {
  if (!payments.length) {
    return emptyState('wallet', 'Платежей пока нет', 'Отметьте первый платёж кнопкой «Оплатить»');
  }

  return el('div', { class: 'payments-list' },
    payments.slice().reverse().map((p, i) =>
      stagger(
        el('div', { class: 'payment-row' + (p.type === 'early' ? ' early' : '') }, [
          el('div', { class: 'payment-icon' }, [
            icon(p.type === 'early' ? 'trendUp' : 'check', 18),
          ]),
          el('div', { class: 'item-main' }, [
            el('div', { class: 'item-title' }, [
              fmtMoney(p.amount),
              p.type === 'early' ? el('span', { class: 'tag tag-warning', style: 'margin-left:8px;' }, ['Досрочный']) : null,
            ].filter(Boolean)),
            el('div', { class: 'item-sub' }, [
              `${fmtDate(p.payment_date)} · тело ${fmtMoney(p.principal_part)} · проценты ${fmtMoney(p.interest_part)}`,
              p.early_recalc ? ` · ${p.early_recalc === 'reduce_term' ? 'срок уменьшен' : 'платёж уменьшен'}` : '',
            ]),
          ]),
          p.transaction_id
            ? el('span', { class: 'tag tag-primary', 'data-tip': 'Есть транзакция в бюджете' }, ['в бюджете'])
            : null,
        ].filter(Boolean)),
        i
      )
    )
  );
}

function renderInfoTab(c, s) {
  const rows = [
    ['Название', c.name],
    ['Сумма кредита', fmtMoney(c.principal)],
    ['Ставка', `${(c.annual_rate || 0).toFixed(2)}% годовых`],
    ['Срок', `${c.term_months} ${plural(c.term_months, 'месяц', 'месяца', 'месяцев')}`],
    ['Тип платежа', c.payment_type === 'annuity' ? 'Аннуитетный' : 'Дифференцированный'],
    ['Дата выдачи', fmtDate(c.start_date)],
    ['Ожидаемое закрытие', fmtDate(s.expected_end_date)],
    ['Платежей сделано', `${s.payments_count} из ~${c.term_months}`],
    ['Валюта', c.currency],
    ['Статус', c.is_closed ? 'Погашен' : 'Активен'],
  ];

  return el('div', { class: 'card' }, rows.map(([label, value]) =>
    el('div', { class: 'info-row' }, [
      el('div', { class: 'info-row-label' }, [label]),
      el('div', { class: 'info-row-value' }, [String(value)]),
    ])
  ));
}

async function reloadCreditDetail(g) {
  if (!creditDetailState.overlay) return;
  try {
    const res = await apiCall('GET', `/groups/${g.id}/credits/${creditDetailState.creditId}`);
    creditDetailState.data = res.data;
    renderCreditDetailInner(g);
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* =============================================================
CREDIT PAY MODAL
============================================================= */
async function openCreditPayModal(g, credit, summary, isEarly, onSuccess) {
  // Загружаем категории для опциональной транзакции
  const categories = await safeApi(apiCall('GET', `/groups/${g.id}/categories`), []);
  const creditCategory = categories.find((c) => /кредит/i.test(c.name));

  const isDifferentiated = credit.payment_type === 'differentiated';
  const monthly = isEarly ? 0 : Number(summary?.monthly_payment || 0);
  const remaining = Number(summary?.remaining_principal || credit.principal || 0);

  const amount = el('input', {
    class: 'input',
    type: 'number',
    step: '0.01',
    min: '0.01',
    required: true,
    value: monthly > 0 ? monthly.toFixed(2) : '',
    placeholder: isEarly ? 'Сумма досрочки' : 'Сумма платежа',
  });

  const presetsRow = isEarly
    ? el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;margin-top:6px;' },
        [10000, 50000, 100000, 500000].map((v) =>
          el('button', {
            type: 'button',
            class: 'preset-btn',
            onclick: () => { amount.value = v; recalcPreview(); },
          }, [`${v.toLocaleString('ru-RU')} ₽`])
        )
      )
    : null;

  const dateInput = el('input', {
    class: 'input',
    type: 'datetime-local',
    value: toLocalInput(new Date().toISOString()),
    required: true,
  });

  // Стратегия пересчёта (только для досрочки и только для annuity — differentiated всегда reduce_term)
  let recalcValue = 'reduce_term';
  let recalcCards = null;

  if (isEarly) {
    if (isDifferentiated) {
      recalcCards = el('div', { class: 'text-xs text-3 mt-8' }, [
        'Для дифференцированного кредита досрочка уменьшает только срок.',
      ]);
    } else {
      recalcCards = el('div', { class: 'radio-group' }, [
        el('button', {
          type: 'button',
          class: 'radio-card is-active',
          onclick: (e) => {
            recalcValue = 'reduce_term';
            e.currentTarget.parentElement.querySelectorAll('.radio-card').forEach((n) => n.classList.remove('is-active'));
            e.currentTarget.classList.add('is-active');
            recalcPreview();
          },
        }, [
          el('strong', {}, ['Уменьшить срок']),
          el('span', { class: 'text-3 text-xs' }, ['Платёж тот же, закроете раньше']),
        ]),
        el('button', {
          type: 'button',
          class: 'radio-card',
          onclick: (e) => {
            recalcValue = 'reduce_payment';
            e.currentTarget.parentElement.querySelectorAll('.radio-card').forEach((n) => n.classList.remove('is-active'));
            e.currentTarget.classList.add('is-active');
            recalcPreview();
          },
        }, [
          el('strong', {}, ['Уменьшить платёж']),
          el('span', { class: 'text-3 text-xs' }, ['Срок тот же, платите меньше']),
        ]),
      ]);
    }
  }

  const categorySelect = el('select', { class: 'input' }, [
    el('option', { value: '' }, ['— Не учитывать в бюджете —']),
    ...categories.map((c) =>
      el('option', {
        value: c.id,
        selected: creditCategory && creditCategory.id === c.id,
      }, [c.name])
    ),
  ]);

  const description = el('input', {
    class: 'input',
    type: 'text',
    maxlength: '255',
    value: isEarly ? `Досрочное погашение: ${credit.name}` : `Платёж по кредиту: ${credit.name}`,
  });

  const preview = el('div', { class: 'credit-pay-preview' });

  const recalcPreview = () => {
    const amt = parseFloat(amount.value) || 0;
    if (amt <= 0) {
      preview.innerHTML = '<div class="preview-line"><span>Введите сумму</span></div>';
      return;
    }
    const monthlyRate = (credit.annual_rate || 0) / 100 / 12;
    const interestPart = Math.round(remaining * monthlyRate * 100) / 100;
    const principalPart = Math.max(0, Math.round((amt - interestPart) * 100) / 100);
    const tooSmall = isEarly && amt <= interestPart;

    let html = `
      <div class="preview-line"><span>Сумма платежа</span><strong>${fmtMoney(amt)}</strong></div>
      <div class="preview-line"><span>Из них проценты (≈)</span><strong>${fmtMoney(interestPart)}</strong></div>
      <div class="preview-line"><span>Из них в тело (≈)</span><strong>${fmtMoney(principalPart)}</strong></div>
    `;
    if (tooSmall) {
      html += `<div class="preview-line" style="color:var(--danger);margin-top:4px;"><strong>Сумма меньше накопленных процентов (${fmtMoney(interestPart)})</strong></div>`;
    }
    if (isEarly && !isDifferentiated) {
      html += `<div class="preview-line" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);"><span>Стратегия</span><strong>${recalcValue === 'reduce_term' ? 'Уменьшить срок' : 'Уменьшить платёж'}</strong></div>`;
    }
    preview.innerHTML = html;
  };

  amount.addEventListener('input', recalcPreview);
  setTimeout(recalcPreview, 100);

  openModal({
    title: isEarly ? 'Досрочное погашение' : 'Оплатить кредит',
    body: el('div', { class: 'form' }, [
      el('div', { class: 'text-sm text-2', style: 'margin-bottom:4px;' }, [
        `${credit.name} · остаток ${fmtMoney(remaining)}`,
      ]),
      field(isEarly ? 'Сумма досрочного платежа' : 'Сумма платежа', amount),
      presetsRow,
      field('Дата', dateInput),
      isEarly ? field('Куда направить досрочку', recalcCards) : null,
      preview,
      field('Категория (для бюджета)', categorySelect, 'Если выбрана — создастся транзакция расхода'),
      field('Описание', description),
    ].filter(Boolean)),
    saveLabel: isEarly ? 'Внести досрочку' : 'Оплатить',
    onSave: async () => {
      const amt = parseFloat(amount.value);
      if (!amt || amt <= 0) throw new Error('Введите сумму > 0');
      const payDate = fromLocalInput(dateInput.value) || new Date().toISOString();
      const categoryID = categorySelect.value || null;
      const accountInBudget = !!categoryID;

      const path = isEarly
        ? `/groups/${g.id}/credits/${credit.id}/early-pay`
        : `/groups/${g.id}/credits/${credit.id}/pay`;

      const body = {
        amount: amt,
        payment_date: payDate,
        category_id: categoryID,
        account_in_budget: accountInBudget,
        description: description.value.trim(),
      };
      if (isEarly) body.early_recalc = recalcValue;

      try {
        await apiCall('POST', path, body);
        toast(isEarly ? 'Досрочка внесена' : 'Платёж проведён', 'success');
        if (onSuccess) await onSuccess();
        if (!creditDetailState.overlay) await renderActiveView();
      } catch (err) {
        toast(err.message, 'error');
        throw err;
      }
    },
  });
}

/* =============================================================
VIEW: CREDITS (restored)
============================================================= */

async function renderCredits(container) {
  const g = activeGroup();
  container.innerHTML = '';
  if (!g) { container.appendChild(noGroupBanner()); return; }

  const credits = await safeApi(apiCall('GET', `/groups/${g.id}/credits`), []);

  container.appendChild(
    sectionHead(
      'Кредиты',
      `${credits.length} ${plural(credits.length, 'кредит', 'кредита', 'кредитов')}`,
      el('button', {
        type: 'button',
        class: 'btn btn-primary btn-sm',
        onclick: () => openCreateCreditModal(g),
      }, [
        el('span', { 'data-icon': 'plus', 'data-size': 'sm' }),
        el('span', {}, ['Кредит']),
      ])
    )
  );

  if (!credits.length) {
    container.appendChild(
      emptyState(
        'coins',
        'Пока нет кредитов',
        'Добавьте ипотеку, автокредит или потребкредит — увидите переплату, график и остаток',
        [
          el('button', {
            type: 'button',
            class: 'btn btn-primary',
            onclick: () => openCreateCreditModal(g),
          }, ['Добавить кредит']),
        ]
      )
    );
    return;
  }

  const active = credits.filter((c) => !c.credit.is_closed);
  if (active.length > 0) {
    const totalRemaining = active.reduce((s, c) => s + Number(c.summary.remaining_principal || 0), 0);
    const totalMonthly = active.reduce((s, c) => s + Number(c.summary.monthly_payment || 0), 0);
    const totalOverpay = active.reduce((s, c) => s + Number(c.summary.total_overpayment || 0), 0);

    container.appendChild(
      el('div', { class: 'stat-grid mt-16' }, [
        statTile('Долг (всего)', totalRemaining, 'danger'),
        statTile('В месяц', totalMonthly, 'primary'),
        statTile('Переплата (всего)', totalOverpay, 'warning'),
        statTile('Кредитов', active.length, '', (n) => String(Math.round(n))),
      ])
    );
  }

  const list = el('div', { class: 'grid-auto mt-16' });
  credits.forEach((c, i) => list.appendChild(stagger(renderCreditCard(g, c), i)));
  container.appendChild(list);
}

function renderCreditCard(g, entry) {
  const c = entry.credit;
  const s = entry.summary;
  const isClosed = c.is_closed;
  const nextDate = s.next_payment_date ? new Date(s.next_payment_date) : null;
  const daysToNext = nextDate ? Math.ceil((nextDate - Date.now()) / 86400000) : null;

  return el('div', { class: 'card credit-card' + (isClosed ? ' is-closed' : '') }, [
    el('div', { class: 'card-head' }, [
      el('div', { class: 'row', style: 'gap:10px;' }, [
        progressRing(Math.min(100, s.progress_percent || 0)),
        el('div', {}, [
          el('div', { class: 'card-title' }, [
            c.name,
            isClosed ? el('span', { class: 'tag tag-success', style: 'margin-left:8px;' }, ['Погашен']) : null,
          ].filter(Boolean)),
          el('div', { class: 'card-subtitle' }, [
            `${(c.annual_rate || 0).toFixed(2)}% · ${c.term_months} мес · ${c.payment_type === 'annuity' ? 'Аннуитет' : 'Дифференцированный'}`,
          ]),
        ]),
      ]),
      el('div', { class: 'item-actions' }, [
        el('button', {
          type: 'button',
          class: 'icon-btn sm',
          'data-tip': 'Открыть',
          onclick: () => openCreditDetail(g, c.id),
        }, [icon('list', 18)]),
        el('button', {
          type: 'button',
          class: 'icon-btn sm',
          'data-tip': 'Удалить',
          onclick: () => confirmDelete(`Удалить кредит «${c.name}»?`, async () => {
            try {
              await apiCall('DELETE', `/groups/${g.id}/credits/${c.id}`);
              toast('Удалено', 'success');
              await renderActiveView();
            } catch (err) { toast(err.message, 'error'); }
          }),
        }, [icon('trash', 18)]),
      ]),
    ]),

    el('div', { class: 'credit-stats' }, [
      creditStat('Платёж в месяц', fmtMoney(s.monthly_payment || 0), 'primary'),
      creditStat('Осталось', fmtMoney(s.remaining_principal || 0), s.remaining_principal > 0 ? 'danger' : 'success'),
      creditStat('Переплата', fmtMoney(s.total_overpayment || 0), 'warning'),
    ]),

    el('div', { class: 'progress mt-12' }, [
      el('div', {
        class: `progress-fill${isClosed ? ' success' : ''}`,
        style: `width:${Math.min(100, s.progress_percent || 0)}%`,
      }),
    ]),

    el('div', { class: 'row-between text-xs text-3 mt-8' }, [
      el('span', {}, [`Выплачено: ${fmtMoney(s.paid_principal || 0)} / ${fmtMoney(c.principal)}`]),
      el('span', {}, [`${(s.progress_percent || 0).toFixed(1)}%`]),
    ]),

    nextDate && !isClosed
      ? el('div', { class: 'credit-next mt-12' }, [
          el('span', { 'data-icon': 'clock', 'data-size': 'sm' }),
          el('span', {}, [
            `Следующий платёж: ${fmtDate(nextDate)} · ${fmtMoney(s.next_payment_amount)}`,
            daysToNext != null && daysToNext >= 0 ? ` · через ${daysToNext} ${plural(daysToNext, 'день', 'дня', 'дней')}` : '',
          ]),
        ])
      : null,

    !isClosed
      ? el('div', { class: 'row gap-8 mt-12', style: 'flex-wrap:wrap;' }, [
          el('button', {
            type: 'button',
            class: 'btn btn-primary btn-sm',
            onclick: () => openCreditPayModal(g, c, s, false),
          }, [icon('check', 16), el('span', {}, ['Оплатить'])]),
          el('button', {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onclick: () => openCreditPayModal(g, c, s, true),
          }, [icon('trendUp', 16), el('span', {}, ['Досрочно'])]),
        ])
      : null,
  ].filter(Boolean));
}

function creditStat(label, value, variant = '') {
  return el('div', { class: 'credit-stat' }, [
    el('div', { class: 'stat-label' }, [label]),
    el('div', { class: `credit-stat-value ${variant}` }, [value]),
  ]);
}

function openCreateCreditModal(g) {
  const name = el('input', {
    class: 'input', name: 'name', required: true, maxlength: 200,
    placeholder: 'Ипотека на квартиру',
  });

  const principal = el('input', {
    class: 'input', name: 'principal', type: 'number', step: '0.01', min: '0.01',
    required: true, placeholder: '5 000 000',
  });

  const rate = el('input', {
    class: 'input', name: 'annual_rate', type: 'number', step: '0.01', min: '0',
    required: true, placeholder: '15.00',
  });

  const term = el('input', {
    class: 'input', name: 'term_months', type: 'number', min: '1',
    required: true, placeholder: '240',
  });

  const paymentType = el('select', { class: 'input', name: 'payment_type' }, [
    el('option', { value: 'annuity' }, ['Аннуитетный (равный платёж)']),
    el('option', { value: 'differentiated' }, ['Дифференцированный (уменьшается)']),
  ]);

  const startDate = el('input', {
    class: 'input', name: 'start_date', type: 'date',
    value: toDateInput(new Date().toISOString()), required: true,
  });

  const currency = el('select', { class: 'input', name: 'currency' }, [
    el('option', { value: 'RUB', selected: (state.user?.currency || 'RUB') === 'RUB' }, ['₽ Рубль']),
    el('option', { value: 'USD', selected: state.user?.currency === 'USD' }, ['$ Доллар']),
    el('option', { value: 'EUR', selected: state.user?.currency === 'EUR' }, ['€ Евро']),
    el('option', { value: 'KZT', selected: state.user?.currency === 'KZT' }, ['₸ Тенге']),
  ]);

  const preview = el('div', { class: 'credit-preview mt-12' }, ['Укажите сумму, ставку и срок']);

  const recalc = () => {
    const p = parseFloat(principal.value);
    const r = parseFloat(rate.value);
    const n = parseInt(term.value, 10);
    if (!p || p <= 0 || !r || r < 0 || !n || n <= 0) {
      preview.textContent = 'Укажите сумму, ставку и срок';
      return;
    }
    const monthly = paymentType.value === 'annuity'
      ? calculateAnnuityLocal(p, r, n)
      : calculateDiffLocal(p, r, n);
    const total = paymentType.value === 'annuity'
      ? monthly * n
      : (p + p * r / 100 / 12 * (n + 1) / 2);
    const overpay = total - p;
    preview.innerHTML = `Ежемесячно: <strong>${fmtMoney(monthly)}</strong> · Всего: ${fmtMoney(total)} · Переплата: <span style="color:var(--warning)">${fmtMoney(overpay)}</span>`;
  };

  [principal, rate, term].forEach((inp) => inp.addEventListener('input', recalc));
  paymentType.addEventListener('change', recalc);

  openModal({
    title: 'Новый кредит',
    body: el('div', {}, [
      field('Название', name),
      el('div', { class: 'credit-form-grid' }, [
        field('Сумма', principal),
        field('Ставка, % годовых', rate),
      ]),
      el('div', { class: 'credit-form-grid' }, [
        field('Срок, месяцев', term),
        field('Тип платежа', paymentType),
      ]),
      el('div', { class: 'credit-form-grid' }, [
        field('Дата выдачи', startDate),
        field('Валюта', currency),
      ]),
      preview,
    ]),
    saveLabel: 'Создать',
    onSave: async () => {
      const body = {
        name: name.value.trim(),
        principal: parseFloat(principal.value),
        annual_rate: parseFloat(rate.value),
        term_months: parseInt(term.value, 10),
        payment_type: paymentType.value,
        start_date: new Date(`${startDate.value}T12:00:00`).toISOString(),
        currency: currency.value,
      };
      if (!body.name) throw new Error('Введите название');
      if (!body.principal || body.principal <= 0) throw new Error('Сумма должна быть > 0');
      if (body.annual_rate < 0) throw new Error('Ставка не может быть отрицательной');
      if (!body.term_months || body.term_months <= 0) throw new Error('Срок должен быть > 0');
      if (!startDate.value) throw new Error('Укажите дату выдачи');
      if (!body.start_date || Number.isNaN(new Date(body.start_date).getTime())) {
        throw new Error('Некорректная дата выдачи');
      }

      try {
        await apiCall('POST', `/groups/${g.id}/credits`, body);
        toast('Кредит создан', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    },
  });

  setTimeout(recalc, 100);
}

function calculateAnnuityLocal(principal, annualRate, termMonths) {
  if (termMonths <= 0 || principal <= 0) return 0;
  if (annualRate === 0) return Math.round(principal / termMonths * 100) / 100;
  const r = annualRate / 100 / 12;
  const f = Math.pow(1 + r, termMonths);
  return Math.round(principal * r * f / (f - 1) * 100) / 100;
}

function calculateDiffLocal(principal, annualRate, termMonths) {
  if (termMonths <= 0 || principal <= 0) return 0;
  const body = principal / termMonths;
  const interest = principal * annualRate / 100 / 12;
  return Math.round((body + interest) * 100) / 100;
}

/* =============================================================
RECURRING TRANSACTIONS (Регулярные операции)
============================================================= */

async function renderRecurringSection(g, cats) {
  const recurrings = await safeApi(apiCall('GET', `/groups/${g.id}/recurring`), []);
  
  const list = el('div', { class: 'list' }, recurrings.map((r, i) => {
    const isIncome = r.type === 'income';
    const catName = cats.find(c => c.id === r.category_id)?.name || 'Без категории';
    
    return stagger(el('div', { class: 'item' + (!r.is_active ? ' is-done' : '') }, [
      el('div', { class: 'avatar-sm', style: `background:${isIncome ? 'var(--success)' : 'var(--danger)'}` }, [
        icon(isIncome ? 'arrowUpCircle' : 'arrowDownCircle', 18)
      ]),
      el('div', { class: 'item-main' }, [
        el('div', { class: 'item-title' }, [r.title]),
        el('div', { class: 'item-sub' }, [`${isIncome ? 'Доход' : 'Расход'} · ${r.day_of_month}-е число · ${catName}`]),
      ]),
      el('div', { class: 'mono ' + (isIncome ? 'amount-positive' : 'amount-negative'), style: 'margin-right:8px; font-weight:800;' }, [
        `${isIncome ? '+' : '−'}${fmtMoney(r.amount)}`
      ]),
      el('button', {
        type: 'button',
        class: 'icon-btn sm',
        'data-tip': r.is_active ? 'Отключить' : 'Включить',
        onclick: async () => {
          try {
            await apiCall('PATCH', `/groups/${g.id}/recurring/${r.id}`, {
              category_id: r.category_id, title: r.title, type: r.type, amount: r.amount, day_of_month: r.day_of_month, is_active: !r.is_active
            });
            await renderActiveView();
          } catch (err) { toast(err.message, 'error'); }
        }
      }, [icon(r.is_active ? 'check' : 'x', 16)]),
      el('button', {
        type: 'button',
        class: 'icon-btn sm',
        'data-tip': 'Удалить',
        onclick: () => confirmDelete(`Удалить шаблон «${r.title}»?`, async () => {
          try {
            await apiCall('DELETE', `/groups/${g.id}/recurring/${r.id}`);
            toast('Удалено', 'success');
            await renderActiveView();
          } catch (err) { toast(err.message, 'error'); }
        })
      }, [icon('trash', 16)]),
    ]), i);
  }));

  if (!recurrings.length) {
    list.appendChild(miniEmpty('Нет регулярных операций. Добавьте зарплату или аренду.'));
  }

  return sectionBlock(
    'Регулярные операции',
    'Автоматические начисления и списания',
    el('button', {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      onclick: () => openCreateRecurringModal(g, cats)
    }, [el('span', { 'data-icon': 'plus', 'data-size': 'sm' }), el('span', {}, ['Шаблон'])]),
    list
  );
}

function openCreateRecurringModal(g, cats) {
  const title = el('input', { class: 'input', type: 'text', placeholder: 'Зарплата / Аренда / Подписка', required: true });
  const amount = el('input', { class: 'input', type: 'number', step: '0.01', min: '0.01', placeholder: 'Сумма', required: true });
  const day = el('input', { class: 'input', type: 'number', min: '1', max: '31', placeholder: 'День месяца (1-31)', required: true });
  
  let type = 'expense';
  const expenseBtn = el('button', { type: 'button', class: 'btn btn-danger btn-sm flex-1', onclick: () => { type = 'expense'; expenseBtn.className = 'btn btn-danger btn-sm flex-1'; incomeBtn.className = 'btn btn-ghost btn-sm flex-1'; } }, ['Расход']);
  const incomeBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm flex-1', onclick: () => { type = 'income'; expenseBtn.className = 'btn btn-ghost btn-sm flex-1'; incomeBtn.className = 'btn btn-primary btn-sm flex-1'; } }, ['Доход']);

  const catSelect = el('select', { class: 'input', required: true }, [
    el('option', { value: '' }, ['Выберите категорию']),
    ...cats.map(c => el('option', { value: c.id }, [c.name]))
  ]);

  openModal({
    title: 'Новая регулярная операция',
    body: el('div', { class: 'form' }, [
      field('Название', title),
      el('div', { class: 'row gap-8' }, [expenseBtn, incomeBtn]),
      field('Сумма', amount),
      field('День месяца (1-31)', day),
      field('Категория', catSelect, 'Обязательно — для бюджета'),
      el('div', { class: 'text-xs text-3 mt-8' }, ['Операция будет создаваться автоматически каждый месяц в указанный день.'])
    ]),
    saveLabel: 'Создать',
    onSave: async () => {
      const amt = parseFloat(amount.value);
      const d = parseInt(day.value, 10);
      if (!title.value.trim()) throw new Error('Введите название');
      if (!amt || amt <= 0) throw new Error('Введите сумму > 0');
      if (!d || d < 1 || d > 31) throw new Error('День должен быть от 1 до 31');
      if (!catSelect.value) throw new Error('Выберите категорию для бюджета');

      try {
        await apiCall('POST', `/groups/${g.id}/recurring`, {
          title: title.value.trim(),
          type,
          amount: amt,
          day_of_month: d,
          category_id: catSelect.value || null
        });
        toast('Шаблон создан', 'success');
        await renderActiveView();
      } catch (err) { toast(err.message, 'error'); throw err; }
    }
  });
}
