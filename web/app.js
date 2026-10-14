/* =============================================================
   ZUNNO · SPA
   ============================================================= */

const API = '/api/v1';

/* ========== STATE ========== */
const state = {
  token: localStorage.getItem('access_token') || '',
  user: null,
  groups: [],
  activeGroupId: localStorage.getItem('active_group') || null,
  view: 'dashboard',
  budgets: { summary: null, stats: null, categories: [], transactions: [] },
};

/* ========== HELPERS ========== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null && v !== false) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
  }
  return node;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtMoney(n) {
  if (n == null) return '—';
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

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v) {
  if (!v) return null;
  return new Date(v).toISOString();
}

function setBusy(busy) {
  const p = $('#preloader');
  if (!p) return;
  p.classList.toggle('hide', !busy);
}

/* ========== TOAST ========== */
function toast(message, type = 'info', timeout = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const node = el('div', { class: `toast toast-${type}` }, [
    el('div', { class: 'toast-ico', html: icons[type] || 'ℹ' }),
    el('div', { class: 'flex-1' }, [String(message)]),
  ]);
  $('#toasts').appendChild(node);
  setTimeout(() => {
    node.classList.add('hide');
    setTimeout(() => node.remove(), 300);
  }, timeout);
}

/* ========== API CLIENT ========== */
async function apiCall(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const res = await fetch(API + path, {
    method,
    headers,
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined,
  });

  // 204 No Content
  if (res.status === 204) return { ok: true, status: res.status, data: null };

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  // 401 → попробовать refresh (кроме самих /auth/*)
  if (res.status === 401 && !opts.noRetry && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiCall(method, path, body, { ...opts, noRetry: true });
    logout();
    throw new Error('Сессия истекла');
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
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
    if (data?.access_token) {
      state.token = data.access_token;
      localStorage.setItem('access_token', data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ========== AUTH ========== */
async function login(phone, password) {
  const res = await apiCall('POST', '/auth/login', { phone_number: phone, password }, { noRetry: true });
  state.token = res.data.access_token;
  localStorage.setItem('access_token', res.data.access_token);
  await bootstrapApp();
}

async function register(full_name, age, phone, password) {
  const res = await apiCall('POST', '/auth/register', {
    phone_number: phone, password, full_name, age: Number(age),
  }, { noRetry: true });
  state.token = res.data.access_token;
  localStorage.setItem('access_token', res.data.access_token);
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

/* ========== SCREEN SWITCH ========== */
function showScreen(name) {
  $('#screen-auth').classList.toggle('hidden', name !== 'auth');
  $('#screen-app').classList.toggle('hidden', name !== 'app');
}

/* ========== AUTH SCREEN LOGIC ========== */
function initAuthScreen() {
  const tabs = $$('.auth-tab');
  const indicator = $('.auth-tab-indicator');

  function switchTab(tab) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    indicator.classList.toggle('right', tab === 'register');
    $('#form-login').classList.toggle('hidden', tab !== 'login');
    $('#form-register').classList.toggle('hidden', tab !== 'register');
  }

  tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $$('[data-tab-switch]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab(a.dataset.tabSwitch);
  }));

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

/* ========== APP BOOTSTRAP ========== */
async function bootstrapApp() {
  try {
    setBusy(true);
    const me = await apiCall('GET', '/users/me');
    state.user = me.data;

    const groups = await apiCall('GET', '/groups');
    state.groups = groups.data || [];

    if (!state.activeGroupId || !state.groups.find(g => g.id === state.activeGroupId)) {
      state.activeGroupId = state.groups[0]?.id || null;
      if (state.activeGroupId) localStorage.setItem('active_group', state.activeGroupId);
    }

    renderSidebarUser();
    renderGroupSelect();
    showScreen('app');
    await renderActiveView();
  } catch (err) {
    toast(err.message || 'Не удалось загрузить данные', 'error');
    if (err.status === 401) logout();
  } finally {
    setBusy(false);
  }
}

/* ========== SIDEBAR ========== */
function renderSidebarUser() {
  const u = state.user;
  if (!u) return;
  $('#sidebar-user').innerHTML = '';
  $('#sidebar-user').appendChild(
    el('div', { class: 'user-chip' }, [
      el('div', { class: 'avatar' }, [initials(u.full_name)]),
      el('div', { class: 'user-chip-info' }, [
        el('div', { class: 'user-chip-name' }, [u.full_name || 'Без имени']),
        el('div', { class: 'user-chip-phone' }, [u.phone_number || '']),
      ]),
    ]),
  );
}

function renderGroupSelect() {
  const sel = $('#group-select');
  sel.innerHTML = '';
  if (!state.groups.length) {
    sel.appendChild(el('option', { value: '' }, ['— нет групп —']));
    return;
  }
  for (const g of state.groups) {
    const opt = el('option', { value: g.id }, [g.name]);
    if (g.id === state.activeGroupId) opt.selected = true;
    sel.appendChild(opt);
  }
}

function activeGroup() {
  return state.groups.find(g => g.id === state.activeGroupId) || null;
}

/* ========== TOPBAR ========== */
function setViewTitle(title, sub = '') {
  $('#view-title').textContent = title;
  $('#view-sub').textContent = sub;
}

function renderTopbarGroup() {
  const g = activeGroup();
  const box = $('#topbar-group');
  if (!g) { box.textContent = ''; return; }
  box.textContent = g.name;
}

/* ========== ROUTER / VIEWS ========== */
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
  setViewTitle(view.title, activeGroup()?.name || '');
  renderTopbarGroup();

  const container = $('#view-container');
  container.innerHTML = `<div class="empty"><div class="loader-ring" style="margin: 0 auto;"></div></div>`;

  try {
    await view.render(container);
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { class: 'empty' }, [
        el('div', { class: 'empty-ico' }, ['⚠']),
        el('div', { class: 'empty-title' }, ['Не удалось загрузить']),
        el('div', { class: 'empty-text' }, [err.message || 'Ошибка']),
      ]),
    );
  }
}

function switchView(name) {
  state.view = name;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  renderActiveView();
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

  const [summary, plans, members] = await Promise.all([
    apiCall('GET', `/groups/${g.id}/budget/summary?month=${month}`).then(r => r.data).catch(() => null),
    apiCall('GET', `/groups/${g.id}/plans?from=${from}&to=${to}`).then(r => r.data || []).catch(() => []),
    apiCall('GET', `/groups/${g.id}/members`).then(r => r.data || []).catch(() => []),
  ]);

  // Stat tiles
  const tiles = el('div', { class: 'grid-4' }, [
    statTile('Потрачено за месяц', summary ? fmtMoney(summary.total_spent) : '—', 'cyan'),
    statTile('Лимит', summary ? fmtMoney(summary.total_limit) : '—', 'violet'),
    statTile('Планов в этом месяце', String(plans.length), 'amber'),
    statTile('Участников', String(members.length), 'green'),
  ]);
  container.appendChild(tiles);

  // Budget по категориям
  if (summary && summary.categories?.length) {
    const card = el('div', { class: 'card mt-16' });
    card.appendChild(el('div', { class: 'card-head' }, [
      el('div', { class: 'card-title' }, ['Бюджет по категориям']),
      el('span', { class: 'text-sm text-mute' }, [month]),
    ]));
    for (const c of summary.categories) {
      const pct = c.limit > 0 ? Math.min(100, (c.spent / c.limit) * 100) : 0;
      const row = el('div', { class: 'mt-16' });
      row.appendChild(el('div', { class: 'row-between' }, [
        el('div', {}, [
          el('span', { style: 'font-weight:600; font-size:14px;' }, [c.name]),
          el('span', { class: 'tag tag-mute', style: 'margin-left:8px;' }, [c.type === 'fixed' ? 'постоянная' : 'спонтанная']),
        ]),
        el('span', { class: 'mono text-dim' }, [`${fmtMoney(c.spent)} / ${fmtMoney(c.limit)}`]),
      ]));
      const pb = el('div', { class: 'progress mt-16' });
      const pf = el('div', { class: `progress-fill${c.overspent ? ' danger' : ''}` });
      pf.style.width = pct + '%';
      pb.appendChild(pf);
      row.appendChild(pb);
      card.appendChild(row);
    }
    container.appendChild(card);
  }

  // Ближайшие планы
  const upcoming = plans.filter(p => !p.is_done).sort((a, b) => new Date(a.event_date) - new Date(b.event_date)).slice(0, 5);
  if (upcoming.length) {
    const card = el('div', { class: 'card mt-16' });
    card.appendChild(el('div', { class: 'card-head' }, [
      el('div', { class: 'card-title' }, ['Ближайшие планы']),
    ]));
    for (const p of upcoming) {
      card.appendChild(el('div', { class: 'item mt-16' }, [
        el('div', { class: 'item-main' }, [
          el('div', { class: 'item-title' }, [p.title]),
          el('div', { class: 'item-sub' }, [fmtDateTime(p.event_date)]),
        ]),
      ]));
    }
    container.appendChild(card);
  }
}

function statTile(label, value, color) {
  return el('div', { class: 'stat' }, [
    el('div', { class: 'stat-label' }, [label]),
    el('div', { class: `stat-value ${color}` }, [value]),
  ]);
}

function noGroupBanner() {
  return el('div', { class: 'card' }, [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ico' }, ['◫']),
      el('div', { class: 'empty-title' }, ['Нет активной группы']),
      el('div', { class: 'empty-text' }, ['Создайте группу или присоединитесь к существующей']),
    ]),
    el('div', { class: 'row', style: 'justify-content:center;' }, [
      el('button', { class: 'btn btn-primary', onclick: () => openCreateGroupModal() }, ['+ Создать группу']),
      el('button', { class: 'btn btn-ghost', onclick: () => openJoinGroupModal() }, ['Присоединиться']),
    ]),
  ]);
}

/* =============================================================
   VIEW: PROFILE
   ============================================================= */
async function renderProfile(container) {
  const me = await apiCall('GET', '/users/me');
  state.user = me.data;
  const u = me.data;

  container.innerHTML = '';
  const card = el('div', { class: 'card', style: 'max-width:560px;' });
  card.appendChild(el('div', { class: 'card-head' }, [
    el('div', { class: 'card-title' }, ['Профиль']),
    el('span', { class: 'tag tag-cyan' }, [`v${u.version}`]),
  ]));

  const form = el('form', { class: 'auth-form' });

  form.appendChild(field('Имя', el('input', { name: 'full_name', value: u.full_name || '', required: true, minlength: 3, maxlength: 100 })));
  form.appendChild(field('Возраст', el('input', { name: 'age', type: 'number', value: u.age, min: 18, max: 100, required: true })));
  form.appendChild(field('Телефон', el('input', { name: 'phone_number', type: 'tel', value: u.phone_number || '', required: true })));

  const actions = el('div', { class: 'row-between mt-24' }, [
    el('button', { type: 'button', class: 'btn btn-danger-ghost', onclick: () => openDeleteAccountModal() }, ['Удалить аккаунт']),
    el('button', { type: 'submit', class: 'btn btn-primary' }, ['Сохранить']),
  ]);
  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const res = await apiCall('PATCH', '/users/me', {
        full_name: fd.get('full_name').trim(),
        age: Number(fd.get('age')),
        phone_number: fd.get('phone_number').trim(),
        version: u.version,
      });
      state.user = res.data;
      toast('Профиль обновлён', 'success');
      renderSidebarUser();
      renderProfile(container);
    } catch (err) {
      toast(err.message || 'Ошибка', 'error');
    }
  });

  card.appendChild(form);
  card.appendChild(el('div', { class: 'mt-24 text-sm text-mute' }, [
    'Создан: ' + fmtDate(u.created_at),
  ]));

  container.appendChild(card);
}

function field(label, inputEl) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, [label]),
    inputEl,
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

  const header = el('div', { class: 'section-header' }, [
    el('div', {}, [
      el('div', { class: 'section-title' }, ['Категории целей']),
      el('div', { class: 'section-sub' }, [`${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`]),
    ]),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreateGoalCategoryModal(g, container) }, ['+ Категория']),
  ]);
  container.appendChild(header);

  if (!cats.length) {
    container.appendChild(emptyState('✦', 'Пока нет категорий', 'Создайте первую категорию — «Фильмы», «Книги» или что угодно'));
    return;
  }

  const grid = el('div', { class: 'grid-auto' });
  for (const c of cats) {
    grid.appendChild(await renderGoalCategoryCard(g, c, container));
  }
  container.appendChild(grid);
}

async function renderGoalCategoryCard(g, c, container) {
  const items = await apiCall('GET', `/groups/${g.id}/goal-categories/${c.id}/items`).then(r => r.data || []).catch(() => []);
  const doneCount = items.filter(i => i.done).length;
  const pct = items.length ? (doneCount / items.length) * 100 : 0;

  const card = el('div', { class: 'card card-hover' });

  card.appendChild(el('div', { class: 'card-head' }, [
    el('div', { class: 'card-title' }, [c.name]),
    el('div', { class: 'item-actions' }, [
      el('button', { class: 'icon-btn', title: 'Переименовать', onclick: () => openRenameGoalCategoryModal(g, c, container) }, ['✎']),
      el('button', { class: 'icon-btn', title: 'Удалить', onclick: () => confirmDelete(`Удалить категорию «${c.name}»?`, async () => {
        await apiCall('DELETE', `/groups/${g.id}/goal-categories/${c.id}`);
        toast('Удалено', 'success');
        renderActiveView();
      }) }, ['✕']),
    ]),
  ]));

  if (items.length) {
    card.appendChild(el('div', { class: 'row-between text-sm text-mute' }, [
      el('span', {}, [`${doneCount} из ${items.length}`]),
      el('span', {}, [`${Math.round(pct)}%`]),
    ]));
    const pb = el('div', { class: 'progress mt-16' });
    const pf = el('div', { class: 'progress-fill' });
    pf.style.width = pct + '%';
    pb.appendChild(pf);
    card.appendChild(pb);
  }

  const list = el('div', { style: 'display:flex; flex-direction:column; gap:8px; margin-top:16px;' });
  for (const item of items) {
    list.appendChild(renderGoalItemRow(g, c, item, container));
  }
  if (!items.length) {
    list.appendChild(el('div', { class: 'text-sm text-mute', style: 'padding:8px 0;' }, ['Нет элементов']));
  }
  card.appendChild(list);

  card.appendChild(el('button', {
    class: 'btn btn-ghost btn-sm btn-block mt-16',
    onclick: () => openCreateGoalItemModal(g, c, container),
  }, ['+ Добавить элемент']));

  return card;
}

function renderGoalItemRow(g, c, item, container) {
  return el('div', { class: `item${item.done ? ' done' : ''}` }, [
    el('div', { class: `check${item.done ? ' on' : ''}`, onclick: async () => {
      try {
        await apiCall('PATCH', `/groups/${g.id}/goal-items/${item.id}`, {
          done: !item.done, version: item.version,
        });
        renderActiveView();
      } catch (err) { toast(err.message, 'error'); }
    }}),
    el('div', { class: 'item-main' }, [
      el('div', { class: 'item-title' }, [item.title]),
      item.description ? el('div', { class: 'item-sub' }, [item.description]) : null,
    ]),
    el('div', { class: 'item-actions' }, [
      el('button', { class: 'icon-btn', title: 'Удалить', onclick: () => confirmDelete('Удалить элемент?', async () => {
        await apiCall('DELETE', `/groups/${g.id}/goal-items/${item.id}`);
        toast('Удалено', 'success');
        renderActiveView();
      }) }, ['✕']),
    ]),
  ]);
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

  // ---- Категории ----
  const catHeader = el('div', { class: 'section-header' }, [
    el('div', {}, [
      el('div', { class: 'section-title' }, ['Категории']),
      el('div', { class: 'section-sub' }, [`${cats.length} ${plural(cats.length, 'категория', 'категории', 'категорий')}`]),
    ]),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreateCategoryModal(g, container) }, ['+ Категория']),
  ]);
  container.appendChild(catHeader);

  if (!cats.length) {
    container.appendChild(emptyState('◈', 'Нет категорий', 'Добавьте категорию бюджета — «Еда», «Транспорт» и т.д.'));
  } else {
    const cg = el('div', { class: 'grid-auto' });
    for (const c of cats) {
      const item = summary?.categories?.find(x => x.category_id === c.id);
      const spent = item?.spent || 0;
      const pct = c.budget_limit > 0 ? Math.min(100, (spent / c.budget_limit) * 100) : 0;

      const card = el('div', { class: 'card card-hover' });
      card.appendChild(el('div', { class: 'card-head' }, [
        el('div', {}, [
          el('div', { class: 'card-title' }, [c.name]),
          el('span', { class: `tag ${c.type === 'fixed' ? 'tag-cyan' : 'tag-violet'}`, style: 'margin-top:6px;' },
            [c.type === 'fixed' ? 'постоянная' : 'спонтанная']),
        ]),
        el('div', { class: 'item-actions' }, [
          el('button', { class: 'icon-btn', title: 'Удалить', onclick: () => confirmDelete(`Удалить «${c.name}»?`, async () => {
            await apiCall('DELETE', `/groups/${g.id}/categories/${c.id}`);
            toast('Удалено', 'success');
            renderActiveView();
          }) }, ['✕']),
        ]),
      ]));

      card.appendChild(el('div', { class: 'row-between text-sm' }, [
        el('span', { class: 'text-mute' }, ['Потрачено']),
        el('span', { class: 'mono' }, [fmtMoney(spent)]),
      ]));
      card.appendChild(el('div', { class: 'row-between text-sm' }, [
        el('span', { class: 'text-mute' }, ['Лимит']),
        el('span', { class: 'mono' }, [fmtMoney(c.budget_limit)]),
      ]));
      const pb = el('div', { class: 'progress mt-16' });
      const pf = el('div', { class: `progress-fill${spent > c.budget_limit && c.budget_limit > 0 ? ' danger' : ''}` });
      pf.style.width = pct + '%';
      pb.appendChild(pf);
      card.appendChild(pb);

      cg.appendChild(card);
    }
    container.appendChild(cg);
  }

  // ---- Транзакции ----
  const txHeader = el('div', { class: 'section-header mt-24' }, [
    el('div', {}, [
      el('div', { class: 'section-title' }, ['Транзакции']),
      el('div', { class: 'section-sub' }, [`последние ${txs.length}`]),
    ]),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreateTransactionModal(g, cats, container) }, ['+ Транзакция']),
  ]);
  container.appendChild(txHeader);

  if (!txs.length) {
    container.appendChild(emptyState('◈', 'Нет транзакций', 'Добавьте первую транзакцию'));
  } else {
    const card = el('div', { class: 'card' });
    const list = el('div', { style: 'display:flex; flex-direction:column; gap:8px;' });
    for (const t of txs) {
      const cat = cats.find(c => c.id === t.category_id);
      list.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'flex-1' }, [
          el('div', { class: 'item-title' }, [t.description || '—']),
          el('div', { class: 'item-sub' }, [
            (cat?.name || 'без категории') + ' · ' + fmtDateTime(t.date),
          ]),
        ]),
        el('div', { class: 'mono', style: 'font-weight:600; color: var(--cyan);' }, ['−' + fmtMoney(t.amount)]),
      ]));
    }
    card.appendChild(list);
    container.appendChild(card);
  }
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

  const header = el('div', { class: 'section-header' }, [
    el('div', {}, [
      el('div', { class: 'section-title' }, ['События']),
      el('div', { class: 'section-sub' }, [`${plans.length} ${plural(plans.length, 'событие', 'события', 'событий')}`]),
    ]),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openCreatePlanModal(g, container) }, ['+ Событие']),
  ]);
  container.appendChild(header);

  if (!plans.length) {
    container.appendChild(emptyState('✎', 'Нет планов', 'Создайте первое событие — пикник, поездку, вечеринку'));
    return;
  }

  const grid = el('div', { class: 'grid-auto' });
  for (const p of plans) {
    grid.appendChild(await renderPlanCard(g, p, container));
  }
  container.appendChild(grid);
}

async function renderPlanCard(g, p, container) {
  const items = await apiCall('GET', `/groups/${g.id}/plans/${p.id}/checklist`)
    .then(r => r.data || []).catch(() => []);
  const doneCount = items.filter(i => i.is_checked).length;

  const card = el('div', { class: `card card-hover${p.is_done ? ' done' : ''}` });

  card.appendChild(el('div', { class: 'card-head' }, [
    el('div', {}, [
      el('div', { class: 'card-title', style: p.is_done ? 'text-decoration: line-through; opacity:0.6;' : '' }, [p.title]),
      el('div', { class: 'item-sub' }, [fmtDateTime(p.event_date)]),
    ]),
    el('div', { class: 'item-actions' }, [
      el('button', { class: 'icon-btn', title: p.is_done ? 'Вернуть' : 'Готово', onclick: async () => {
        try {
          await apiCall('PATCH', `/groups/${g.id}/plans/${p.id}`, {
            title: p.title, description: p.description || '',
            event_date: p.event_date, is_done: !p.is_done, version: p.version,
          });
          renderActiveView();
        } catch (err) { toast(err.message, 'error'); }
      }}, [p.is_done ? '↺' : '✓']),
      el('button', { class: 'icon-btn', title: 'Удалить', onclick: () => confirmDelete('Удалить событие?', async () => {
        await apiCall('DELETE', `/groups/${g.id}/plans/${p.id}`);
        toast('Удалено', 'success');
        renderActiveView();
      }) }, ['✕']),
    ]),
  ]));

  if (p.description) {
    card.appendChild(el('div', { class: 'text-sm text-dim', style: 'margin-bottom:8px;' }, [p.description]));
  }

  const list = el('div', { style: 'display:flex; flex-direction:column; gap:6px; margin-top:12px;' });
  for (const item of items) {
    list.appendChild(el('div', { class: `item${item.is_checked ? ' done' : ''}`, style: 'padding:10px 12px;' }, [
      el('div', { class: `check${item.is_checked ? ' on' : ''}`, onclick: async () => {
        try {
          await apiCall('PATCH', `/groups/${g.id}/checklist/${item.id}`, {
            text: item.text, is_checked: !item.is_checked, version: item.version,
          });
          renderActiveView();
        } catch (err) { toast(err.message, 'error'); }
      }}),
      el('div', { class: 'item-main' }, [
        el('div', { class: 'item-title', style: 'font-size:13px; font-weight:500;' }, [item.text]),
      ]),
      el('button', { class: 'icon-btn', style: 'width:26px; height:26px; border-radius:8px;', onclick: async () => {
        try {
          await apiCall('DELETE', `/groups/${g.id}/checklist/${item.id}`);
          renderActiveView();
        } catch (err) { toast(err.message, 'error'); }
      }}, ['✕']),
    ]));
  }
  if (items.length) {
    card.appendChild(el('div', { class: 'text-sm text-mute mt-16' }, [`${doneCount} / ${items.length} пунктов`]));
    card.appendChild(list);
  }

  card.appendChild(el('div', { class: 'row mt-16' }, [
    el('button', { class: 'btn btn-ghost btn-sm flex-1', onclick: () => openCreateChecklistModal(g, p, container) }, ['+ пункт чек-листа']),
  ]));

  return card;
}

/* =============================================================
   MODALS
   ============================================================= */
function openModal({ title, body, onSave, saveLabel = 'Сохранить' }) {
  const root = $('#modal-root');
  root.innerHTML = '';

  const backdrop = el('div', { class: 'modal-backdrop', onclick: (e) => {
    if (e.target === backdrop) closeModal();
  }});

  const modal = el('div', { class: 'modal' });
  modal.appendChild(el('div', { class: 'modal-title' }, [title]));

  const form = el('form', { class: 'modal-body' });
  form.appendChild(body);

  const actions = el('div', { class: 'modal-actions' }, [
    el('button', { type: 'button', class: 'btn btn-ghost', onclick: closeModal }, ['Отмена']),
    el('button', { type: 'submit', class: 'btn btn-primary' }, [saveLabel]),
  ]);
  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await onSave(new FormData(form));
      closeModal();
    } catch (err) {
      toast(err.message || 'Ошибка', 'error');
    }
  });

  modal.appendChild(form);
  backdrop.appendChild(modal);
  root.appendChild(backdrop);

  // Focus first input
  const first = modal.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 50);
}

function closeModal() {
  $('#modal-root').innerHTML = '';
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
   GROUP MODALS
   ============================================================= */
function openCreateGroupModal() {
  openModal({
    title: 'Новая группа',
    body: field('Название', el('input', { name: 'name', required: true, minlength: 1, maxlength: 100, placeholder: 'Семья' })),
    onSave: async (fd) => {
      const res = await apiCall('POST', '/groups', { name: fd.get('name').trim() });
      state.groups.push(res.data);
      state.activeGroupId = res.data.id;
      localStorage.setItem('active_group', res.data.id);
      renderGroupSelect();
      await renderActiveView();
      toast('Группа создана', 'success');
    },
  });
}

function openJoinGroupModal() {
  openModal({
    title: 'Присоединиться к группе',
    body: el('div', {}, [
      el('p', { class: 'text-sm text-dim', style: 'margin-bottom:12px;' },
        ['Введите ID группы, чтобы присоединиться.'],
      ),
      field('Group ID', el('input', { name: 'group_id', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })),
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

function openInviteModal(g, container) {
  openModal({
    title: 'Пригласить в группу',
    body: field('Телефон', el('input', { name: 'phone_number', type: 'tel', required: true, placeholder: '+79991234567' })),
    saveLabel: 'Пригласить',
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/invite`, { phone_number: fd.get('phone_number').trim() });
      toast('Приглашение отправлено', 'success');
    },
  });
}

/* =============================================================
   GOAL MODALS
   ============================================================= */
function openCreateGoalCategoryModal(g, container) {
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

function openRenameGoalCategoryModal(g, c, container) {
  openModal({
    title: 'Переименовать категорию',
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

function openCreateGoalItemModal(g, c, container) {
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
   BUDGET MODALS
   ============================================================= */
function openCreateCategoryModal(g, container) {
  const typeSelect = el('select', { name: 'type', required: true }, [
    el('option', { value: 'fixed' }, ['Постоянная (еда, дом)']),
    el('option', { value: 'spontaneous' }, ['Спонтанная']),
  ]);
  openModal({
    title: 'Новая категория',
    body: el('div', {}, [
      field('Название', el('input', { name: 'name', required: true, maxlength: 100, placeholder: 'Еда' })),
      field('Тип', typeSelect),
      field('Лимит (₽)', el('input', { name: 'budget_limit', type: 'number', min: 0, step: '0.01', value: 0, required: true })),
    ]),
    onSave: async (fd) => {
      await apiCall('POST', `/groups/${g.id}/categories`, {
        name: fd.get('name').trim(),
        type: fd.get('type'),
        budget_limit: Number(fd.get('budget_limit')),
      });
      toast('Категория создана', 'success');
      renderActiveView();
    },
  });
}

function openCreateTransactionModal(g, cats, container) {
  if (!cats.length) {
    toast('Сначала создайте категорию', 'error');
    return;
  }
  const catSelect = el('select', { name: 'category_id', required: true },
    cats.map(c => el('option', { value: c.id }, [c.name])));

  openModal({
    title: 'Новая транзакция',
    body: el('div', {}, [
      field('Категория', catSelect),
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
      toast('Транзакция добавлена', 'success');
      renderActiveView();
    },
  });
}

/* =============================================================
   PLAN MODALS
   ============================================================= */
function openCreatePlanModal(g, container) {
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
      toast('Событие создано', 'success');
      renderActiveView();
    },
  });
}

function openCreateChecklistModal(g, p, container) {
  openModal({
    title: 'Новый пункт чек-листа',
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
   PROFILE DELETE MODAL
   ============================================================= */
function openDeleteAccountModal() {
  openModal({
    title: 'Удалить аккаунт?',
    body: el('div', {}, [
      el('p', { class: 'text-dim', style: 'margin-bottom:12px;' },
        ['Это действие необратимо. Все ваши данные и членство в группах будут удалены.']),
      field('Пароль', el('input', { name: 'password', type: 'password', required: true })),
    ]),
    saveLabel: 'Удалить навсегда',
    onSave: async (fd) => {
      await apiCall('DELETE', '/users/me', { password: fd.get('password') });
      toast('Аккаунт удалён', 'success');
      logout();
    },
  });
}

/* =============================================================
   UTILITIES
   ============================================================= */
function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
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
   INIT
   ============================================================= */
function initApp() {
  initAuthScreen();

  // Nav
  $$('.nav-item').forEach(n => n.addEventListener('click', () => switchView(n.dataset.view)));

  // Group select
  $('#group-select').addEventListener('change', (e) => {
    state.activeGroupId = e.target.value || null;
    if (state.activeGroupId) localStorage.setItem('active_group', state.activeGroupId);
    else localStorage.removeItem('active_group');
    renderTopbarGroup();
    renderActiveView();
  });

  $('#btn-new-group').addEventListener('click', () => openCreateGroupModal());
  $('#btn-join-group').addEventListener('click', () => openJoinGroupModal());
  $('#btn-logout').addEventListener('click', () => logout());

  // Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

async function main() {
  initApp();

  if (state.token) {
    try {
      await bootstrapApp();
    } catch (err) {
      showScreen('auth');
    }
  } else {
    showScreen('auth');
  }

  setBusy(false);
}

main();