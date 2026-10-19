/* =============================================================
   ZUNNO · SPA
   Glassmorphism / Neumorphism edition
   ============================================================= */

'use strict';

const API = '/api/v1';

const state = {
  token: localStorage.getItem('access_token') || '',
  user: null,
  groups: [],
  activeGroupId: localStorage.getItem('active_group') || null,
  view: 'dashboard',
};

const commandState = {
  open: false,
  filtered: [],
  selected: 0,
};

/* =============================================================
   DOM HELPERS
   ============================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;

    if (key === 'class') {
      node.className = value;
    } else if (key === 'html') {
      node.innerHTML = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, value);
    }
  }

  const items = Array.isArray(children) ? children : [children];

  for (const child of items) {
    if (child == null || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

function stagger(node, index) {
  if (!node) return node;
  node.style.animationDelay = `${Math.min(index, 14) * 45}ms`;
  return node;
}

/* =============================================================
   FORMATTERS
   ============================================================= */

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const currency = state.user?.currency || 'RUB';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
  }).format(Number(n));
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtRelative(iso) {
  if (!iso) return '—';

  const d = new Date(iso);
  const now = new Date();
  const diff = (d - now) / 1000;
  const abs = Math.abs(diff);

  if (abs < 60) return 'сейчас';
  if (abs < 3600) return `${Math.round(diff / 60)} мин`;
  if (abs < 86400) return `${Math.round(diff / 3600)} ч`;
  if (abs < 604800) return `${Math.round(diff / 86400)} дн`;

  return fmtDate(iso);
}

function initials(name) {
  if (!name) return '?';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => (word[0] || '').toUpperCase())
      .join('') || '?'
  );
}

function shortId(id) {
  return id ? String(id).slice(0, 8) : '—';
}

function colorFromId(id) {
  if (!id) return 'hsl(250, 60%, 60%)';

  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = (hash * 31 + String(id).charCodeAt(i)) | 0;
  }

  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 55%)`;
}

function toLocalInput(iso) {
  if (!iso) return '';

  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;

  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function setBusy(busy) {
  const preloader = $('#preloader');
  if (preloader) preloader.classList.toggle('hide', !busy);
}

/* =============================================================
   THEME
   ============================================================= */

function getPreferredTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  localStorage.setItem('zunno-theme', theme);

  $$('[data-theme-toggle]').forEach((btn) => {
    btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    btn.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
    );
  });

  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#070912' : '#eef2f8');
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* =============================================================
   TOASTS
   ============================================================= */

function toast(message, type = 'info', timeout = 3600) {
  const root = $('#toasts');
  if (!root) return;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'ℹ',
  };

  const node = el(
    'div',
    {
      class: `toast toast-${type}`,
      role: type === 'error' ? 'alert' : 'status',
    },
    [
      el('div', { class: 'toast-ico' }, [icons[type] || icons.info]),
      el('div', { class: 'toast-msg' }, [String(message)]),
    ]
  );

  root.appendChild(node);

  while (root.children.length > 4) {
    root.firstElementChild?.remove();
  }

  setTimeout(() => {
    node.classList.add('hide');
    setTimeout(() => node.remove(), 240);
  }, timeout);
}

/* =============================================================
   CLIPBOARD
   ============================================================= */

function copyText(text, successMsg = 'Скопировано') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast(successMsg, 'success'))
      .catch(() => fallbackCopy(text, successMsg));
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
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(textarea);

  if (ok) {
    toast(successMsg, 'success');
  } else {
    showCopyFallback(text);
  }
}

function showCopyFallback(text) {
  openModal({
    title: 'Скопируйте вручную',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, [
        'Автокопирование недоступно. Выделите и скопируйте значение ниже:',
      ]),
      el('input', {
        class: 'copy-input',
        type: 'text',
        value: text,
        readonly: true,
        onclick: (e) => e.target.select(),
      }),
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

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

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

  if (res.status === 204) {
    return { ok: true, status: 204, data: null };
  }

  let data = null;
  const text = await res.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (res.status === 401 && !opts.noRetry && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();

    if (refreshed) {
      return apiCall(method, path, body, { ...opts, noRetry: true });
    }

    logout();
    throw new Error('Сессия истекла');
  }

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Ошибка ${res.status}`;

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

/* =============================================================
   AUTH
   ============================================================= */

async function login(phone, password) {
  const res = await apiCall(
    'POST',
    '/auth/login',
    { phone_number: phone, password },
    { noRetry: true }
  );

  state.token = res.data.access_token;
  localStorage.setItem('access_token', state.token);

  await bootstrapApp();
}

async function register(fullName, age, phone, password) {
  const res = await apiCall(
    'POST',
    '/auth/register',
    {
      phone_number: phone,
      password,
      full_name: fullName,
      age: Number(age),
    },
    { noRetry: true }
  );

  state.token = res.data.access_token;
  localStorage.setItem('access_token', state.token);

  await bootstrapApp();
}

async function logout() {
  try {
    await apiCall('POST', '/auth/logout', null, { noRetry: true });
  } catch {
    // ignore
  }

  state.token = '';
  state.user = null;
  state.groups = [];
  state.activeGroupId = null;

  localStorage.removeItem('access_token');
  localStorage.removeItem('active_group');

  closeAllOverlays();
  showScreen('auth');
}

/* =============================================================
   SCREENS
   ============================================================= */

function showScreen(name) {
  $('#screen-auth')?.classList.toggle('hidden', name !== 'auth');
  $('#screen-app')?.classList.toggle('hidden', name !== 'app');
}

function closeAllOverlays() {
  closeModal();
  closeSheet();
  closeCommandPalette();
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

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  $('#form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);

    try {
      setBusy(true);
      await login(String(fd.get('phone_number') || '').trim(), String(fd.get('password') || ''));
    } catch (err) {
      toast(err.message || 'Ошибка входа', 'error');
    } finally {
      setBusy(false);
    }
  });

  $('#form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);

    try {
      setBusy(true);
      await register(
        String(fd.get('full_name') || '').trim(),
        fd.get('age'),
        String(fd.get('phone_number') || '').trim(),
        String(fd.get('password') || '')
      );
    } catch (err) {
      toast(err.message || 'Ошибка регистрации', 'error');
    } finally {
      setBusy(false);
    }
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

    if (!state.activeGroupId || !state.groups.find((g) => g.id === state.activeGroupId)) {
      state.activeGroupId = state.groups[0]?.id || null;

      if (state.activeGroupId) {
        localStorage.setItem('active_group', state.activeGroupId);
      } else {
        localStorage.removeItem('active_group');
      }
    }

    renderSidebarUser();
    renderSidebarGroups();
    renderTopbarGroup();
    renderTopbarUser();

    showScreen('app');
    renderFAB();
    await renderActiveView();

    // Первый вход — запускаем тур
    if (!localStorage.getItem('zunno-onboarded')) {
      setTimeout(() => startOnboardingTour(false), 500);
    }
  } catch (err) {
    toast(err.message || 'Не удалось загрузить данные', 'error');

    if (err.status === 401) {
      logout();
    }
  } finally {
    setBusy(false);
  }
}

/* =============================================================
   SIDEBAR
   ============================================================= */

function renderSidebarUser() {
  const box = $('#sidebar-user');
  if (!box) return;

  box.innerHTML = '';

  const u = state.user;
  if (!u) return;

  box.appendChild(
    el(
      'button',
      {
        type: 'button',
        class: 'user-chip',
        onclick: () => switchView('profile'),
      },
      [
        el('div', { class: 'avatar' }, [initials(u.full_name)]),
        el('div', { class: 'user-chip-info' }, [
          el('div', { class: 'user-chip-name' }, [u.full_name || 'Без имени']),
          el('div', { class: 'user-chip-phone' }, [u.phone_number || '']),
        ]),
      ]
    )
  );
}

function renderSidebarGroups() {
  const box = $('#sidebar-group-list');
  if (!box) return;

  box.innerHTML = '';

  if (!state.groups.length) {
    box.appendChild(
      el('div', { class: 'text-xs text-3', style: 'padding: 8px 10px;' }, ['Нет групп'])
    );
    return;
  }

  // Ищем личную группу (она создается автоматически при регистрации)
  const personalGroup = state.groups.find((g) => g.name === 'Моё' || g.name === 'Личное');
  const otherGroups = state.groups.filter((g) => g !== personalGroup);

  // 1. Блок "Личное"
  if (personalGroup) {
    box.appendChild(
      el('div', { class: 'text-xs text-3', style: 'padding: 8px 10px 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;' }, ['Личное'])
    );
    box.appendChild(
      el(
        'button',
        {
          type: 'button',
          class: 'sidebar-group-item' + (personalGroup.id === state.activeGroupId ? ' is-active' : ''),
          onclick: () => switchGroup(personalGroup.id),
        },
        [
          el('span', { class: 'dot', style: 'background: var(--primary);' }),
          el('span', { class: 'sidebar-group-item-name', style: 'font-weight: 500;' }, [personalGroup.name]),
        ]
      )
    );
    box.appendChild(el('div', { style: 'height: 1px; background: var(--border); margin: 8px 10px;' }));
  }

  // 2. Блок "Мои группы"
  if (otherGroups.length) {
    box.appendChild(
      el('div', { class: 'text-xs text-3', style: 'padding: 8px 10px 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;' }, ['Мои группы'])
    );
    for (const g of otherGroups) {
      box.appendChild(
        el(
          'button',
          {
            type: 'button',
            class: 'sidebar-group-item' + (g.id === state.activeGroupId ? ' is-active' : ''),
            onclick: () => switchGroup(g.id),
          },
          [
            el('span', { class: 'dot' }),
            el('span', { class: 'sidebar-group-item-name' }, [g.name]),
          ]
        )
      );
    }
  }
}

/* =============================================================
   TOPBAR
   ============================================================= */

function renderTopbarGroup() {
  const g = activeGroup();
  const btn = $('#group-settings-btn');
  
  if (btn) btn.style.display = g ? 'inline-flex' : 'none';

  const nameEl = $('#topbar-group-name');
  const metaEl = $('#topbar-group-meta');
  const avatarEl = $('#topbar-group-avatar');

  if (!g) {
    if (nameEl) nameEl.textContent = 'Нет группы';
    if (metaEl) metaEl.textContent = 'Создайте или присоединитесь';
    if (avatarEl) avatarEl.textContent = '?';
    return;
  }

  if (nameEl) nameEl.textContent = g.name;
  if (metaEl) metaEl.textContent = `ID: ${shortId(g.id)}`;
  if (avatarEl) avatarEl.textContent = initials(g.name);
}

function renderTopbarUser() {
  const btn = $('#topbar-user-btn');
  if (!btn) return;

  btn.textContent = initials(state.user?.full_name);
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

  closeSheet();
  closeCommandPalette();
}

/* =============================================================
   VIEW ROUTER
   ============================================================= */

const VIEWS = {
  dashboard: { title: 'Обзор', icon: '◧', render: renderDashboard },
  goals: { title: 'Цели', icon: '◆', render: renderGoals },
  budget: { title: 'Бюджет', icon: '≡', render: renderBudget },
  plans: { title: 'Планы', icon: '◷', render: renderPlans },
  profile: { title: 'Профиль', icon: '○', render: renderProfile },
};

async function renderActiveView() {
  const view = VIEWS[state.view];
  if (!view) return;

  $$('.nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.view === state.view));
  $$('.mobile-nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.view === state.view));

  const container = $('#view');
  if (!container) return;

  container.scrollTop = 0;
  renderSkeleton(container);

  try {
    await view.render(container);
  } catch (err) {
    renderError(container, err);
  }
}

function switchView(name) {
  state.view = name;
  renderActiveView();
  closeSheet();
  closeCommandPalette();
}

function renderSkeleton(container) {
  container.innerHTML = `
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
  container.appendChild(
    emptyState('!', 'Не удалось загрузить раздел', err?.message || 'Неизвестная ошибка')
  );
}

/* =============================================================
   VIEW: DASHBOARD
   ============================================================= */

async function renderDashboard(container) {
  const g = activeGroup();
  
  container.innerHTML = '';

  if (!g) {
    container.appendChild(noGroupBanner());
    return;
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [summary, membersSpent, plans, members, invitations] = await Promise.all([
    apiCall('GET', `/groups/${g.id}/budget/summary?month=${month}`)
      .then((r) => r.data)
      .catch(() => null),
    apiCall('GET', `/groups/${g.id}/budget/members?month=${month}`)
      .then((r) => r.data || [])
      .catch(() => []),
    apiCall('GET', `/groups/${g.id}/plans?from=${from}&to=${to}`)
      .then((r) => r.data || [])
      .catch(() => []),
    apiCall('GET', `/groups/${g.id}/members`)
      .then((r) => r.data || [])
      .catch(() => []),
    apiCall('GET', '/invitations')
      .then((r) => r.data || [])
      .catch(() => []),
  ]);

  renderInvitationsBanner(container, invitations);

  const spent = summary?.total_spent || 0;
  const limit = summary?.total_limit || 0;
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

  container.appendChild(
    el('div', { class: 'stat-grid' }, [
      statTile('Потрачено', fmtMoney(spent), 'primary'),
      statTile('Лимит', fmtMoney(limit), limit > 0 && spent > limit ? 'danger' : ''),
      statTile('Планов', String(plans.length), ''),
      statTile('Участников', String(members.length), 'success'),
    ])
  );

  if (limit > 0) {
    container.appendChild(
      el('div', { class: 'card mt-16' }, [
        el('div', { class: 'row-between' }, [
          el('div', { class: 'text-sm text-2' }, ['Общий прогресс месяца']),
          el('div', { class: 'text-sm mono' }, [`${pct.toFixed(0)}%`]),
        ]),
        el('div', { class: 'progress mt-12' }, [
          el('div', {
            class: `progress-fill${pct >= 100 && spent > limit ? ' danger' : ''}`,
            style: `width:${pct}%`,
          }),
        ]),
      ])
    );
  }

  const me = members.find(m => m.user_id === state.user.id);
  const isAdmin = me && me.role === 'admin';
  const isPersonalGroup = g.name === 'Моё' || g.name === 'Личное';

  if (!isPersonalGroup) {
    container.appendChild(
      el('div', { class: 'section' }, [
        sectionHead(
          'Участники',
          `${members.length} ${plural(members.length, 'человек', 'человека', 'человек')} в группе`,
          el('button', {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onclick: () => openInviteModal(g),
          }, ['Пригласить'])
        ),
        el('div', { class: 'list' }, members.map((m, i) => stagger(renderMemberRow(m, isAdmin), i))),
      ])
    );
  }

  const upcoming = plans
    .filter((p) => !p.is_done)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);

  if (upcoming.length) {
    container.appendChild(
      el('div', { class: 'section' }, [
        sectionHead(
          'Ближайшие планы',
          `${upcoming.length} ${plural(upcoming.length, 'событие', 'события', 'событий')}`,
          el('button', {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onclick: () => switchView('plans'),
          }, ['Все'])
        ),
        el(
          'div',
          { class: 'list' },
          upcoming.map((p, i) =>
            stagger(
              el('div', { class: 'item' }, [
                el('div', { class: 'flex-1' }, [
                  el('div', { class: 'item-title' }, [p.title]),
                  el('div', { class: 'item-sub' }, [
                    `${fmtDateTime(p.event_date)} · ${fmtRelative(p.event_date)}`,
                  ]),
                ]),
              ]),
              i
            )
          )
        ),
      ])
    );
  }

  if (summary?.categories?.length) {
    container.appendChild(
      el('div', { class: 'section' }, [
        sectionHead(
          'Расходы по категориям',
          month,
          el('button', {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onclick: () => switchView('budget'),
          }, ['Все'])
        ),
        el(
          'div',
          { class: 'list' },
          summary.categories.map((c, i) =>
            stagger(
              el('div', {
                class: 'item',
                style: 'flex-direction:column;align-items:stretch;',
              }, [
                el('div', { class: 'row-between' }, [
                  el('div', { class: 'item-title' }, [c.name]),
                  el('div', { class: 'mono text-sm text-2' }, [
                    `${fmtMoney(c.spent)} / ${fmtMoney(c.limit)}`,
                  ]),
                ]),
                el('div', { class: 'progress mt-8' }, [
                  el('div', {
                    class: `progress-fill${c.overspent ? ' danger' : ''}`,
                    style: `width:${c.limit > 0 ? Math.min(100, (c.spent / c.limit) * 100) : 0}%`,
                  }),
                ]),
              ]),
              i
            )
          )
        ),
      ])
    );
  }
}

function statTile(label, value, variant) {
  return el('div', { class: 'stat-card' }, [
    el('div', { class: 'stat-label' }, [label]),
    el('div', { class: `stat-value ${variant || ''}` }, [value]),
  ]);
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
          const newRole = isTargetAdmin ? 'member' : 'admin';
          await apiCall('PATCH', `/groups/${g.id}/members/${m.user_id}`, { role: newRole });
          toast('Роль изменена', 'success');
          renderActiveView();
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    }, [isTargetAdmin ? 'Разжаловать до участника' : 'Сделать админом']),
    el('button', {
      type: 'button',
      class: 'btn btn-danger btn-block',
      onclick: () => {
        closeModal();
        confirmDelete(`Вы уверены, что хотите исключить ${m.full_name || 'участника'}?`, async () => {
          try {
            await apiCall('DELETE', `/groups/${g.id}/members/${m.user_id}`);
            toast('Участник исключен', 'success');
            renderActiveView();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      }
    }, ['Исключить из группы'])
  ];

  openModal({
    title: m.full_name || 'Участник',
    body: el('div', { style: 'display: flex; flex-direction: column;' }, actions),
    saveLabel: 'Закрыть',
    onSave: async () => {}
  });
}

function renderMemberRow(m, isAdmin) {
  const isMe = state.user && m.user_id === state.user.id;

  const roleTag = m.role === 'admin'
    ? el('span', { class: 'tag tag-primary' }, ['Админ'])
    : el('span', { class: 'tag tag-mute' }, ['Участник']);

  const displayName = isMe ? 'Вы' : (m.full_name || 'Без имени');
  const subLine = isMe
    ? (m.phone_number ? `${m.phone_number} · это вы` : 'это вы')
    : (m.phone_number || `ID: ${shortId(m.user_id)}`);

  return el('div', { class: 'item' }, [
    el('div', { class: 'avatar-sm', style: `background:${colorFromId(m.user_id)}` }, [
      initials(m.full_name || shortId(m.user_id).slice(0, 2))
    ]),
    el('div', { class: 'item-main' }, [
      el('div', { class: 'item-title' }, [displayName]),
      el('div', { class: 'item-sub' }, [`${subLine} · ${fmtDate(m.joined_at)}`]),
    ]),
    roleTag,
  ]);
}


function openGroupSettingsModal() {
  const g = activeGroup();
  if (!g) return;

  const isOwner = g.owner_id === state.user?.id;
  const actions = [
    el('button', {
      type: 'button',
      class: 'btn btn-ghost btn-block mb-8',
      onclick: () => { closeModal(); openRenameGroupModal(g); }
    }, ['Переименовать группу']),
    el('button', {
      type: 'button',
      class: 'btn btn-danger-ghost btn-block mb-8',
      onclick: () => {
        closeModal();
        confirmDelete('Вы уверены, что хотите покинуть группу?', async () => {
          try {
            await apiCall('POST', `/groups/${g.id}/leave`);
            toast('Вы покинули группу', 'success');
            await bootstrapApp();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      }
    }, ['Покинуть группу']),
  ];

  if (isOwner) {
    actions.push(
      el('button', {
        type: 'button',
        class: 'btn btn-danger btn-block',
        onclick: () => {
          closeModal();
          confirmDelete('УДАЛИТЬ ГРУППУ? Это действие необратимо. Все данные будут потеряны.', async () => {
            try {
              await apiCall('DELETE', `/groups/${g.id}`);
              toast('Группа удалена', 'success');
              await bootstrapApp();
            } catch (err) {
              toast(err.message, 'error');
            }
          });
        }
      }, ['Удалить группу'])
    );
  }

  openModal({
    title: 'Настройки группы',
    body: el('div', { style: 'display: flex; flex-direction: column;' }, actions),
    saveLabel: 'Закрыть',
    onSave: async () => {}
  });
}

function openRenameGroupModal(g) {
  const input = el('input', {
    class: 'input',
    type: 'text',
    value: g.name,
    required: true,
    maxlength: 100,
    style: 'width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text);'
  });

  openModal({
    title: 'Переименовать группу',
    body: el('div', {}, [
      el('p', { class: 'text-sm text-2', style: 'margin-bottom: 8px;' }, ['Новое название:']),
      input
    ]),
    saveLabel: 'Сохранить',
    onSave: async () => {
      const newName = input.value.trim();
      if (!newName) throw new Error('Введите название');
      try {
        await apiCall('PATCH', `/groups/${g.id}`, { name: newName, version: g.version });
        toast('Группа переименована', 'success');
        await bootstrapApp();
      } catch (err) {
        toast(err.message, 'error');
        throw err;
      }
    }
  });
}


function renderInvitationsBanner(container, invitations) {
  if (!invitations || invitations.length === 0) return;
  
  const g = activeGroup(); // просто для контекста

  const banner = el('div', { class: 'card mb-16', style: 'background: var(--primary-soft); border-color: var(--primary);' }, [
    el('div', { class: 'card-title', style: 'color: var(--primary); margin-bottom: 12px;' }, ['Вас пригласили в группы:']),
    ...invitations.map(inv => 
      el('div', { class: 'row-between', style: 'margin-bottom: 8px; padding: 8px; background: var(--surface-2); border-radius: 8px;' }, [
        el('div', {}, [
          el('div', { style: 'font-weight: 600;' }, [inv.group_name]),
          el('div', { class: 'text-xs text-3' }, [`Роль: ${inv.role === 'admin' ? 'Админ' : 'Участник'}`])
        ]),
        el('div', { class: 'row gap-8' }, [
          el('button', { 
            type: 'button', 
            class: 'btn btn-primary btn-sm',
            onclick: async () => {
              try {
                await apiCall('POST', `/groups/${inv.group_id}/join`);
                toast('Вы присоединились к группе', 'success');
                await bootstrapApp();
              } catch (err) { toast(err.message, 'error'); }
            }
          }, ['Принять']),
          el('button', { 
            type: 'button', 
            class: 'btn btn-ghost btn-sm',
            onclick: async () => {
              try {
                await apiCall('POST', `/groups/${inv.group_id}/decline`);
                toast('Приглашение отклонено', 'success');
                await bootstrapApp(); // Перезагружаем, чтобы баннер исчез
              } catch (err) { toast(err.message, 'error'); }
            }
          }, ['Отклонить'])
        ])
      ])
    )
  ]);
  container.appendChild(banner);
}


/* =============================================================
   ONBOARDING TOUR (driver.js)
   ============================================================= */

function startOnboardingTour(force = false) {
  if (!window.driver || !window.driver.js) {
    console.warn('driver.js не загружен');
    return;
  }

  // Если тур уже проходили и не форсим — выходим
  if (!force && localStorage.getItem('zunno-onboarded') === '1') {
    return;
  }

  const steps = [
    {
      popover: {
        title: 'Добро пожаловать в Zunno! 👋',
        description: 'Это короткий тур по приложению. Займёт 30 секунд. Можно пропустить в любой момент.',
        nextBtnText: 'Поехали',
        prevBtnText: 'Назад',
        doneBtnText: 'Начать',
      },
    },
  ];

  // Навигация (если существует)
  if (document.querySelector('.sidebar-nav')) {
    steps.push({
      element: '.sidebar-nav',
      popover: {
        title: 'Навигация',
        description: 'Здесь переключение между разделами: <b>Обзор</b>, <b>Цели</b>, <b>Бюджет</b>, <b>Планы</b> и <b>Профиль</b>.',
        side: 'right',
        align: 'start',
      },
    });
  }

  // Активная группа
  if (document.querySelector('#topbar-group-btn')) {
    steps.push({
      element: '#topbar-group-btn',
      popover: {
        title: 'Активная группа',
        description: 'Здесь показана текущая группа. Клик — открыть список групп и переключиться.',
        side: 'bottom',
        align: 'start',
      },
    });
  }

  // Шестерёнка (настройки группы)
  if (document.querySelector('#group-settings-btn')) {
    steps.push({
      element: '#group-settings-btn',
      popover: {
        title: 'Настройки группы ⚙',
        description: 'Переименовать, покинуть или удалить группу. Доступно только в контексте группы.',
        side: 'bottom',
        align: 'end',
      },
    });
  }

  // Создать / присоединиться
  if (document.querySelector('#btn-new-group') || document.querySelector('#btn-join-group')) {
    steps.push({
      element: document.querySelector('#btn-new-group') ? '#btn-new-group' : '#btn-join-group',
      popover: {
        title: 'Создать или присоединиться',
        description: 'Создайте свою группу или присоединитесь к существующей по ID (его пришлёт админ).',
        side: 'right',
        align: 'end',
      },
    });
  }

  // Профиль
  if (document.querySelector('#topbar-user-btn')) {
    steps.push({
      element: '#topbar-user-btn',
      popover: {
        title: 'Ваш профиль',
        description: 'Здесь смена пароля, редактирование профиля и выход из аккаунта.',
        side: 'bottom',
        align: 'end',
      },
    });
  }

  // Финальный шаг
  steps.push({
    popover: {
      title: 'Готово! 🎉',
      description: 'Тур завершён. Если что-то забудете — в профиле есть кнопка «Пройти тур заново».',
      nextBtnText: 'Понятно',
    },
  });

  const driverObj = window.driver.js.driver({
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
    onDestroyed: () => {
      localStorage.setItem('zunno-onboarded', '1');
    },
    steps,
  });

  driverObj.drive();
}


/* =============================================================
   DRAG & DROP (SortableJS)
   ============================================================= */

function initSortableItems(categoryID, containerEl) {
  if (!window.Sortable || !containerEl) return;

  new window.Sortable(containerEl, {
    animation: 200,
    delay: 200,
    delayOnTouchOnly: true,
    touchStartThreshold: 4,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: async (evt) => {
      const g = activeGroup();
      if (!g) return;

      const ids = Array.from(containerEl.children)
        .filter(node => node.dataset.itemId)
        .map(node => node.dataset.itemId);

      try {
        await apiCall('POST', `/groups/${g.id}/goal-categories/${categoryID}/items/reorder`, { ids });
        toast('Порядок сохранён', 'success', 1500);
      } catch (err) {
        toast(err.message, 'error');
        renderActiveView(); // откатываем
      }
    },
  });
}

function initSortableCategories(groupID, containerEl) {
  if (!window.Sortable || !containerEl) return;

  new window.Sortable(containerEl, {
    animation: 200,
    delay: 200,
    delayOnTouchOnly: true,
    touchStartThreshold: 4,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: async (evt) => {
      const ids = Array.from(containerEl.children)
        .filter(node => node.dataset.catId)
        .map(node => node.dataset.catId);

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
   FAB (Floating Action Button) — быстрый ввод траты
   ============================================================= */

function renderFAB() {
  if (document.getElementById('zunno-fab')) return;
  
  const btn = el('button', {
    type: 'button',
    class: 'fab',
    id: 'zunno-fab',
    'aria-label': 'Быстрое добавление',
    'data-tip': 'Быстро добавить трату',
    onclick: () => openQuickTransactionModal(),
  }, ['+']);
  
  document.body.appendChild(btn);
}

function hideFAB() {
  const btn = document.getElementById('zunno-fab');
  if (btn) btn.remove();
}

function openQuickTransactionModal() {
  const g = activeGroup();
  if (!g) {
    toast('Сначала создайте или выберите группу', 'error');
    return;
  }

  // Загружаем категории
  apiCall('GET', `/groups/${g.id}/categories`).then(res => {
    const cats = res.data || [];
    if (!cats.length) {
      toast('Сначала создайте категорию в бюджете', 'error');
      return;
    }

    const amountInput = el('input', {
      type: 'number',
      step: '0.01',
      min: '0.01',
      required: true,
      placeholder: 'Сумма в ₽',
      class: 'input',
      style: 'width: 100%; padding: 14px; font-size: 20px; text-align: center; font-weight: 600; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); color: var(--text); margin-bottom: 12px;',
    });

    const presets = [100, 500, 1000, 5000];
    const presetsRow = el('div', { class: 'row', style: 'gap: 6px; margin-bottom: 16px; flex-wrap: wrap;' },
      presets.map(p => el('button', {
        type: 'button',
        class: 'preset-btn',
        onclick: () => {
          amountInput.value = p;
          amountInput.focus();
        },
      }, [`${p} ₽`]))
    );

    const catSelect = el('select', {
      class: 'input',
      required: true,
      style: 'width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); margin-bottom: 12px;',
    }, cats.map(c => el('option', { value: c.id }, [c.name])));

    const typeSelect = el('select', {
      class: 'input',
      style: 'width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); margin-bottom: 12px;',
    }, [
      el('option', { value: 'expense' }, ['💸 Расход']),
      el('option', { value: 'income' }, ['💰 Доход']),
    ]);

    const descInput = el('input', {
      type: 'text',
      placeholder: 'Описание (необязательно)',
      maxlength: '255',
      class: 'input',
      style: 'width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text);',
    });

    openModal({
      title: '⚡ Быстрая запись',
      body: el('div', {}, [
        amountInput,
        presetsRow,
        typeSelect,
        catSelect,
        descInput,
      ]),
      saveLabel: 'Добавить',
      onSave: async () => {
        const amount = parseFloat(amountInput.value);
        if (!amount || amount <= 0) throw new Error('Введите сумму');
        
        try {
          await apiCall('POST', `/groups/${g.id}/transactions`, {
            category_id: catSelect.value,
            amount: amount,
            type: typeSelect.value,
            date: new Date().toISOString(),
            description: descInput.value.trim(),
          });
          toast('Добавлено!', 'success');
          renderActiveView();
        } catch (err) {
          toast(err.message, 'error');
          throw err;
        }
      },
    });
  }).catch(err => toast(err.message, 'error'));
}


/* =============================================================
   CALENDAR (Level 5)
   ============================================================= */

let calendarState = {
  view: 'list', // 'list' | 'calendar'
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
};

function renderCalendar(g, plans) {
  const year = calendarState.year;
  const month = calendarState.month;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // понедельник = 0
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Заголовок
  const monthName = firstDay.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const head = el('div', { class: 'calendar-head' }, [
    el('div', { class: 'calendar-title' }, [monthName.charAt(0).toUpperCase() + monthName.slice(1)]),
    el('div', { class: 'calendar-nav' }, [
      el('button', {
        type: 'button',
        class: 'icon-btn sm',
        onclick: () => { calendarState.month--; if (calendarState.month < 0) { calendarState.month = 11; calendarState.year--; } renderActiveView(); },
      }, ['◀']),
      el('button', {
        type: 'button',
        class: 'icon-btn sm',
        onclick: () => { const n = new Date(); calendarState.month = n.getMonth(); calendarState.year = n.getFullYear(); renderActiveView(); },
      }, ['●']),
      el('button', {
        type: 'button',
        class: 'icon-btn sm',
        onclick: () => { calendarState.month++; if (calendarState.month > 11) { calendarState.month = 0; calendarState.year++; } renderActiveView(); },
      }, ['▶']),
    ]),
  ]);

  // Заголовки дней недели
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weekdayRow = el('div', { class: 'calendar-grid' }, [
    ...weekdays.map(d => el('div', { class: 'calendar-weekday' }, [d])),
  ]);

  // Дни
  const grid = el('div', { class: 'calendar-grid' });

  // Пустые ячейки до первого дня
  for (let i = 0; i < startWeekday; i++) {
    grid.appendChild(el('div', { style: 'opacity: 0;' }));
  }

  // Дни месяца
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayPlans = plans.filter(p => {
      const pd = new Date(p.event_date);
      return pd.getFullYear() === year && pd.getMonth() === month && pd.getDate() === d;
    });

    const isToday = isCurrentMonth && today.getDate() === d;

    const dayCell = el('div', {
      class: 'calendar-day' + (isToday ? ' today' : ''),
      onclick: () => {
        // Открываем модалку создания события на этот день
        openCreatePlanModalWithDate(g, date);
      },
    }, [
      el('div', { class: 'calendar-day-num' }, [String(d)]),
      ...dayPlans.slice(0, 3).map(p =>
        el('div', {
          class: 'calendar-event' + (p.is_done ? ' done' : ''),
          title: p.title,
          onclick: (e) => {
            e.stopPropagation();
            // Клик по событию — открываем детали/редактирование
            openEditPlanModal(g, p);
          },
        }, [p.title])
      ),
      dayPlans.length > 3 ? el('div', { class: 'calendar-more' }, [`+${dayPlans.length - 3}`]) : null,
    ].filter(Boolean));

    grid.appendChild(dayCell);
  }

  const calendar = el('div', { class: 'calendar' }, [head, weekdayRow, grid]);
  return calendar;
}

function openEditPlanModal(g, plan) {
  // Простая модалка — показать детали и кнопку «Открыть»
  openModal({
    title: plan.title,
    body: el('div', {}, [
      el('div', { class: 'text-sm text-2', style: 'margin-bottom: 8px;' }, [fmtDateTime(plan.event_date)]),
      plan.description ? el('div', { class: 'text-sm', style: 'margin-bottom: 8px;' }, [plan.description]) : null,
    ].filter(Boolean)),
    saveLabel: 'Закрыть',
    onSave: async () => {},
  });
}


function openCreatePlanModalWithDate(g, date) {
  openModal({
    title: 'Новое событие',
    body: el('div', {}, [
      field('Название', el('input', { name: 'title', required: true, maxlength: 200, placeholder: 'Пикник в парке' })),
      field('Описание', el('textarea', { name: 'description', placeholder: 'Необязательно' })),
      field('Дата и время', el('input', { name: 'event_date', type: 'datetime-local', value: toLocalInput(date.toISOString()), required: true })),
    ]),
    onSave: async (fd) => {
      try {
        await apiCall('POST', `/groups/${g.id}/plans`, {
          title: fd.get('title').trim(),
          description: fd.get('description').trim(),
          event_date: fromLocalInput(fd.get('event_date')),
        });
        toast('Событие создано', 'success');
        await renderActiveView();
      } catch (err) {
        toast(err.message, 'error');
        throw err;
      }
    },
  });
}


/* =============================================================
   SWIPE GESTURES (Level 7.2)
   ============================================================= */

function makeSwipeable(node, onSwipeLeft) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isDragging = false;
  let isHorizontal = null; // null = ещё не определили, true = горизонтальный, false = вертикальный

  const content = node.querySelector('.swipeable-content') || node;
  const THRESHOLD = 80; // пикселей для срабатывания

  node.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    isDragging = false;
    isHorizontal = null;
  }, { passive: true });

  node.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    // Определяем направление на первом значимом движении
    if (isHorizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontal = Math.abs(dx) > Math.abs(dy);
    }

    // Если вертикальный — не мешаем прокрутке
    if (!isHorizontal) return;

    // Свайп только влево (dx < 0)
    if (dx >= 0) return;

    isDragging = true;
    currentX = dx;
    node.classList.add('dragging');

    // Ограничиваем сдвиг
    const offset = Math.max(dx, -120);
    content.style.transform = `translateX(${offset}px)`;
  }, { passive: true });

  node.addEventListener('touchend', () => {
    if (!isDragging) return;

    node.classList.remove('dragging');

    if (currentX < -THRESHOLD) {
      // Сработал свайп — удаляем
      content.style.transform = 'translateX(-100%)';
      setTimeout(() => {
        if (onSwipeLeft) onSwipeLeft();
      }, 200);
    } else {
      // Возврат на место
      content.style.transform = 'translateX(0)';
    }

    isDragging = false;
    isHorizontal = null;
  });
}

function noGroupBanner() {
  return el('div', { class: 'card' }, [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, ['◫']),
      el('div', { class: 'empty-title' }, ['Нет активной группы']),
      el('div', { class: 'empty-text' }, ['Создайте свою или присоединитесь по ID']),
      el('div', { class: 'empty-actions' }, [
        el('button', {
          type: 'button',
          class: 'btn btn-primary',
          onclick: openCreateGroupModal,
        }, ['Создать группу']),
        el('button', {
          type: 'button',
          class: 'btn btn-ghost',
          onclick: openJoinGroupModal,
        }, ['Присоединиться']),
      ]),
    ]),
  ]);
}

/* =============================================================
   VIEW: GOALS
   ============================================================= */

async function renderGoals(container) {
  const g = activeGroup();

  container.innerHTML = '';

  if (!g) {
    container.appendChild(noGroupBanner());
    return;
  }

  const cats = await apiCall('GET', `/groups/${g.id}/goal-categories`)
    .then((r) => r.data || [])
    .catch(() => []);

  container.appendChild(
    sectionHead(
      'Категории целей',
      `${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`,
      el('button', {
        type: 'button',
        class: 'btn btn-primary btn-sm',
        onclick: () => openCreateGoalCategoryModal(g),
      }, ['+ Категория'])
    )
  );

  if (!cats.length) {
    container.appendChild(
      emptyState('◆', 'Пока нет категорий', 'Создайте первую — «Фильмы», «Книги», «Места»')
    );
    return;
  }

  const grid = el('div', { class: 'grid-auto' });
  const cards = await Promise.all(cats.map((c) => renderGoalCategoryCard(g, c)));

  cards.forEach((card, i) => grid.appendChild(stagger(card, i)));
  container.appendChild(grid);

  // Включаем Drag & Drop для категорий
  setTimeout(() => initSortableCategories(g.id, grid), 100);
}

async function renderGoalCategoryCard(g, c) {
  const items = await apiCall('GET', `/groups/${g.id}/goal-categories/${c.id}/items`)
    .then((r) => r.data || [])
    .catch(() => []);

  const done = items.filter((i) => i.done).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  const card = el('div', { class: 'card', 'data-cat-id': c.id });

  card.appendChild(
    el('div', { class: 'card-head' }, [
      el('div', { class: 'row', style: 'gap: 6px;' }, [
        el('div', {
          class: 'drag-handle',
          style: 'cursor: grab; padding: 4px 6px; color: var(--text-3); user-select: none; touch-action: none;',
          title: 'Перетащить категорию',
        }, ['⋮⋮']),
        el('div', {}, [
          el('div', { class: 'card-title' }, [c.name]),
          el('div', { class: 'card-subtitle' }, [items.length ? `${done} / ${items.length}` : 'Пусто']),
        ]),
      ]),
      el('div', { class: 'item-actions' }, [
        el('button', {
          type: 'button',
          class: 'icon-btn sm',
          title: 'Переименовать',
          onclick: () => openRenameGoalCategoryModal(g, c),
        }, ['✎']),
        el('button', {
          type: 'button',
          class: 'icon-btn sm',
          title: 'Удалить',
          onclick: () =>
            confirmDelete(`Удалить категорию «${c.name}»?`, async () => {
              await apiCall('DELETE', `/groups/${g.id}/goal-categories/${c.id}`);
              toast('Удалено', 'success');
              await renderActiveView();
            }),
        }, ['✕']),
      ]),
    ])
  );

  if (items.length) {
    card.appendChild(
      el('div', { class: 'progress' }, [
        el('div', {
          class: `progress-fill${pct === 100 ? ' success' : ''}`,
          style: `width:${pct}%`,
        }),
      ])
    );
  }

  const list = el('div', { class: 'list mt-12' });

  items.forEach((it, i) => {
    const check = el('button', {
      type: 'button',
      class: 'check' + (it.done ? ' on' : ''),
      'aria-label': it.done ? 'Отменить выполнение' : 'Отметить выполненным',
      onclick: () => toggleGoalItem(g, it, check),
    });

    list.appendChild(
      stagger(
        el('div', { class: 'item' + (it.done ? ' is-done' : ''), 'data-item-id': it.id }, [
          el('div', { class: 'drag-handle', style: 'cursor: grab; padding: 4px 6px; color: var(--text-3); user-select: none; touch-action: none;' }, ['⋮⋮']),
          check,
          el('div', { class: 'item-main' }, [
            el('div', { class: 'item-title' }, [it.title]),
            it.description ? el('div', { class: 'item-sub' }, [it.description]) : null,
          ].filter(Boolean)),
          el('button', {
            type: 'button',
            class: 'icon-btn sm',
            title: 'Удалить',
            onclick: () =>
              confirmDelete('Удалить элемент?', async () => {
                await apiCall('DELETE', `/groups/${g.id}/goal-items/${it.id}`);
                toast('Удалено', 'success');
                await renderActiveView();
              }),
          }, ['✕']),
        ]),
        i
      )
    );
  });

  if (!items.length) {
    list.appendChild(
      el('div', {
        class: 'text-sm text-3',
        style: 'padding:8px 0;text-align:center;',
      }, ['Нет элементов'])
    );
  }

  card.appendChild(list);

  // Включаем Drag & Drop для элементов
  setTimeout(() => initSortableItems(c.id, list), 100);

  card.appendChild(
    el('button', {
      type: 'button',
      class: 'btn btn-ghost btn-sm btn-block mt-12',
      onclick: () => openCreateGoalItemModal(g, c),
    }, ['+ Добавить элемент'])
  );

  return card;
}

async function toggleGoalItem(g, item, checkNode) {
  const next = !item.done;

  checkNode.classList.toggle('on', next);
  item.done = next;

  try {
    await apiCall('PATCH', `/groups/${g.id}/goal-items/${item.id}`, {
      done: next,
      version: item.version,
    });

    await renderActiveView();
  } catch (err) {
    item.done = !next;
    checkNode.classList.toggle('on', !next);
    toast(err.message, 'error');
  }
}

/* =============================================================
   VIEW: BUDGET
   ============================================================= */

async function renderBudget(container) {
  const g = activeGroup();

  container.innerHTML = '';

  if (!g) {
    container.appendChild(noGroupBanner());
    return;
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [cats, txs, summary, membersSpent, analytics] = await Promise.all([
    apiCall('GET', `/groups/${g.id}/categories`).then((r) => r.data || []),
    apiCall('GET', `/groups/${g.id}/transactions?limit=50`).then((r) => r.data || []),
    apiCall('GET', `/groups/${g.id}/budget/summary?month=${month}`)
      .then((r) => r.data)
      .catch(() => null),
    apiCall('GET', `/groups/${g.id}/budget/members?month=${month}`)
      .then((r) => r.data || [])
      .catch(() => []),
    apiCall('GET', `/groups/${g.id}/analytics`)
      .then((r) => r.data || [])
      .catch(() => []),
  ]);

  if (summary) {
    const spent = summary.total_spent || 0;
    const limit = summary.total_limit || 0;
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

    container.appendChild(
      el('div', { class: 'card' }, [
        el('div', { class: 'row-between' }, [
          el('div', {}, [
            el('div', { class: 'stat-label' }, ['Потрачено за месяц']),
            el('div', { class: 'stat-value primary' }, [fmtMoney(spent)]),
          ]),
          el('div', { style: 'text-align:right;' }, [
            el('div', { class: 'stat-label' }, ['Лимит']),
            el('div', { class: 'stat-value' }, [fmtMoney(limit)]),
          ]),
        ]),
        limit > 0
          ? el('div', { class: 'progress mt-16' }, [
              el('div', {
                class: `progress-fill${spent > limit ? ' danger' : ''}`,
                style: `width:${pct}%`,
              }),
            ])
          : null,
      ].filter(Boolean))
    );
  }

  container.appendChild(
    el('div', { class: 'section' }, [
      sectionHead(
        'Категории',
        `${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`,
        el('div', { class: 'row', style: 'gap: 8px;' }, [
          el('button', {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onclick: () => {
              const url = `/api/v1/groups/${g.id}/transactions/export`;
              fetch(url, { headers: { 'Authorization': `Bearer ${state.token}` } })
                .then(res => {
                  if (!res.ok) throw new Error('Ошибка экспорта');
                  return res.blob();
                })
                .then(blob => {
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `zunno-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(link.href);
                  toast('CSV скачан', 'success');
                })
                .catch(err => toast(err.message, 'error'));
            },
          }, ['📥 CSV']),
          el('button', {
            type: 'button',
            class: 'btn btn-primary btn-sm',
            onclick: () => openCreateCategoryModal(g),
          }, ['+ Категория']),
        ]),
      ),
      cats.length
        ? el(
            'div',
            { class: 'grid-auto' },
            cats.map((c, i) => stagger(renderCategoryCard(g, c, summary), i))
          )
        : emptyState('≡', 'Нет категорий', 'Добавьте «Еду», «Транспорт», «Развлечения»'),
    ])
  );

  container.appendChild(
    el('div', { class: 'section' }, [
      sectionHead(
        'Транзакции',
        `Последние ${txs.length}`,
        el('button', {
          type: 'button',
          class: 'btn btn-primary btn-sm',
          onclick: () => openCreateTransactionModal(g, cats),
        }, ['+ Транзакция'])
      ),
      el('div', { class: 'card mt-12 mb-12', style: 'display: flex; gap: 8px; flex-wrap: wrap; padding: 12px;' }, [
        el('input', { type: 'text', class: 'input', placeholder: 'Поиск по описанию...', style: 'flex: 1; min-width: 150px; padding: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text);', id: 'tx-search' }),
        el('select', { class: 'input', style: 'padding: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text);', id: 'tx-cat' }, [
          el('option', { value: '' }, ['Все категории']),
          ...cats.map(c => el('option', { value: c.id }, [c.name]))
        ]),
        el('select', { class: 'input', style: 'padding: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text);', id: 'tx-user' }, [
          el('option', { value: '' }, ['Все участники']),
          ...membersSpent.map(m => el('option', { value: m.user_id }, [m.full_name]))
        ])
      ]),
      el('div', { class: 'list', id: 'tx-list' }, 
        txs.length ? txs.map((t, i) => stagger(renderTransactionRow(t, cats), i)) : emptyState('≡', 'Нет транзакций', 'Добавьте первую — и увидите статистику')
      ),
      (function() {
        setTimeout(() => {
          const searchInp = document.getElementById('tx-search');
          const catSel = document.getElementById('tx-cat');
          const userSel = document.getElementById('tx-user');
          const listDiv = document.getElementById('tx-list');
          
          if (!searchInp || !listDiv) return;
          
          let debounce;
          const fetchFiltered = async () => {
            clearTimeout(debounce);
            debounce = setTimeout(async () => {
              listDiv.innerHTML = '<div class="empty text-sm">Загрузка...</div>';
              const params = new URLSearchParams();
              if (searchInp.value.trim()) params.append('q', searchInp.value.trim());
              if (catSel.value) params.append('category_id', catSel.value);
              if (userSel.value) params.append('user_id', userSel.value);
              params.append('limit', '50');

              try {
                const res = await apiCall('GET', `/groups/${g.id}/transactions?${params.toString()}`);
                listDiv.innerHTML = '';
                if (!res.data || res.data.length === 0) {
                  listDiv.innerHTML = '<div class="empty"><div class="empty-ico">≡</div><div class="empty-title">Ничего не найдено</div><div class="empty-text">Попробуйте изменить фильтры</div></div>';
                } else {
                  res.data.forEach((t, i) => listDiv.appendChild(stagger(renderTransactionRow(t, cats), i)));
                }
              } catch (e) {
                listDiv.innerHTML = `<div class="empty text-danger">Ошибка: ${e.message}</div>`;
              }
            }, 300);
          };

          searchInp.addEventListener('input', fetchFiltered);
          catSel.addEventListener('change', fetchFiltered);
          userSel.addEventListener('change', fetchFiltered);
        }, 50);
        return null;
      })()
    ])
  );
}

function renderCategoryCard(g, c, summary) {
  const item = summary?.categories?.find((x) => x.category_id === c.id) || null;
  const spent = item?.spent || 0;
  const pct = c.budget_limit > 0 ? Math.min(100, (spent / c.budget_limit) * 100) : 0;

  return el('div', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('div', {}, [
        el('div', { class: 'card-title' }, [c.name]),
        el('div', { class: 'card-subtitle' }, [
          el(
            'span',
            { class: `tag ${c.type === 'fixed' ? 'tag-primary' : 'tag-mute'}` },
            [c.type === 'fixed' ? 'Постоянная' : 'Спонтанная']
          ),
        ]),
      ]),
      el('button', {
        type: 'button',
        class: 'icon-btn sm',
        title: 'Удалить',
        onclick: () =>
          confirmDelete(`Удалить «${c.name}»?`, async () => {
            await apiCall('DELETE', `/groups/${g.id}/categories/${c.id}`);
            toast('Удалено', 'success');
            await renderActiveView();
          }),
      }, ['✕']),
    ]),
    el('div', { class: 'row-between text-sm' }, [
      el('span', { class: 'text-2' }, ['Потрачено']),
      el('span', { class: 'mono' }, [fmtMoney(spent)]),
    ]),
    el('div', { class: 'row-between text-sm mt-8' }, [
      el('span', { class: 'text-2' }, ['Лимит']),
      el('span', { class: 'mono' }, [fmtMoney(c.budget_limit)]),
    ]),
    el('div', { class: 'progress mt-12' }, [
      el('div', {
        class: `progress-fill${spent > c.budget_limit && c.budget_limit > 0 ? ' danger' : ''}`,
        style: `width:${pct}%`,
      }),
    ]),
  ]);
}

function renderTransactionRow(t, cats) {
  const cat = cats.find((c) => c.id === t.category_id);
  const isMe = state.user && t.user_id === state.user.id;
  const g = activeGroup();

  const content = el('div', { class: 'item swipeable-content', 'data-tx-id': t.id }, [
    el('div', { class: 'flex-1' }, [
      el('div', { class: 'item-title' }, [t.description || cat?.name || 'Без описания']),
      el('div', { class: 'item-sub' }, [
        `${cat ? cat.name : 'Без категории'} · ${fmtDateTime(t.date)}${isMe ? ' · вы' : ''}`,
      ]),
    ]),
    el('div', { class: `mono ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`, style: 'margin-right: 8px;' }, [
      `${t.type === 'income' ? '+' : '−'}${fmtMoney(t.amount)}`
    ]),
    el('button', {
      type: 'button',
      class: 'icon-btn sm',
      'data-tip': 'Удалить транзакцию',
      style: 'width: 28px; height: 28px; border-radius: 6px; color: var(--text-3);',
      onclick: () => handleDeleteTransaction(t, g),
    }, ['✕']),
  ]);

  const wrapper = el('div', { class: 'swipeable' }, [
    el('div', { class: 'swipeable-actions' }, [
      el('div', { class: 'swipe-action' }, ['Удалить']),
    ]),
    content,
  ]);

  makeSwipeable(wrapper, () => handleDeleteTransaction(t, g));
  return wrapper;
}

function handleDeleteTransaction(t, g) {
  if (!g) return;
  const parent = document.querySelector(`[data-tx-id="${t.id}"]`);
  if (parent) parent.closest('.swipeable').style.display = 'none';
  
  deleteWithUndo({
    label: `Транзакция «${t.description || 'Без описания'}»`,
    onConfirm: async () => {
      try {
        await apiCall('DELETE', `/groups/${g.id}/transactions/${t.id}`);
        renderActiveView();
      } catch (err) {
        toast(err.message, 'error');
        if (parent) parent.closest('.swipeable').style.display = '';
      }
    },
    onCancel: () => {
      if (parent) parent.closest('.swipeable').style.display = '';
    }
  });
}

/* =============================================================
   VIEW: PLANS
   ============================================================= */

async function renderPlans(container) {
  const g = activeGroup();

  container.innerHTML = '';

  if (!g) {
    container.appendChild(noGroupBanner());
    return;
  }

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  const plans = await apiCall('GET', `/groups/${g.id}/plans?from=${from}&to=${to}`)
    .then((r) => r.data || [])
    .catch(() => []);

  // Заголовок с переключателем Список / Календарь
  const toggle = el('div', { class: 'view-toggle' }, [
    el('button', {
      type: 'button',
      class: calendarState.view === 'list' ? 'active' : '',
      onclick: () => { calendarState.view = 'list'; renderActiveView(); },
    }, ['Список']),
    el('button', {
      type: 'button',
      class: calendarState.view === 'calendar' ? 'active' : '',
      onclick: () => { calendarState.view = 'calendar'; renderActiveView(); },
    }, ['Календарь']),
  ]);

  container.appendChild(
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('div', { class: 'section-title' }, ['События']),
        el('div', { class: 'section-desc' }, [`${plans.length} ${plural(plans.length, 'событие', 'события', 'событий')}`]),
      ]),
      el('div', { class: 'row', style: 'gap: 8px;' }, [
        toggle,
        el('button', {
          type: 'button',
          class: 'btn btn-primary btn-sm',
          onclick: () => openCreatePlanModal(g),
        }, ['+ Событие']),
      ]),
    ])
  );

  // Если выбран вид "Календарь" — рендерим календарь и выходим
  if (calendarState.view === 'calendar') {
    // Загружаем события на текущий отображаемый месяц (с запасом)
    const calFrom = new Date(calendarState.year, calendarState.month - 1, 1).toISOString();
    const calTo = new Date(calendarState.year, calendarState.month + 2, 0).toISOString();
    const calPlans = await apiCall('GET', `/groups/${g.id}/plans?from=${calFrom}&to=${calTo}`)
      .then((r) => r.data || [])
      .catch(() => []);

    container.appendChild(renderCalendar(g, calPlans));
    return;
  }

  if (!plans.length) {
    container.appendChild(
      emptyState('◷', 'Пока нет планов', 'Создайте первое событие — пикник, поездку, вечеринку')
    );
    return;
  }

  const grid = el('div', { class: 'grid-auto' });
  const cards = await Promise.all(plans.map((p) => renderPlanCard(g, p)));

  cards.forEach((card, i) => grid.appendChild(stagger(card, i)));
  container.appendChild(grid);
}

async function renderPlanCard(g, p) {
  const items = await apiCall('GET', `/groups/${g.id}/plans/${p.id}/checklist`)
    .then((r) => r.data || [])
    .catch(() => []);

  const done = items.filter((i) => i.is_checked).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  const card = el('div', { class: 'card' + (p.is_done ? ' is-done' : '') });

  card.appendChild(
    el('div', { class: 'card-head' }, [
      el('div', {}, [
        el('div', { class: 'card-title' }, [p.title]),
        el('div', { class: 'card-subtitle' }, [
          `${fmtDateTime(p.event_date)} · ${fmtRelative(p.event_date)}`,
        ]),
      ]),
      el('div', { class: 'item-actions' }, [
        el('button', {
          type: 'button',
          class: 'icon-btn sm',
          title: p.is_done ? 'Вернуть в активные' : 'Отметить выполненным',
          onclick: () => togglePlan(g, p),
        }, [p.is_done ? '↺' : '✓']),
        el('button', {
          type: 'button',
          class: 'icon-btn sm',
          title: 'Удалить',
          onclick: () =>
            confirmDelete('Удалить событие?', async () => {
              await apiCall('DELETE', `/groups/${g.id}/plans/${p.id}`);
              toast('Удалено', 'success');
              await renderActiveView();
            }),
        }, ['✕']),
      ]),
    ])
  );

  if (p.description) {
    card.appendChild(
      el('div', { class: 'text-sm text-2', style: 'margin-bottom:8px;' }, [p.description])
    );
  }

  if (items.length) {
    card.appendChild(
      el('div', { class: 'progress' }, [
        el('div', {
          class: `progress-fill${pct === 100 ? ' success' : ''}`,
          style: `width:${pct}%`,
        }),
      ])
    );

    card.appendChild(
      el('div', { class: 'text-xs text-3 mt-8' }, [`${done} / ${items.length} пунктов`])
    );

    const list = el('div', { class: 'list mt-12' });

    items.forEach((it, i) => {
      const check = el('button', {
        type: 'button',
        class: 'check' + (it.is_checked ? ' on' : ''),
        'aria-label': it.is_checked ? 'Отменить выполнение' : 'Отметить выполненным',
        onclick: () => toggleChecklistItem(g, it, check),
      });

      list.appendChild(
        stagger(
          el('div', { class: 'item' + (it.is_checked ? ' is-done' : '') }, [
            check,
            el('div', { class: 'item-main' }, [
              el('div', {
                class: 'item-title',
                style: 'font-size:13px;font-weight:500;',
              }, [it.text]),
            ]),
            el('button', {
              type: 'button',
              class: 'icon-btn sm',
              title: 'Удалить',
              onclick: async () => {
                try {
                  await apiCall('DELETE', `/groups/${g.id}/checklist/${it.id}`);
                  toast('Удалено', 'success');
                  await renderActiveView();
                } catch (err) {
                  toast(err.message, 'error');
                }
              },
            }, ['✕']),
          ]),
          i
        )
      );
    });

    card.appendChild(list);
  }

  card.appendChild(
    el('button', {
      type: 'button',
      class: 'btn btn-ghost btn-sm btn-block mt-12',
      onclick: () => openCreateChecklistModal(g, p),
    }, ['+ пункт'])
  );

  return card;
}

async function togglePlan(g, p) {
  const next = !p.is_done;

  try {
    await apiCall('PATCH', `/groups/${g.id}/plans/${p.id}`, {
      title: p.title,
      description: p.description || '',
      event_date: p.event_date,
      is_done: next,
      version: p.version,
    });

    toast(next ? 'Событие выполнено' : 'Событие возвращено в планы', 'success');
    await renderActiveView();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function toggleChecklistItem(g, item, checkNode) {
  const next = !item.is_checked;

  checkNode.classList.toggle('on', next);
  item.is_checked = next;

  try {
    await apiCall('PATCH', `/groups/${g.id}/checklist/${item.id}`, {
      text: item.text,
      is_checked: next,
      version: item.version,
    });

    await renderActiveView();
  } catch (err) {
    item.is_checked = !next;
    checkNode.classList.toggle('on', !next);
    toast(err.message, 'error');
  }
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
  const wrap = el('div', { style: 'max-width:560px;' });

  wrap.appendChild(
    el('div', { class: 'card' }, [
      el('div', { class: 'row', style: 'gap:14px;margin-bottom:18px;' }, [
        el('div', { class: 'avatar', style: 'width:58px;height:58px;font-size:18px;border-radius:20px;' }, [
          initials(u.full_name),
        ]),
        el('div', {}, [
          el('div', { style: 'font-size:16px;font-weight:700;' }, [u.full_name || '—']),
          el('div', { class: 'text-sm text-3' }, [u.phone_number || '—']),
        ]),
      ]),

      el(
        'form',
        {
          class: 'form',
          onsubmit: async (e) => {
            e.preventDefault();

            const fd = new FormData(e.target);

            try {
              const res = await apiCall('PATCH', '/users/me', {
                full_name: String(fd.get('full_name') || '').trim(),
                age: Number(fd.get('age')),
                phone_number: String(fd.get('phone_number') || '').trim(),
                currency: String(fd.get('currency') || 'RUB').trim(),
                version: u.version,
              });

              state.user = res.data;
              toast('Профиль обновлён', 'success');
              await renderProfile(container);
            } catch (err) {
              toast(err.message, 'error');
            }
          },
        },
        [
          field(
            'Имя',
            el('input', {
              name: 'full_name',
              value: u.full_name || '',
              required: true,
              minlength: 3,
              maxlength: 100,
            })
          ),
          field(
            'Возраст',
            el('input', {
              name: 'age',
              type: 'number',
              value: u.age,
              min: 18,
              max: 100,
              required: true,
            })
          ),
          field(
            'Телефон',
            el('input', {
              name: 'phone_number',
              type: 'tel',
              value: u.phone_number || '',
              required: true,
            })
          ),
          field('Валюта', el('select', { name: 'currency' }, [
            el('option', { value: 'RUB', selected: u.currency === 'RUB' || !u.currency }, ['₽ Рубль']),
            el('option', { value: 'USD', selected: u.currency === 'USD' }, ['$ Доллар']),
            el('option', { value: 'EUR', selected: u.currency === 'EUR' }, ['€ Евро']),
            el('option', { value: 'KZT', selected: u.currency === 'KZT' }, ['₸ Тенге']),
            el('option', { value: 'BYN', selected: u.currency === 'BYN' }, ['Br Белорусский рубль']),
          ])),
          el('button', { type: 'submit', class: 'btn btn-primary btn-block mt-8' }, ['Сохранить']),
        ]
      ),

      el('div', { class: 'text-xs text-3 mt-16' }, [
        `Создан: ${fmtDate(u.created_at)} · версия ${u.version}`,
      ]),
    ])
  );

  wrap.appendChild(
    el('div', { class: 'card mt-16' }, [
      el('div', { class: 'card-title' }, ['Опасная зона']),
      el('div', { class: 'text-sm text-3 mt-8' }, [
        'Удаление аккаунта необратимо. Все данные будут стёрты.',
      ]),
      el('button', {
        type: 'button',
        class: 'btn btn-ghost btn-block mt-8',
        onclick: openChangePasswordModal,
      }, ['Сменить пароль']),
      el('button', {
        type: 'button',
        class: 'btn btn-ghost btn-block mt-8',
        onclick: () => startOnboardingTour(true),
      }, ['Пройти тур заново']),
      el('button', {
        type: 'button',
        class: 'btn btn-block mt-8',
        style: 'background: #229ED9; color: #fff; border: none; font-weight: 600;',
        onclick: () => {
          if (!state.user) return;
          window.open(`https://t.me/zunno_notify_bot?start=${state.user.id}`, '_blank');
        },
      }, ['✈ Привязать Telegram']),
      el('button', {
        type: 'button',
        class: 'btn btn-danger btn-block mt-12',
        onclick: openDeleteAccountModal,
      }, ['Удалить аккаунт']),
      el('button', {
        type: 'button',
        class: 'btn btn-ghost btn-block mt-8',
        onclick: logout,
      }, ['Выйти из аккаунта']),
    ])
  );

  container.appendChild(wrap);
}

/* =============================================================
   UI HELPERS
   ============================================================= */

function field(label, control, hint) {
  const children = [el('span', { class: 'field-label' }, [label]), control];

  if (hint) {
    children.push(el('span', { class: 'field-hint' }, [hint]));
  }

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

function emptyState(icon, title, text) {
  return el('div', { class: 'card' }, [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, [icon]),
      el('div', { class: 'empty-title' }, [title]),
      el('div', { class: 'empty-text' }, [text]),
    ]),
  ]);
}

/* =============================================================
   MODAL
   ============================================================= */

function openModal({ title, body, onSave, saveLabel = 'Сохранить', danger = false }) {
  const root = $('#modal-root');
  if (!root) return;

  root.innerHTML = '';

  const backdrop = el('div', {
    class: 'modal-backdrop',
    onclick: (e) => {
      if (e.target === backdrop) closeModal();
    },
  });

  const modal = el('div', {
    class: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  });

  modal.appendChild(el('div', { class: 'modal-title' }, [title]));

  const form = el('form', { class: 'modal-body', novalidate: true });
  form.appendChild(body);

  const submit = el(
    'button',
    {
      type: 'submit',
      class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`,
    },
    [saveLabel]
  );

  form.appendChild(
    el('div', { class: 'modal-actions' }, [
      el('button', {
        type: 'button',
        class: 'btn btn-ghost',
        onclick: closeModal,
      }, ['Отмена']),
      submit,
    ])
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const oldLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = '…';

    try {
      await onSave(new FormData(form));
      closeModal();
    } catch (err) {
      toast(err.message || 'Ошибка', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = oldLabel;
    }
  });

  modal.appendChild(form);
  backdrop.appendChild(modal);
  root.appendChild(backdrop);

  const first = modal.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 70);
}

function closeModal() {
  const root = $('#modal-root');
  if (root) root.innerHTML = '';
}

async function confirmDelete(message, onConfirm) {
  openModal({
    title: 'Подтверждение',
    body: el('div', { class: 'text-dim' }, [message]),
    saveLabel: 'Удалить',
    onSave: async () => { await onConfirm(); },
  });
}

/* =============================================================
   UNDO DELETE (5 seconds buffer)
   ============================================================= */

function deleteWithUndo({ label, onConfirm, onCancel }) {
  // Показываем тост с кнопкой «Отменить»
  const root = $('#toasts');
  if (!root) {
    // Fallback: если тостов нет — просто удаляем сразу
    onConfirm();
    return;
  }

  const icons = { warning: '⚠', success: '✓' };
  const node = el('div', { class: 'toast toast-warning', role: 'status' }, [
    el('div', { class: 'toast-ico' }, [icons.warning]),
    el('div', { class: 'toast-msg', style: 'flex: 1;' }, [`${label} удалено`]),
    el('button', {
      type: 'button',
      class: 'btn btn-xs',
      style: 'background: transparent; border: 1px solid currentColor; color: inherit; padding: 2px 8px; font-size: 11px; border-radius: 6px; margin-left: 4px;',
      onclick: () => {
        clearTimeout(timer);
        node.classList.add('hide');
        setTimeout(() => node.remove(), 240);
        if (onCancel) onCancel();
        toast('Отменено', 'info', 1500);
      },
    }, ['Отменить']),
  ]);

  root.appendChild(node);

  // Через 5 секунд — реальное удаление
  const timer = setTimeout(() => {
    node.classList.add('hide');
    setTimeout(() => node.remove(), 240);
    onConfirm();
  }, 5000);
}

function confirmDelete(message, onConfirm) {
  openModal({
    title: 'Подтверждение',
    body: el('div', { class: 'text-2' }, [message]),
    saveLabel: 'Удалить',
    danger: true,
    onSave: async () => {
      await onConfirm();
    },
  });
}

/* =============================================================
   SHEET
   ============================================================= */

function openSheet({ title, content }) {
  const root = $('#sheet-root');
  if (!root) return;

  root.innerHTML = '';

  const backdrop = el('div', {
    class: 'sheet-backdrop',
    onclick: (e) => {
      if (e.target === backdrop) closeSheet();
    },
  });

  const sheet = el('div', { class: 'sheet' }, [
    el('div', { class: 'sheet-handle' }),
    title ? el('div', { class: 'sheet-title' }, [title]) : null,
    content,
  ].filter(Boolean));

  backdrop.appendChild(sheet);
  root.appendChild(backdrop);
}

function closeSheet() {
  const root = $('#sheet-root');
  if (root) root.innerHTML = '';
}

/* =============================================================
   MODALS · GROUP
   ============================================================= */

function openCreateGroupModal() {
  openModal({
    title: 'Новая группа',
    body: field(
      'Название',
      el('input', {
        name: 'name',
        required: true,
        maxlength: 100,
        placeholder: 'Например, Семья',
      })
    ),
    onSave: async (fd) => {
      const res = await apiCall('POST', '/groups', {
        name: String(fd.get('name') || '').trim(),
      });

      state.groups.push(res.data);
      state.activeGroupId = res.data.id;
      localStorage.setItem('active_group', res.data.id);

      renderSidebarGroups();
      renderTopbarGroup();
      await renderActiveView();

      toast('Группа создана', 'success');
    },
  });
}

function openJoinGroupModal() {
  openModal({
    title: 'Присоединиться по ID',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, [
        'Введите ID группы, который вам прислал администратор.',
      ]),
      field(
        'Group ID',
        el('input', {
          class: 'copy-input',
          name: 'group_id',
          required: true,
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        })
      ),
    ]),
    saveLabel: 'Присоединиться',
    onSave: async (fd) => {
      const gid = String(fd.get('group_id') || '').trim();

      await apiCall('POST', `/groups/${gid}/join`);
      toast('Вы присоединились', 'success');
      await bootstrapApp();
    },
  });
}

function openInviteModal(g) {
  openModal({
    title: 'Пригласить в группу',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, ['Отправьте другу ID группы:']),
      el('div', { class: 'row mt-8', style: 'gap:8px;' }, [
        el('input', {
          class: 'copy-input flex-1',
          type: 'text',
          value: g.id,
          readonly: true,
          onclick: (e) => e.target.select(),
        }),
        el('button', {
          type: 'button',
          class: 'btn btn-primary',
          onclick: () => copyText(g.id, 'ID группы скопирован'),
        }, ['Копировать']),
      ]),
      el('p', { class: 'text-xs text-3 mt-12' }, [
        'Друг зайдёт по адресу приложения, нажмёт «Присоединиться» и вставит этот ID.',
      ]),
    ]),
    saveLabel: 'Готово',
    onSave: async () => {},
  });
}

/* =============================================================
   MODALS · GOALS
   ============================================================= */

function openCreateGoalCategoryModal(g) {
  openModal({
    title: 'Новая категория целей',
    body: field(
      'Название',
      el('input', {
        name: 'name',
        required: true,
        maxlength: 100,
        placeholder: 'Фильмы',
      })
    ),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/goal-categories`, {
        name: String(fd.get('name') || '').trim(),
      });

      toast('Создано', 'success');
      await renderActiveView();
    },
  });
}

function openRenameGoalCategoryModal(g, c) {
  openModal({
    title: 'Переименовать',
    body: field(
      'Название',
      el('input', {
        name: 'name',
        required: true,
        maxlength: 100,
        value: c.name,
      })
    ),
    onSave: async (fd) => {
      await apiCall('PATCH', `/groups/${g.id}/goal-categories/${c.id}`, {
        name: String(fd.get('name') || '').trim(),
        version: c.version,
      });

      toast('Обновлено', 'success');
      await renderActiveView();
    },
  });
}

function openCreateGoalItemModal(g, c) {
  openModal({
    title: 'Новый элемент',
    body: el('div', {}, [
      field(
        'Название',
        el('input', {
          name: 'title',
          required: true,
          maxlength: 200,
          placeholder: 'Посмотреть Дюну',
        })
      ),
      field('Описание', el('textarea', {
        name: 'description',
        placeholder: 'Необязательно',
      })),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/goal-categories/${c.id}/items`, {
        title: String(fd.get('title') || '').trim(),
        description: String(fd.get('description') || '').trim(),
      });

      toast('Добавлено', 'success');
      await renderActiveView();
    },
  });
}

/* =============================================================
   MODALS · BUDGET
   ============================================================= */

function openCreateCategoryModal(g) {
  openModal({
    title: 'Новая категория',
    body: el('div', {}, [
      field(
        'Название',
        el('input', {
          name: 'name',
          required: true,
          maxlength: 100,
          placeholder: 'Еда',
        })
      ),
      field(
        'Тип',
        el('select', { name: 'type', required: true }, [
          el('option', { value: 'fixed' }, ['Постоянная (еда, дом)']),
          el('option', { value: 'spontaneous' }, ['Спонтанная']),
        ])
      ),
      field(
        'Лимит в месяц (₽)',
        el('input', {
          name: 'budget_limit',
          type: 'number',
          min: 0,
          step: '0.01',
          value: 0,
          required: true,
        })
      ),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/categories`, {
        name: String(fd.get('name') || '').trim(),
        type: fd.get('type'),
        budget_limit: Number(fd.get('budget_limit')),
      });

      toast('Создано', 'success');
      await renderActiveView();
    },
  });
}

function openCreateTransactionModal(g, cats) {
  if (!cats.length) {
    toast('Сначала создайте категорию', 'error');
    return;
  }

  openModal({
    title: 'Новая транзакция',
    body: el('div', {}, [
      field(
        'Категория',
        el(
          'select',
          { name: 'category_id', required: true },
          cats.map((c) => el('option', { value: c.id }, [c.name]))
        )
      ),
      field(
        'Сумма (₽)',
        el('input', {
          name: 'amount',
          type: 'number',
          min: 0.01,
          step: '0.01',
          required: true,
        })
      ),
      field(
        'Дата',
        el('input', {
          name: 'date',
          type: 'datetime-local',
          value: toLocalInput(new Date().toISOString()),
          required: true,
        })
      ),
      field(
        'Описание',
        el('input', {
          name: 'description',
          maxlength: 255,
          placeholder: 'Обед в кафе',
        })
      ),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/transactions`, {
        category_id: fd.get('category_id'),
        amount: Number(fd.get('amount')),
        date: fromLocalInput(fd.get('date')),
        description: String(fd.get('description') || '').trim(),
      });

      toast('Добавлено', 'success');
      await renderActiveView();
    },
  });
}

/* =============================================================
   MODALS · PLANS
   ============================================================= */

function openCreatePlanModal(g) {
  openModal({
    title: 'Новое событие',
    body: el('div', {}, [
      field(
        'Название',
        el('input', {
          name: 'title',
          required: true,
          maxlength: 200,
          placeholder: 'Пикник в парке',
        })
      ),
      field('Описание', el('textarea', {
        name: 'description',
        placeholder: 'Необязательно',
      })),
      field(
        'Дата и время',
        el('input', {
          name: 'event_date',
          type: 'datetime-local',
          value: toLocalInput(new Date().toISOString()),
          required: true,
        })
      ),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/plans`, {
        title: String(fd.get('title') || '').trim(),
        description: String(fd.get('description') || '').trim(),
        event_date: fromLocalInput(fd.get('event_date')),
      });

      toast('Создано', 'success');
      await renderActiveView();
    },
  });
}

function openCreateChecklistModal(g, p) {
  openModal({
    title: 'Новый пункт',
    body: field(
      'Текст',
      el('input', {
        name: 'text',
        required: true,
        maxlength: 500,
        placeholder: 'Взять плед',
      })
    ),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/plans/${p.id}/checklist`, {
        text: String(fd.get('text') || '').trim(),
      });

      toast('Добавлено', 'success');
      await renderActiveView();
    },
  });
}

/* =============================================================
   MODALS · PROFILE
   ============================================================= */


function openChangePasswordModal() {
  const oldPwd = el('input', { class: 'input', type: 'password', placeholder: 'Текущий пароль', style: 'width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); margin-bottom: 12px;' });
  const newPwd = el('input', { class: 'input', type: 'password', placeholder: 'Новый пароль (мин. 8 символов)', style: 'width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text);' });

  openModal({
    title: 'Смена пароля',
    body: el('div', {}, [
      el('p', { class: 'text-sm text-2', style: 'margin-bottom: 12px;' }, ['Введите старый и новый пароль.']),
      oldPwd,
      newPwd
    ]),
    saveLabel: 'Сохранить',
    onSave: async () => {
      if (!oldPwd.value || !newPwd.value) throw new Error('Заполните все поля');
      try {
        await apiCall('PATCH', '/users/me/password', { old_password: oldPwd.value, new_password: newPwd.value });
        toast('Пароль успешно изменён', 'success');
      } catch (err) {
        toast(err.message, 'error');
        throw err;
      }
    }
  });
}

function openDeleteAccountModal() {
  openModal({
    title: 'Удалить аккаунт?',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, [
        'Это действие необратимо. Введите пароль для подтверждения.',
      ]),
      field(
        'Пароль',
        el('input', {
          name: 'password',
          type: 'password',
          required: true,
        })
      ),
    ]),
    saveLabel: 'Удалить навсегда',
    danger: true,
    onSave: async (fd) => {
      await apiCall('DELETE', '/users/me', {
        password: fd.get('password'),
      });

      toast('Аккаунт удалён', 'success');
      logout();
    },
  });
}

/* =============================================================
   GROUP SHEET
   ============================================================= */

function openGroupSheet() {
  const content = el('div', {}, []);

  const list = el('div', { class: 'sheet-actions' });

  if (!state.groups.length) {
    list.appendChild(
      el('div', {
        class: 'text-sm text-3',
        style: 'text-align:center;padding:12px;',
      }, ['Нет групп'])
    );
  } else {
    for (const g of state.groups) {
      list.appendChild(
        el(
          'button',
          {
            type: 'button',
            class: 'sheet-action',
            onclick: () => switchGroup(g.id),
          },
          [
            el('span', { class: 'sheet-action-icon' }, [g.id === state.activeGroupId ? '●' : '○']),
            el('span', { class: 'flex-1' }, [g.name]),
            g.id === state.activeGroupId ? el('span', { class: 'tag tag-primary' }, ['активна']) : null,
          ].filter(Boolean)
        )
      );
    }
  }

  content.appendChild(list);

  const actions = el('div', { class: 'sheet-actions mt-12' }, [
    el(
      'button',
      {
        type: 'button',
        class: 'sheet-action',
        onclick: () => {
          closeSheet();
          openCreateGroupModal();
        },
      },
      [
        el('span', { class: 'sheet-action-icon' }, ['+']),
        el('span', { class: 'flex-1' }, ['Создать группу']),
      ]
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'sheet-action',
        onclick: () => {
          closeSheet();
          openJoinGroupModal();
        },
      },
      [
        el('span', { class: 'sheet-action-icon' }, ['→']),
        el('span', { class: 'flex-1' }, ['Присоединиться по ID']),
      ]
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'sheet-action',
        onclick: () => {
          const g = activeGroup();
          if (!g) {
            toast('Нет активной группы', 'error');
            return;
          }

          copyText(g.id, 'ID группы скопирован');
          closeSheet();
        },
      },
      [
        el('span', { class: 'sheet-action-icon' }, ['⧉']),
        el('span', { class: 'flex-1' }, ['Скопировать ID группы']),
      ]
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'sheet-action',
        onclick: () => {
          closeSheet();
          logout();
        },
      },
      [
        el('span', { class: 'sheet-action-icon' }, ['×']),
        el('span', { class: 'flex-1' }, ['Выйти из аккаунта']),
      ]
    ),
  ]);

  content.appendChild(actions);

  openSheet({ title: 'Группы', content });
}

/* =============================================================
   COMMAND PALETTE
   ============================================================= */

function getCommands() {
  const cmds = [];

  for (const [key, view] of Object.entries(VIEWS)) {
    cmds.push({
      id: `view-${key}`,
      title: view.title,
      hint: 'Раздел',
      icon: view.icon,
      run: () => switchView(key),
    });
  }

  for (const g of state.groups) {
    cmds.push({
      id: `group-${g.id}`,
      title: g.name,
      hint: 'Группа',
      icon: '◫',
      run: () => switchGroup(g.id),
    });
  }

  cmds.push({
    id: 'action-create-group',
    title: 'Создать группу',
    hint: 'Действие',
    icon: '+',
    run: openCreateGroupModal,
  });

  cmds.push({
    id: 'action-join-group',
    title: 'Присоединиться по ID',
    hint: 'Действие',
    icon: '→',
    run: openJoinGroupModal,
  });

  if (activeGroup()) {
    cmds.push({
      id: 'action-copy-group-id',
      title: 'Скопировать ID группы',
      hint: 'Действие',
      icon: '⧉',
      run: () => copyText(activeGroup().id, 'ID группы скопирован'),
    });
  }

  cmds.push({
    id: 'action-toggle-theme',
    title: 'Переключить тему',
    hint: 'Интерфейс',
    icon: '☾',
    run: toggleTheme,
  });

  if (state.user) {
    cmds.push({
      id: 'action-logout',
      title: 'Выйти из аккаунта',
      hint: 'Аккаунт',
      icon: '×',
      run: logout,
    });
  }

  return cmds;
}

function openCommandPalette() {
  if (commandState.open) return;

  commandState.open = true;

  const root = $('#command-palette');
  const input = $('#command-input');

  root?.classList.remove('hidden');

  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 30);
  }

  renderCommands('');
}

function closeCommandPalette() {
  if (!commandState.open) return;

  commandState.open = false;
  $('#command-palette')?.classList.add('hidden');
}

function renderCommands(query = '') {
  const list = $('#command-list');
  if (!list) return;

  const all = getCommands();
  const q = query.trim().toLowerCase();

  commandState.filtered = q
    ? all.filter((cmd) => `${cmd.title} ${cmd.hint}`.toLowerCase().includes(q))
    : all;

  if (commandState.selected >= commandState.filtered.length) {
    commandState.selected = Math.max(0, commandState.filtered.length - 1);
  }

  list.innerHTML = '';

  if (!commandState.filtered.length) {
    list.appendChild(el('div', { class: 'cmdk-empty' }, ['Ничего не найдено']));
    return;
  }

  commandState.filtered.forEach((cmd, index) => {
    const item = el(
      'button',
      {
        type: 'button',
        class: 'cmdk-item' + (index === commandState.selected ? ' is-selected' : ''),
        onclick: () => {
          closeCommandPalette();
          cmd.run();
        },
        onmouseenter: () => {
          commandState.selected = index;
          updateCommandSelection();
        },
      },
      [
        el('span', { class: 'cmdk-item-icon' }, [cmd.icon || '•']),
        el('span', { class: 'cmdk-item-main' }, [
          el('span', { class: 'cmdk-item-title' }, [cmd.title]),
          el('span', { class: 'cmdk-item-hint' }, [cmd.hint || '']),
        ]),
      ]
    );

    list.appendChild(item);
  });
}

function updateCommandSelection() {
  const items = $$('#command-list .cmdk-item');

  items.forEach((node, index) => {
    node.classList.toggle('is-selected', index === commandState.selected);
  });

  items[commandState.selected]?.scrollIntoView({ block: 'nearest' });
}

function moveCommandSelection(delta) {
  if (!commandState.filtered.length) return;

  commandState.selected =
    (commandState.selected + delta + commandState.filtered.length) % commandState.filtered.length;

  updateCommandSelection();
}

/* =============================================================
   INIT
   ============================================================= */


/* =============================================================
   TOOLTIPS (Long-press on mobile)
   ============================================================= */

function initTooltips() {
  // На мобильных устройствах hover не работает, поэтому используем long-press (400ms)
  let touchTimer;
  
  document.addEventListener('touchstart', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!target) return;
    
    touchTimer = setTimeout(() => {
      const text = target.getAttribute('data-tip');
      if (text) toast(text, 'info', 3000);
      // Вибрация для тактильной отдачи (если поддерживается)
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  }, { passive: true });

  document.addEventListener('touchend', () => clearTimeout(touchTimer));
  document.addEventListener('touchmove', () => clearTimeout(touchTimer));
}

function initApp() {
  initTooltips();
  initAuthScreen();

  $$('.nav-item').forEach((n) => {
    n.addEventListener('click', () => switchView(n.dataset.view));
  });

  $$('.mobile-nav-item').forEach((n) => {
    n.addEventListener('click', () => switchView(n.dataset.view));
  });

  $('#btn-new-group')?.addEventListener('click', openCreateGroupModal);
  $('#btn-join-group')?.addEventListener('click', openJoinGroupModal);

  $('#topbar-group-btn')?.addEventListener('click', openGroupSheet);

  $('#topbar-copy-id')?.addEventListener('click', () => {
    const g = activeGroup();
    if (!g) {
      toast('Нет активной группы', 'error');
      return;
    }

    copyText(g.id, 'ID группы скопирован');
  });

  $('#topbar-user-btn')?.addEventListener('click', () => switchView('profile'));

  $$('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', toggleTheme);
  });

  $('#command-btn')?.addEventListener('click', () => {
    if (commandState.open) closeCommandPalette();
    else openCommandPalette();
  });

  $('#command-input')?.addEventListener('input', (e) => {
    commandState.selected = 0;
    renderCommands(e.target.value);
  });

  $('#command-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveCommandSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveCommandSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = commandState.filtered[commandState.selected];

      if (cmd) {
        closeCommandPalette();
        cmd.run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeCommandPalette();
    }
  });

  $('#command-palette')?.addEventListener('click', (e) => {
    if (e.target.id === 'command-palette') {
      closeCommandPalette();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();

      const appVisible = !$('#screen-app')?.classList.contains('hidden');
      if (!appVisible) return;

      if (commandState.open) closeCommandPalette();
      else openCommandPalette();

      return;
    }

    if (e.key === 'Escape') {
      if (commandState.open) {
        closeCommandPalette();
        return;
      }

      if ($('#modal-root')?.children.length) {
        closeModal();
        return;
      }

      if ($('#sheet-root')?.children.length) {
        closeSheet();
      }
    }
  });

  const groupSettingsBtn = $('#group-settings-btn');
  if (groupSettingsBtn) {
    groupSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openGroupSettingsModal();
    });
  }
}

async function main() {
  applyTheme(localStorage.getItem('zunno-theme') || getPreferredTheme());
  initApp();

  if (state.token) {
    try {
      await bootstrapApp();
    } catch {
      showScreen('auth');
    }
  } else {
    showScreen('auth');
  }

  setBusy(false);
}

main();


/* =============================================================
   PWA Service Worker
   ============================================================= */

// Service Worker disabled for debug


/* =============================================================
   THEME INIT (Level 7)
   ============================================================= */

(function initTheme() {
  const saved = localStorage.getItem('zunno-theme');
  const theme = saved || getPreferredTheme();
  applyTheme(theme);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        toggleTheme();
        // Обновляем иконку на кнопке
        const current = document.documentElement.dataset.theme;
        btn.textContent = current === 'dark' ? '🌙' : '☀️';
      });
    }
  });

  // Если DOM уже загружен, обновляем иконку сразу
  setTimeout(() => {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      const current = document.documentElement.dataset.theme;
      btn.textContent = current === 'dark' ? '🌙' : '☀️';
    }
  }, 100);
})();
