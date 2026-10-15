/* =============================================================
   ZUNNO · SPA
   ============================================================= */

const API = '/api/v1';

/* =============================================================
   STATE
   ============================================================= */
const state = {
  token: localStorage.getItem('access_token') || '',
  user: null,
  groups: [],
  activeGroupId: localStorage.getItem('active_group') || null,
  view: 'dashboard',
};

/* =============================================================
   DOM HELPERS
   ============================================================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  const items = Array.isArray(children) ? children : [children];
  for (const c of items) {
    if (c == null || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/* =============================================================
   FORMATTERS
   ============================================================= */
function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = (d - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'сейчас';
  if (abs < 3600) return Math.round(diff/60) + ' мин';
  if (abs < 86400) return Math.round(diff/3600) + ' ч';
  if (abs < 604800) return Math.round(diff/86400) + ' дн';
  return fmtDate(iso);
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('') || '?';
}

function shortId(id) { return id ? id.slice(0, 8) : '—'; }

function colorFromId(id) {
  if (!id) return 'hsl(250, 60%, 60%)';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 55%)`;
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v) { return v ? new Date(v).toISOString() : null; }

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function setBusy(busy) {
  const p = $('#preloader');
  if (p) p.classList.toggle('hide', !busy);
}

/* =============================================================
   TOASTS
   ============================================================= */
function toast(message, type = 'info', timeout = 3500) {
  const icons = { success: '✓', error: '✕', info: 'i' };
  const node = el('div', { class: `toast toast-${type}` }, [
    el('div', { class: 'toast-ico' }, [icons[type] || 'i']),
    el('div', { class: 'flex-1' }, [String(message)]),
  ]);
  $('#toasts').appendChild(node);
  setTimeout(() => {
    node.classList.add('hide');
    setTimeout(() => node.remove(), 250);
  }, timeout);
}

/* =============================================================
   CLIPBOARD
   ============================================================= */
function copyText(text, successMsg = 'Скопировано') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => toast(successMsg, 'success'))
      .catch(() => fallbackCopy(text, successMsg));
    return;
  }
  fallbackCopy(text, successMsg);
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  if (ok) toast(successMsg, 'success');
  else showCopyFallback(text);
}

function showCopyFallback(text) {
  openModal({
    title: 'Скопируйте вручную',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, ['Автокопирование недоступно. Выделите и скопируйте:']),
      el('input', {
        type: 'text', value: text, readonly: true,
        style: 'width:100%;padding:10px;border-radius:8px;background:var(--bg);border:1px solid var(--border);font-family:JetBrains Mono,monospace;font-size:12px;',
        onclick: e => e.target.select(),
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
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  let res;
  try {
    res = await fetch(API + path, {
      method, headers,
      credentials: 'include',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
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
    const msg = (data && (data.error || data.message)) || `Ошибка ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data });
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
  } catch { return false; }
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

async function register(full_name, age, phone, password) {
  const res = await apiCall('POST', '/auth/register', {
    phone_number: phone, password, full_name, age: Number(age),
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
  state.activeGroupId = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('active_group');
  showScreen('auth');
}

/* =============================================================
   SCREENS
   ============================================================= */
function showScreen(name) {
  $('#screen-auth').classList.toggle('hidden', name !== 'auth');
  $('#screen-app').classList.toggle('hidden', name !== 'app');
}

/* =============================================================
   AUTH SCREEN
   ============================================================= */
function initAuthScreen() {
  const tabs = $$('.segmented-btn');
  const thumb = $('.segmented-thumb');

  function switchTab(tab) {
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === tab));
    thumb.classList.toggle('right', tab === 'register');
    $('#form-login').classList.toggle('hidden', tab !== 'login');
    $('#form-register').classList.toggle('hidden', tab !== 'register');
  }
  tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      setBusy(true);
      await login(fd.get('phone_number').trim(), fd.get('password'));
    } catch (err) {
      toast(err.message || 'Ошибка входа', 'error');
    } finally {
      setBusy(false);
    }
  });

  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      setBusy(true);
      await register(
        fd.get('full_name').trim(),
        fd.get('age'),
        fd.get('phone_number').trim(),
        fd.get('password'),
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

    if (!state.activeGroupId || !state.groups.find(g => g.id === state.activeGroupId)) {
      state.activeGroupId = state.groups[0] ? state.groups[0].id : null;
      if (state.activeGroupId) localStorage.setItem('active_group', state.activeGroupId);
      else localStorage.removeItem('active_group');
    }

    renderSidebarUser();
    renderSidebarGroups();
    renderTopbarGroup();
    renderTopbarUser();
    showScreen('app');
    await renderActiveView();
  } catch (err) {
    toast(err.message || 'Не удалось загрузить данные', 'error');
    if (err.status === 401) logout();
  } finally {
    setBusy(false);
  }
}

/* =============================================================
   SIDEBAR
   ============================================================= */
function renderSidebarUser() {
  const box = $('#sidebar-user');
  box.innerHTML = '';
  const u = state.user;
  if (!u) return;

  box.appendChild(el('button', {
    class: 'user-chip',
    style: 'width:100%;text-align:left;',
    onclick: () => switchView('profile'),
  }, [
    el('div', { class: 'avatar' }, [initials(u.full_name)]),
    el('div', { class: 'user-chip-info' }, [
      el('div', { class: 'user-chip-name' }, [u.full_name || 'Без имени']),
      el('div', { class: 'user-chip-phone' }, [u.phone_number || '']),
    ]),
  ]));
}

function renderSidebarGroups() {
  const box = $('#sidebar-group-list');
  box.innerHTML = '';
  if (!state.groups.length) {
    box.appendChild(el('div', {
      class: 'text-xs text-3',
      style: 'padding: 8px 12px;',
    }, ['Нет групп']));
    return;
  }
  for (const g of state.groups) {
    box.appendChild(el('button', {
      class: 'sidebar-group-item' + (g.id === state.activeGroupId ? ' is-active' : ''),
      onclick: () => switchGroup(g.id),
    }, [
      el('span', { class: 'dot' }),
      el('span', { class: 'sidebar-group-item-name' }, [g.name]),
    ]));
  }
}

/* =============================================================
   TOPBAR
   ============================================================= */
function renderTopbarGroup() {
  const g = activeGroup();
  const nameEl = $('#topbar-group-name');
  const metaEl = $('#topbar-group-meta');
  if (!g) {
    nameEl.textContent = 'Нет группы';
    metaEl.textContent = 'Создайте или присоединитесь';
    return;
  }
  nameEl.textContent = g.name;
  metaEl.textContent = 'ID: ' + shortId(g.id);
}

function renderTopbarUser() {
  const btn = $('#topbar-user-btn');
  const u = state.user;
  if (!u) return;
  btn.textContent = initials(u.full_name);
}

function activeGroup() {
  return state.groups.find(g => g.id === state.activeGroupId) || null;
}

function switchGroup(id) {
  if (!id) return;
  state.activeGroupId = id;
  localStorage.setItem('active_group', id);
  renderSidebarGroups();
  renderTopbarGroup();
  renderActiveView();
  closeSheet();
}

/* =============================================================
   VIEW ROUTER
   ============================================================= */
const VIEWS = {
  dashboard: { title: 'Обзор', render: renderDashboard },
  goals:     { title: 'Цели', render: renderGoals },
  budget:    { title: 'Бюджет', render: renderBudget },
  plans:     { title: 'Планы', render: renderPlans },
  profile:   { title: 'Профиль', render: renderProfile },
};

async function renderActiveView() {
  const view = VIEWS[state.view];
  if (!view) return;

  $$('.nav-item').forEach(n => n.classList.toggle('is-active', n.dataset.view === state.view));
  $$('.mobile-nav-item').forEach(n => n.classList.toggle('is-active', n.dataset.view === state.view));

  const container = $('#view');
  container.innerHTML = '<div class="empty"><div class="empty-text">Загрузка…</div></div>';

  try {
    await view.render(container);
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, ['!']),
      el('div', { class: 'empty-title' }, ['Не удалось загрузить']),
      el('div', { class: 'empty-text' }, [err.message || 'Ошибка']),
    ]));
  }
}

function switchView(name) {
  state.view = name;
  renderActiveView();
}

/* =============================================================
   VIEW: DASHBOARD
   ============================================================= */
async function renderDashboard(container) {
  const g = activeGroup();
  container.innerHTML = '';
  if (!g) { container.appendChild(noGroupBanner()); return; }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [summary, plans, members] = await Promise.all([
    apiCall('GET', `/groups/${g.id}/budget/summary?month=${month}`).then(r => r.data).catch(() => null),
    apiCall('GET', `/groups/${g.id}/plans?from=${from}&to=${to}`).then(r => r.data || []).catch(() => []),
    apiCall('GET', `/groups/${g.id}/members`).then(r => r.data || []).catch(() => []),
  ]);

  // Stat tiles
  const spent = summary ? summary.total_spent : 0;
  const limit = summary ? summary.total_limit : 0;
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

  container.appendChild(el('div', { class: 'stat-grid' }, [
    statTile('Потрачено', fmtMoney(spent), 'primary'),
    statTile('Лимит', fmtMoney(limit), limit > 0 && spent > limit ? 'warning' : ''),
    statTile('Планов', String(plans.length), ''),
    statTile('Участников', String(members.length), 'success'),
  ]));

  if (limit > 0) {
    container.appendChild(el('div', { class: 'card mt-16' }, [
      el('div', { class: 'row-between' }, [
        el('div', { class: 'text-sm text-2' }, ['Общий прогресс месяца']),
        el('div', { class: 'text-sm mono' }, [`${pct.toFixed(0)}%`]),
      ]),
      el('div', { class: 'progress mt-12' }, [
        el('div', { class: `progress-fill${pct > 100 ? ' danger' : ''}`, style: `width:${pct}%` }),
      ]),
    ]));
  }

  // Members
  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('div', { class: 'section-title' }, ['Участники']),
        el('div', { class: 'section-desc' }, [`${members.length} ${plural(members.length, 'человек', 'человека', 'человек')} в группе`]),
      ]),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => openInviteModal(g) }, ['Пригласить']),
    ]),
    el('div', { class: 'list' }, members.map(m => renderMemberRow(m))),
  ]));

  // Upcoming plans
  const upcoming = plans.filter(p => !p.is_done)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);

  if (upcoming.length) {
    container.appendChild(el('div', { class: 'section' }, [
      el('div', { class: 'section-head' }, [
        el('div', {}, [
          el('div', { class: 'section-title' }, ['Ближайшие планы']),
          el('div', { class: 'section-desc' }, [`${upcoming.length} ${plural(upcoming.length, 'событие', 'события', 'событий')}`]),
        ]),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => switchView('plans') }, ['Все']),
      ]),
      el('div', { class: 'list' }, upcoming.map(p => el('div', { class: 'item' }, [
        el('div', { class: 'flex-1' }, [
          el('div', { class: 'item-title' }, [p.title]),
          el('div', { class: 'item-sub' }, [fmtDateTime(p.event_date) + ' · ' + fmtRelative(p.event_date)]),
        ]),
      ]))),
    ]));
  }

  // Budget by category
  if (summary && summary.categories && summary.categories.length) {
    container.appendChild(el('div', { class: 'section' }, [
      el('div', { class: 'section-head' }, [
        el('div', {}, [
          el('div', { class: 'section-title' }, ['Расходы по категориям']),
          el('div', { class: 'section-desc' }, [month]),
        ]),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => switchView('budget') }, ['Все']),
      ]),
      el('div', { class: 'list' }, summary.categories.map(c => {
        const cp = c.limit > 0 ? Math.min(100, (c.spent / c.limit) * 100) : 0;
        return el('div', { class: 'item', style: 'flex-direction:column;align-items:stretch;' }, [
          el('div', { class: 'row-between' }, [
            el('div', { class: 'item-title' }, [c.name]),
            el('div', { class: 'mono text-sm text-2' }, [`${fmtMoney(c.spent)} / ${fmtMoney(c.limit)}`]),
          ]),
          el('div', { class: 'progress mt-8' }, [
            el('div', { class: `progress-fill${c.overspent ? ' danger' : ''}`, style: `width:${cp}%` }),
          ]),
        ]);
      })),
    ]));
  }
}

function statTile(label, value, variant) {
  return el('div', { class: 'stat' }, [
    el('div', { class: 'stat-label' }, [label]),
    el('div', { class: `stat-value ${variant || ''}` }, [value]),
  ]);
}

function renderMemberRow(m) {
  const isMe = state.user && m.user_id === state.user.id;
  const roleTag = m.role === 'admin'
    ? el('span', { class: 'tag tag-primary' }, ['Админ'])
    : el('span', { class: 'tag tag-mute' }, ['Участник']);
  return el('div', { class: 'item' }, [
    el('div', {
      class: 'avatar-sm',
      style: `background:${colorFromId(m.user_id)}`,
    }, [initials(shortId(m.user_id).slice(0, 2))]),
    el('div', { class: 'item-main' }, [
      el('div', { class: 'item-title' }, [isMe ? 'Вы' : 'Участник ' + shortId(m.user_id)]),
      el('div', { class: 'item-sub' }, ['Присоединился ' + fmtDate(m.joined_at)]),
    ]),
    roleTag,
  ]);
}

function noGroupBanner() {
  return el('div', { class: 'card' }, [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, ['◫']),
      el('div', { class: 'empty-title' }, ['Нет активной группы']),
      el('div', { class: 'empty-text' }, ['Создайте свою или присоединитесь по ID']),
      el('div', { class: 'empty-actions' }, [
        el('button', { class: 'btn btn-primary', onclick: openCreateGroupModal }, ['Создать группу']),
        el('button', { class: 'btn btn-ghost', onclick: openJoinGroupModal }, ['Присоединиться']),
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
  if (!g) { container.appendChild(noGroupBanner()); return; }

  const cats = await apiCall('GET', `/groups/${g.id}/goal-categories`).then(r => r.data || []);

  container.appendChild(el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('div', { class: 'section-title' }, ['Категории целей']),
      el('div', { class: 'section-desc' }, [`${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`]),
    ]),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreateGoalCategoryModal(g) }, ['+ Категория']),
  ]));

  if (!cats.length) {
    container.appendChild(emptyState('◆', 'Пока нет категорий',
      'Создайте первую — «Фильмы», «Книги», «Места»'));
    return;
  }

  const grid = el('div', { class: 'grid-auto' });
  for (const c of cats) grid.appendChild(await renderGoalCategoryCard(g, c));
  container.appendChild(grid);
}

async function renderGoalCategoryCard(g, c) {
  const items = await apiCall('GET', `/groups/${g.id}/goal-categories/${c.id}/items`)
    .then(r => r.data || []).catch(() => []);
  const done = items.filter(i => i.done).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  const card = el('div', { class: 'card' });

  card.appendChild(el('div', { class: 'card-head' }, [
    el('div', {}, [
      el('div', { class: 'card-title' }, [c.name]),
      el('div', { class: 'card-subtitle' }, items.length ? `${done} / ${items.length}` : 'Пусто'),
    ]),
    el('div', { class: 'item-actions' }, [
      el('button', { class: 'icon-btn sm', title: 'Переименовать', onclick: () => openRenameGoalCategoryModal(g, c) }, ['✎']),
      el('button', { class: 'icon-btn sm', title: 'Удалить', onclick: () => confirmDelete(
        `Удалить категорию «${c.name}»?`,
        async () => {
          await apiCall('DELETE', `/groups/${g.id}/goal-categories/${c.id}`);
          toast('Удалено', 'success');
          renderActiveView();
        }) }, ['✕']),
    ]),
  ]));

  if (items.length) {
    card.appendChild(el('div', { class: 'progress' }, [
      el('div', { class: 'progress-fill' + (pct === 100 ? ' success' : ''), style: `width:${pct}%` }),
    ]));
  }

  const list = el('div', { class: 'list mt-12' });
  for (const it of items) {
    list.appendChild(el('div', { class: 'item' + (it.done ? ' is-done' : '') }, [
      el('div', { class: 'check' + (it.done ? ' on' : ''), onclick: async () => {
        try {
          await apiCall('PATCH', `/groups/${g.id}/goal-items/${it.id}`, { done: !it.done, version: it.version });
          renderActiveView();
        } catch (err) { toast(err.message, 'error'); }
      }}),
      el('div', { class: 'item-main' }, [
        el('div', { class: 'item-title' }, [it.title]),
        it.description ? el('div', { class: 'item-sub' }, [it.description]) : null,
      ].filter(Boolean)),
      el('button', { class: 'icon-btn sm', onclick: () => confirmDelete('Удалить элемент?', async () => {
        await apiCall('DELETE', `/groups/${g.id}/goal-items/${it.id}`);
        renderActiveView();
      }) }, ['✕']),
    ]));
  }
  if (!items.length) {
    list.appendChild(el('div', { class: 'text-sm text-3', style: 'padding:8px 0;text-align:center;' }, ['Нет элементов']));
  }
  card.appendChild(list);

  card.appendChild(el('button', {
    class: 'btn btn-ghost btn-sm btn-block mt-12',
    onclick: () => openCreateGoalItemModal(g, c),
  }, ['+ Добавить элемент']));

  return card;
}

/* =============================================================
   VIEW: BUDGET
   ============================================================= */
async function renderBudget(container) {
  const g = activeGroup();
  container.innerHTML = '';
  if (!g) { container.appendChild(noGroupBanner()); return; }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [cats, txs, summary] = await Promise.all([
    apiCall('GET', `/groups/${g.id}/categories`).then(r => r.data || []),
    apiCall('GET', `/groups/${g.id}/transactions?limit=50`).then(r => r.data || []),
    apiCall('GET', `/groups/${g.id}/budget/summary?month=${month}`).then(r => r.data).catch(() => null),
  ]);

  // Summary top
  if (summary) {
    const spent = summary.total_spent || 0;
    const limit = summary.total_limit || 0;
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    container.appendChild(el('div', { class: 'card' }, [
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
      limit > 0 ? el('div', { class: 'progress mt-16' }, [
        el('div', { class: `progress-fill${spent > limit ? ' danger' : ''}`, style: `width:${pct}%` }),
      ]) : null,
    ].filter(Boolean)));
  }

  // Categories
  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('div', { class: 'section-title' }, ['Категории']),
        el('div', { class: 'section-desc' }, [`${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`]),
      ]),
      el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreateCategoryModal(g) }, ['+ Категория']),
    ]),
    cats.length ? el('div', { class: 'grid-auto' }, cats.map(c => renderCategoryCard(g, c, summary))) : emptyState('≡', 'Нет категорий', 'Добавьте «Еду», «Транспорт», «Развлечения»'),
  ]));

  // Transactions
  container.appendChild(el('div', { class: 'section' }, [
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('div', { class: 'section-title' }, ['Транзакции']),
        el('div', { class: 'section-desc' }, [`Последние ${txs.length}`]),
      ]),
      el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreateTransactionModal(g, cats) }, ['+ Транзакция']),
    ]),
    txs.length ? el('div', { class: 'list' }, txs.map(t => renderTransactionRow(t, cats))) : emptyState('≡', 'Нет транзакций', 'Добавьте первую — и увидите статистику'),
  ]));
}

function renderCategoryCard(g, c, summary) {
  const item = summary && summary.categories ? summary.categories.find(x => x.category_id === c.id) : null;
  const spent = item ? item.spent : 0;
  const pct = c.budget_limit > 0 ? Math.min(100, (spent / c.budget_limit) * 100) : 0;

  return el('div', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('div', {}, [
        el('div', { class: 'card-title' }, [c.name]),
        el('div', { class: 'card-subtitle' }, [
          el('span', { class: `tag ${c.type === 'fixed' ? 'tag-primary' : 'tag-mute'}` },
            [c.type === 'fixed' ? 'Постоянная' : 'Спонтанная']),
        ]),
      ]),
      el('button', { class: 'icon-btn sm', onclick: () => confirmDelete(`Удалить «${c.name}»?`, async () => {
        await apiCall('DELETE', `/groups/${g.id}/categories/${c.id}`);
        toast('Удалено', 'success');
        renderActiveView();
      }) }, ['✕']),
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
      el('div', { class: `progress-fill${spent > c.budget_limit && c.budget_limit > 0 ? ' danger' : ''}`, style: `width:${pct}%` }),
    ]),
  ]);
}

function renderTransactionRow(t, cats) {
  const cat = cats.find(c => c.id === t.category_id);
  const isMe = state.user && t.user_id === state.user.id;
  return el('div', { class: 'item' }, [
    el('div', { class: 'flex-1' }, [
      el('div', { class: 'item-title' }, [t.description || (cat ? cat.name : 'Без описания')]),
      el('div', { class: 'item-sub' }, [
        (cat ? cat.name : 'Без категории') + ' · ' + fmtDateTime(t.date) + (isMe ? ' · вы' : ''),
      ]),
    ]),
    el('div', { class: 'mono', style: 'font-weight:600;color:var(--primary-hi);' }, ['−' + fmtMoney(t.amount)]),
  ]);
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

  const plans = await apiCall('GET', `/groups/${g.id}/plans?from=${from}&to=${to}`)
    .then(r => r.data || []).catch(() => []);

  container.appendChild(el('div', { class: 'section-head' }, [
    el('div', {}, [
      el('div', { class: 'section-title' }, ['События']),
      el('div', { class: 'section-desc' }, [`${plans.length} ${plural(plans.length, 'событие', 'события', 'событий')}`]),
    ]),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreatePlanModal(g) }, ['+ Событие']),
  ]));

  if (!plans.length) {
    container.appendChild(emptyState('◷', 'Пока нет планов',
      'Создайте первое событие — пикник, поездку, вечеринку'));
    return;
  }

  const grid = el('div', { class: 'grid-auto' });
  for (const p of plans) grid.appendChild(await renderPlanCard(g, p));
  container.appendChild(grid);
}

async function renderPlanCard(g, p) {
  const items = await apiCall('GET', `/groups/${g.id}/plans/${p.id}/checklist`)
    .then(r => r.data || []).catch(() => []);
  const done = items.filter(i => i.is_checked).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  const card = el('div', { class: 'card' });

  card.appendChild(el('div', { class: 'card-head' }, [
    el('div', {}, [
      el('div', {
        class: 'card-title',
        style: p.is_done ? 'text-decoration:line-through;opacity:0.6;' : '',
      }, [p.title]),
      el('div', { class: 'card-subtitle' }, [fmtDateTime(p.event_date) + ' · ' + fmtRelative(p.event_date)]),
    ]),
    el('div', { class: 'item-actions' }, [
      el('button', {
        class: 'icon-btn sm',
        title: p.is_done ? 'Вернуть' : 'Готово',
        onclick: async () => {
          try {
            await apiCall('PATCH', `/groups/${g.id}/plans/${p.id}`, {
              title: p.title, description: p.description || '',
              event_date: p.event_date, is_done: !p.is_done, version: p.version,
            });
            renderActiveView();
          } catch (err) { toast(err.message, 'error'); }
        },
      }, [p.is_done ? '↺' : '✓']),
      el('button', { class: 'icon-btn sm', onclick: () => confirmDelete('Удалить событие?', async () => {
        await apiCall('DELETE', `/groups/${g.id}/plans/${p.id}`);
        renderActiveView();
      }) }, ['✕']),
    ]),
  ]));

  if (p.description) {
    card.appendChild(el('div', { class: 'text-sm text-2', style: 'margin-bottom:8px;' }, [p.description]));
  }

  if (items.length) {
    card.appendChild(el('div', { class: 'progress' }, [
      el('div', { class: 'progress-fill' + (pct === 100 ? ' success' : ''), style: `width:${pct}%` }),
    ]));
    card.appendChild(el('div', { class: 'text-xs text-3 mt-8' }, [`${done} / ${items.length} пунктов`]));

    const list = el('div', { class: 'list mt-12' });
    for (const it of items) {
      list.appendChild(el('div', { class: 'item' + (it.is_checked ? ' is-done' : '') }, [
        el('div', { class: 'check' + (it.is_checked ? ' on' : ''), onclick: async () => {
          try {
            await apiCall('PATCH', `/groups/${g.id}/checklist/${it.id}`, {
              text: it.text, is_checked: !it.is_checked, version: it.version,
            });
            renderActiveView();
          } catch (err) { toast(err.message, 'error'); }
        }}),
        el('div', { class: 'item-main' }, [
          el('div', { class: 'item-title', style: 'font-size:13px;font-weight:400;' }, [it.text]),
        ]),
        el('button', { class: 'icon-btn sm', onclick: async () => {
          try {
            await apiCall('DELETE', `/groups/${g.id}/checklist/${it.id}`);
            renderActiveView();
          } catch (err) { toast(err.message, 'error'); }
        }}, ['✕']),
      ]));
    }
    card.appendChild(list);
  }

  card.appendChild(el('button', {
    class: 'btn btn-ghost btn-sm btn-block mt-12',
    onclick: () => openCreateChecklistModal(g, p),
  }, ['+ пункт']));

  return card;
}

/* =============================================================
   VIEW: PROFILE
   ============================================================= */
async function renderProfile(container) {
  const me = await apiCall('GET', '/users/me');
  state.user = me.data;
  const u = me.data;
  renderTopbarUser();
  renderSidebarUser();

  container.innerHTML = '';
  const wrap = el('div', { style: 'max-width:520px;' });

  wrap.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'row', style: 'gap:14px;margin-bottom:18px;' }, [
      el('div', { class: 'avatar', style: 'width:56px;height:56px;font-size:18px;' }, [initials(u.full_name)]),
      el('div', {}, [
        el('div', { style: 'font-size:16px;font-weight:600;' }, [u.full_name || '—']),
        el('div', { class: 'text-sm text-3' }, [u.phone_number || '—']),
      ]),
    ]),

    el('form', {
      class: 'form',
      onsubmit: async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const res = await apiCall('PATCH', '/users/me', {
            full_name: fd.get('full_name').trim(),
            age: Number(fd.get('age')),
            phone_number: fd.get('phone_number').trim(),
            version: u.version,
          });
          state.user = res.data;
          toast('Профиль обновлён', 'success');
          renderProfile(container);
        } catch (err) {
          toast(err.message, 'error');
        }
      },
    }, [
      field('Имя', el('input', { name: 'full_name', value: u.full_name || '', required: true, minlength: 3, maxlength: 100 })),
      field('Возраст', el('input', { name: 'age', type: 'number', value: u.age, min: 18, max: 100, required: true })),
      field('Телефон', el('input', { name: 'phone_number', type: 'tel', value: u.phone_number || '', required: true })),
      el('button', { type: 'submit', class: 'btn btn-primary btn-block mt-8' }, ['Сохранить']),
    ]),

    el('div', { class: 'text-xs text-3 mt-16' }, [
      'Создан: ' + fmtDate(u.created_at) + ' · версия ' + u.version,
    ]),
  ]));

  wrap.appendChild(el('div', { class: 'card mt-16' }, [
    el('div', { class: 'card-title' }, ['Опасная зона']),
    el('div', { class: 'text-sm text-3 mt-8' }, [
      'Удаление аккаунта необратимо. Все данные будут стёрты.',
    ]),
    el('button', {
      class: 'btn btn-danger btn-block mt-12',
      onclick: openDeleteAccountModal,
    }, ['Удалить аккаунт']),
    el('button', {
      class: 'btn btn-ghost btn-block mt-8',
      onclick: logout,
    }, ['Выйти из аккаунта']),
  ]));

  container.appendChild(wrap);
}

/* =============================================================
   HELPERS
   ============================================================= */
function field(label, input) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, [label]),
    input,
  ]);
}

function emptyState(ico, title, text) {
  return el('div', { class: 'card' }, [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, [ico]),
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
  root.innerHTML = '';

  const backdrop = el('div', {
    class: 'modal-backdrop',
    onclick: (e) => { if (e.target === backdrop) closeModal(); },
  });

  const modal = el('div', { class: 'modal' });
  modal.appendChild(el('div', { class: 'modal-title' }, [title]));

  const form = el('form', { class: 'modal-body' });
  form.appendChild(body);

  form.appendChild(el('div', { class: 'modal-actions' }, [
    el('button', { type: 'button', class: 'btn btn-ghost', onclick: closeModal }, ['Отмена']),
    el('button', { type: 'submit', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}` }, [saveLabel]),
  ]));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    try {
      await onSave(new FormData(form));
      closeModal();
    } catch (err) {
      toast(err.message || 'Ошибка', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  modal.appendChild(form);
  backdrop.appendChild(modal);
  root.appendChild(backdrop);

  const first = modal.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 60);
}

function closeModal() { $('#modal-root').innerHTML = ''; }

async function confirmDelete(message, onConfirm) {
  openModal({
    title: 'Подтверждение',
    body: el('div', { class: 'text-2' }, [message]),
    saveLabel: 'Удалить',
    danger: true,
    onSave: async () => { await onConfirm(); },
  });
}

/* =============================================================
   SHEET (mobile bottom sheet)
   ============================================================= */
function openSheet({ title, content }) {
  const root = $('#sheet-root');
  root.innerHTML = '';
  const backdrop = el('div', {
    class: 'sheet-backdrop',
    onclick: (e) => { if (e.target === backdrop) closeSheet(); },
  });
  const sheet = el('div', { class: 'sheet' }, [
    el('div', { class: 'sheet-handle' }),
    title ? el('div', { class: 'sheet-title' }, [title]) : null,
    content,
  ].filter(Boolean));
  backdrop.appendChild(sheet);
  root.appendChild(backdrop);
}

function closeSheet() { $('#sheet-root').innerHTML = ''; }

/* =============================================================
   MODALS · GROUP
   ============================================================= */
function openCreateGroupModal() {
  openModal({
    title: 'Новая группа',
    body: field('Название', el('input', { name: 'name', required: true, maxlength: 100, placeholder: 'Например, Семья' })),
    onSave: async (fd) => {
      const res = await apiCall('POST', '/groups', { name: fd.get('name').trim() });
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
      el('p', { class: 'text-2 text-sm' }, ['Введите ID группы, который вам прислал администратор.']),
      field('Group ID', el('input', {
        name: 'group_id', required: true,
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        style: 'font-family:JetBrains Mono,monospace;font-size:12px;',
      })),
    ]),
    saveLabel: 'Присоединиться',
    onSave: async (fd) => {
      const gid = fd.get('group_id').trim();
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
      el('div', { class: 'row', style: 'gap:8px;margin-top:8px;' }, [
        el('input', {
          type: 'text', value: g.id, readonly: true,
          style: 'flex:1;padding:10px;border-radius:8px;background:var(--bg);border:1px solid var(--border);font-family:JetBrains Mono,monospace;font-size:12px;',
          onclick: e => e.target.select(),
        }),
        el('button', {
          type: 'button', class: 'btn btn-primary',
          onclick: () => copyText(g.id, 'ID группы скопирован'),
        }, ['Копировать']),
      ]),
      el('p', { class: 'text-xs text-3', style: 'margin-top:12px;' }, [
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
    body: field('Название', el('input', { name: 'name', required: true, maxlength: 100, placeholder: 'Фильмы' })),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/goal-categories`, { name: fd.get('name').trim() });
      toast('Создано', 'success');
      renderActiveView();
    },
  });
}

function openRenameGoalCategoryModal(g, c) {
  openModal({
    title: 'Переименовать',
    body: field('Название', el('input', { name: 'name', required: true, maxlength: 100, value: c.name })),
    onSave: async (fd) => {
      await apiCall('PATCH', `/groups/${g.id}/goal-categories/${c.id}`, {
        name: fd.get('name').trim(), version: c.version,
      });
      toast('Обновлено', 'success');
      renderActiveView();
    },
  });
}

function openCreateGoalItemModal(g, c) {
  openModal({
    title: 'Новый элемент',
    body: el('div', {}, [
      field('Название', el('input', { name: 'title', required: true, maxlength: 200, placeholder: 'Посмотреть Дюну' })),
      field('Описание', el('textarea', { name: 'description', placeholder: 'Необязательно' })),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/goal-categories/${c.id}/items`, {
        title: fd.get('title').trim(),
        description: fd.get('description').trim(),
      });
      toast('Добавлено', 'success');
      renderActiveView();
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
      field('Название', el('input', { name: 'name', required: true, maxlength: 100, placeholder: 'Еда' })),
      field('Тип', el('select', { name: 'type', required: true }, [
        el('option', { value: 'fixed' }, ['Постоянная (еда, дом)']),
        el('option', { value: 'spontaneous' }, ['Спонтанная']),
      ])),
      field('Лимит в месяц (₽)', el('input', { name: 'budget_limit', type: 'number', min: 0, step: '0.01', value: 0, required: true })),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/categories`, {
        name: fd.get('name').trim(),
        type: fd.get('type'),
        budget_limit: Number(fd.get('budget_limit')),
      });
      toast('Создано', 'success');
      renderActiveView();
    },
  });
}

function openCreateTransactionModal(g, cats) {
  if (!cats.length) { toast('Сначала создайте категорию', 'error'); return; }
  openModal({
    title: 'Новая транзакция',
    body: el('div', {}, [
      field('Категория', el('select', { name: 'category_id', required: true },
        cats.map(c => el('option', { value: c.id }, [c.name])))),
      field('Сумма (₽)', el('input', { name: 'amount', type: 'number', min: 0.01, step: '0.01', required: true })),
      field('Дата', el('input', { name: 'date', type: 'datetime-local', value: toLocalInput(new Date().toISOString()), required: true })),
      field('Описание', el('input', { name: 'description', maxlength: 255, placeholder: 'Обед в кафе' })),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/transactions`, {
        category_id: fd.get('category_id'),
        amount: Number(fd.get('amount')),
        date: fromLocalInput(fd.get('date')),
        description: fd.get('description').trim(),
      });
      toast('Добавлено', 'success');
      renderActiveView();
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
      field('Название', el('input', { name: 'title', required: true, maxlength: 200, placeholder: 'Пикник в парке' })),
      field('Описание', el('textarea', { name: 'description', placeholder: 'Необязательно' })),
      field('Дата и время', el('input', { name: 'event_date', type: 'datetime-local', value: toLocalInput(new Date().toISOString()), required: true })),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/plans`, {
        title: fd.get('title').trim(),
        description: fd.get('description').trim(),
        event_date: fromLocalInput(fd.get('event_date')),
      });
      toast('Создано', 'success');
      renderActiveView();
    },
  });
}

function openCreateChecklistModal(g, p) {
  openModal({
    title: 'Новый пункт',
    body: field('Текст', el('input', { name: 'text', required: true, maxlength: 500, placeholder: 'Взять плед' })),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/plans/${p.id}/checklist`, {
        text: fd.get('text').trim(),
      });
      toast('Добавлено', 'success');
      renderActiveView();
    },
  });
}

/* =============================================================
   MODALS · PROFILE
   ============================================================= */
function openDeleteAccountModal() {
  openModal({
    title: 'Удалить аккаунт?',
    body: el('div', {}, [
      el('p', { class: 'text-2 text-sm' }, ['Это действие необратимо. Введите пароль для подтверждения.']),
      field('Пароль', el('input', { name: 'password', type: 'password', required: true })),
    ]),
    saveLabel: 'Удалить навсегда',
    danger: true,
    onSave: async (fd) => {
      await apiCall('DELETE', '/users/me', { password: fd.get('password') });
      toast('Аккаунт удалён', 'success');
      logout();
    },
  });
}

/* =============================================================
   TOPBAR GROUP SHEET (mobile)
   ============================================================= */
function openGroupSheet() {
  const content = el('div', {}, []);

  // Groups list
  const list = el('div', { class: 'sheet-actions' });
  for (const g of state.groups) {
    list.appendChild(el('button', {
      class: 'sheet-action',
      onclick: () => switchGroup(g.id),
    }, [
      el('span', { class: 'sheet-action-icon' }, [g.id === state.activeGroupId ? '●' : '○']),
      el('span', { class: 'flex-1' }, [g.name]),
      g.id === state.activeGroupId ? el('span', { class: 'tag tag-primary' }, ['активна']) : null,
    ].filter(Boolean)));
  }
  if (!state.groups.length) {
    list.appendChild(el('div', { class: 'text-sm text-3', style: 'text-align:center;padding:12px;' }, ['Нет групп']));
  }
  content.appendChild(list);

  // Actions
  const actions = el('div', { class: 'sheet-actions', style: 'margin-top:12px;' }, [
    el('button', {
      class: 'sheet-action',
      onclick: () => { closeSheet(); openCreateGroupModal(); },
    }, [
      el('span', { class: 'sheet-action-icon' }, ['+']),
      el('span', { class: 'flex-1' }, ['Создать группу']),
    ]),
    el('button', {
      class: 'sheet-action',
      onclick: () => { closeSheet(); openJoinGroupModal(); },
    }, [
      el('span', { class: 'sheet-action-icon' }, ['→']),
      el('span', { class: 'flex-1' }, ['Присоединиться по ID']),
    ]),
    el('button', {
      class: 'sheet-action',
      onclick: () => {
        const g = activeGroup();
        if (!g) { toast('Нет активной группы', 'error'); return; }
        copyText(g.id, 'ID группы скопирован');
        closeSheet();
      },
    }, [
      el('span', { class: 'sheet-action-icon' }, ['⧉']),
      el('span', { class: 'flex-1' }, ['Скопировать ID группы']),
    ]),
    el('button', {
      class: 'sheet-action',
      onclick: () => { closeSheet(); logout(); },
    }, [
      el('span', { class: 'sheet-action-icon' }, ['×']),
      el('span', { class: 'flex-1' }, ['Выйти из аккаунта']),
    ]),
  ]);
  content.appendChild(actions);

  openSheet({ title: 'Группы', content });
}

/* =============================================================
   INIT
   ============================================================= */
function initApp() {
  initAuthScreen();

  $$('.nav-item').forEach(n => n.addEventListener('click', () => switchView(n.dataset.view)));
  $$('.mobile-nav-item').forEach(n => n.addEventListener('click', () => switchView(n.dataset.view)));

  $('#btn-new-group').addEventListener('click', openCreateGroupModal);
  $('#btn-join-group').addEventListener('click', openJoinGroupModal);

  $('#topbar-group-btn').addEventListener('click', () => {
    // Desktop: switch to first group next / open sheet on mobile
    if (window.innerWidth < 1024) {
      openGroupSheet();
    } else {
      // On desktop — switch to next group (quick switch)
      const idx = state.groups.findIndex(g => g.id === state.activeGroupId);
      if (state.groups.length > 1) {
        const next = state.groups[(idx + 1) % state.groups.length];
        switchGroup(next.id);
      } else {
        openGroupSheet();
      }
    }
  });

  $('#topbar-copy-id').addEventListener('click', () => {
    const g = activeGroup();
    if (!g) { toast('Нет активной группы', 'error'); return; }
    copyText(g.id, 'ID группы скопирован');
  });

  $('#topbar-user-btn').addEventListener('click', () => switchView('profile'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeSheet(); }
  });
}

async function main() {
  initApp();
  if (state.token) {
    try { await bootstrapApp(); }
    catch { showScreen('auth'); }
  } else {
    showScreen('auth');
  }
  setBusy(false);
}

main();
