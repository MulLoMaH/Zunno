// ═══════════════════════════════════════════════════════════════
// ZUNNO — Vanilla JS SPA
// ═══════════════════════════════════════════════════════════════

const API = '/api/v1';

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

const state = {
  user: null,
  theme: localStorage.getItem('zunno-theme') || 'dark',
  view: 'dashboard',
  currentGroupId: null,
  groups: [],
  members: [],
  categories: [],
  transactions: [],
  plans: [],
  rsvps: [],
  comments: [],
  checklist: [],
  goalCategories: [],
  goalItems: [],
  debts: { incoming: [], outgoing: [] },
  invitations: [],
  selectedPlanId: null,
  fabOpen: false,
  sidebarOpen: false,
  telegramLinked: localStorage.getItem('zunno-telegram-linked') === 'true',
};

// Mock data for demo
const MOCK = {
  user: { id: 'user-1', version: 1, full_name: 'Алексей Иванов', age: 28, phone_number: '+79991234567', currency: 'RUB' },
  groups: [
    { id: 'group-1', version: 1, name: 'Семья', owner_id: 'user-1', created_at: '2024-01-15T10:00:00Z' },
    { id: 'group-2', version: 1, name: 'Друзья', owner_id: 'user-2', created_at: '2024-02-20T14:00:00Z' },
  ],
  members: [
    { user_id: 'user-1', group_id: 'group-1', role: 'admin', status: 'active', joined_at: '2024-01-15T10:00:00Z', full_name: 'Алексей Иванов', phone_number: '+79991234567' },
    { user_id: 'user-2', group_id: 'group-1', role: 'member', status: 'active', joined_at: '2024-01-16T10:00:00Z', full_name: 'Мария Иванова', phone_number: '+79997654321' },
    { user_id: 'user-3', group_id: 'group-1', role: 'member', status: 'active', joined_at: '2024-01-17T10:00:00Z', full_name: 'Дмитрий Петров', phone_number: '+79991112233' },
    { user_id: 'user-4', group_id: 'group-1', role: 'member', status: 'active', joined_at: '2024-01-18T10:00:00Z', full_name: 'Елена Сидорова', phone_number: '+79994445566' },
  ],
  categories: [
    { id: 'cat-1', version: 1, group_id: 'group-1', name: 'Продукты', type: 'fixed', budget_limit: 15000, created_at: '2024-01-15T10:00:00Z' },
    { id: 'cat-2', version: 1, group_id: 'group-1', name: 'Развлечения', type: 'spontaneous', budget_limit: 8000, created_at: '2024-01-15T10:00:00Z' },
    { id: 'cat-3', version: 1, group_id: 'group-1', name: 'Транспорт', type: 'fixed', budget_limit: 5000, created_at: '2024-01-15T10:00:00Z' },
    { id: 'cat-4', version: 1, group_id: 'group-1', name: 'Коммунальные', type: 'fixed', budget_limit: 12000, created_at: '2024-01-15T10:00:00Z' },
    { id: 'cat-5', version: 1, group_id: 'group-1', name: 'Рестораны', type: 'spontaneous', budget_limit: 6000, created_at: '2024-01-15T10:00:00Z' },
  ],
  transactions: [
    { id: 'tx-1', version: 1, group_id: 'group-1', user_id: 'user-1', category_id: 'cat-1', amount: 3500, type: 'expense', date: '2026-01-15T10:30:00Z', description: 'Пятёрочка', created_at: '2026-01-15T10:30:00Z' },
    { id: 'tx-2', version: 1, group_id: 'group-1', user_id: 'user-2', category_id: 'cat-2', amount: 2000, type: 'expense', date: '2026-01-14T18:00:00Z', description: 'Кино', created_at: '2026-01-14T18:00:00Z' },
    { id: 'tx-3', version: 1, group_id: 'group-1', user_id: 'user-1', category_id: 'cat-3', amount: 1500, type: 'expense', date: '2026-01-13T09:00:00Z', description: 'Такси', created_at: '2026-01-13T09:00:00Z' },
    { id: 'tx-4', version: 1, group_id: 'group-1', user_id: 'user-1', category_id: 'cat-1', amount: 4200, type: 'expense', date: '2026-01-12T11:00:00Z', description: 'Перекрёсток', created_at: '2026-01-12T11:00:00Z' },
    { id: 'tx-5', version: 1, group_id: 'group-1', user_id: 'user-3', category_id: 'cat-5', amount: 3000, type: 'expense', date: '2026-01-11T20:00:00Z', description: 'Ужин в ресторане', created_at: '2026-01-11T20:00:00Z' },
    { id: 'tx-6', version: 1, group_id: 'group-1', user_id: 'user-1', category_id: 'cat-4', amount: 8500, type: 'expense', date: '2026-01-10T14:00:00Z', description: 'ЖКХ январь', created_at: '2026-01-10T14:00:00Z' },
  ],
  plans: [
    { id: 'plan-1', version: 1, group_id: 'group-1', creator_id: 'user-1', title: 'Поход в горы', description: 'Выезжаем в субботу утром', event_date: '2026-01-25T09:00:00Z', is_done: false, created_at: '2026-01-10T10:00:00Z', done_at: null, recurrence_rule: null, recurrence_until: null, parent_plan_id: null },
    { id: 'plan-2', version: 1, group_id: 'group-1', creator_id: 'user-2', title: 'Семейный ужин', description: 'Готовим вместе', event_date: '2026-01-20T18:00:00Z', is_done: false, created_at: '2026-01-09T10:00:00Z', done_at: null, recurrence_rule: 'weekly', recurrence_until: '2026-03-01T00:00:00Z', parent_plan_id: null },
    { id: 'plan-3', version: 1, group_id: 'group-1', creator_id: 'user-1', title: 'Покупка подарка маме', description: 'Скидываемся на день рождения', event_date: '2026-02-14T10:00:00Z', is_done: false, created_at: '2026-01-08T10:00:00Z', done_at: null, recurrence_rule: null, recurrence_until: null, parent_plan_id: null },
  ],
  rsvps: [
    { UserID: 'user-1', EventID: 'plan-1', Status: 'going', UpdatedAt: '2026-01-15T10:00:00Z' },
    { UserID: 'user-2', EventID: 'plan-1', Status: 'maybe', UpdatedAt: '2026-01-15T11:00:00Z' },
    { UserID: 'user-3', EventID: 'plan-1', Status: 'going', UpdatedAt: '2026-01-14T09:00:00Z' },
  ],
  comments: [
    { ID: 'cmt-1', EventID: 'plan-1', UserID: 'user-2', FullName: 'Мария Иванова', Text: 'Отличная идея! Какая сложность маршрута?', CreatedAt: '2026-01-15T10:30:00Z' },
    { ID: 'cmt-2', EventID: 'plan-1', UserID: 'user-1', FullName: 'Алексей Иванов', Text: 'Лёгкий, 5 км. Берём перекус и воду.', CreatedAt: '2026-01-15T11:00:00Z' },
    { ID: 'cmt-3', EventID: 'plan-1', UserID: 'user-3', FullName: 'Дмитрий Петров', Text: 'Я с вами! Во сколько выезжаем?', CreatedAt: '2026-01-15T12:00:00Z' },
  ],
  checklist: [
    { id: 'cl-1', version: 1, event_id: 'plan-1', text: 'Взять воду', is_checked: true, checked_at: '2026-01-15T10:00:00Z' },
    { id: 'cl-2', version: 1, event_id: 'plan-1', text: 'Купить перекус', is_checked: false, checked_at: null },
    { id: 'cl-3', version: 1, event_id: 'plan-1', text: 'Проверить погоду', is_checked: false, checked_at: null },
  ],
  goalCategories: [
    { id: 'gc-1', version: 1, group_id: 'group-1', name: 'Отпуск в Турции', due_date: '2026-06-01T00:00:00Z', notified_due_at: null },
    { id: 'gc-2', version: 1, group_id: 'group-1', name: 'Новая машина', due_date: '2026-12-31T00:00:00Z', notified_due_at: null },
    { id: 'gc-3', version: 1, group_id: 'group-1', name: 'Ремонт кухни', due_date: null, notified_due_at: null },
  ],
  goalItems: [
    { id: 'gi-1', version: 1, category_id: 'gc-1', title: 'Накопить 50 000₽ на билеты', description: '', done: true, created_at: '2026-01-01T00:00:00Z', done_at: '2026-01-10T00:00:00Z' },
    { id: 'gi-2', version: 1, category_id: 'gc-1', title: 'Забронировать отель', description: 'All inclusive', done: false, created_at: '2026-01-01T00:00:00Z', done_at: null },
    { id: 'gi-3', version: 1, category_id: 'gc-1', title: 'Оформить страховку', description: '', done: false, created_at: '2026-01-01T00:00:00Z', done_at: null },
    { id: 'gi-4', version: 1, category_id: 'gc-2', title: 'Первый взнос 300 000₽', description: '', done: false, created_at: '2026-01-01T00:00:00Z', done_at: null },
    { id: 'gi-5', version: 1, category_id: 'gc-2', title: 'Выбрать модель', description: '', done: false, created_at: '2026-01-01T00:00:00Z', done_at: null },
  ],
  debts: {
    incoming: [
      { id: 'debt-3', group_id: 'group-1', transaction_id: null, creditor_id: 'user-1', creditor_name: 'Алексей Иванов', debtor_id: 'user-4', debtor_name: 'Елена Сидорова', amount: 2000, is_paid: false, created_at: '2026-01-10T15:00:00Z', paid_at: null },
    ],
    outgoing: [
      { id: 'debt-1', group_id: 'group-1', transaction_id: 'tx-5', creditor_id: 'user-3', creditor_name: 'Дмитрий Петров', debtor_id: 'user-1', debtor_name: 'Алексей Иванов', amount: 750, is_paid: false, created_at: '2026-01-11T20:00:00Z', paid_at: null },
    ],
  },
  invitations: [
    { group_id: 'group-3', group_name: 'Коллеги', role: 'member', inviter_name: 'Ольга Козлова', created_at: '2026-01-14T09:00:00Z' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// API LAYER
// ═══════════════════════════════════════════════════════════════

async function apiCall(method, path, body = null) {
  const token = localStorage.getItem('zunno-token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      credentials: 'include',
    });

    if (res.status === 401) {
      // Try refresh
      const refreshRes = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('zunno-token', data.access_token);
        // Retry original request
        return apiCall(method, path, body);
      } else {
        logout();
        throw new Error('Session expired');
      }
    }

    if (res.status === 204) return null;
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'API error');
    }
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    throw e;
  }
}

// Auth API
const AuthAPI = {
  register: (data) => apiCall('POST', '/auth/register', data),
  login: (data) => apiCall('POST', '/auth/login', data),
  logout: () => apiCall('POST', '/auth/logout'),
};

// Users API
const UsersAPI = {
  getMe: () => apiCall('GET', '/users/me'),
  updateMe: (data) => apiCall('PATCH', '/users/me', data),
  deleteMe: (password) => apiCall('DELETE', '/users/me', { password }),
  changePassword: (old_password, new_password) => apiCall('PATCH', '/users/me/password', { old_password, new_password }),
};

// Telegram API
const TelegramAPI = {
  link: () => apiCall('POST', '/users/me/telegram/link'),
  unlink: () => apiCall('DELETE', '/users/me/telegram'),
};

// Groups API
const GroupsAPI = {
  list: () => apiCall('GET', '/groups'),
  create: (name) => apiCall('POST', '/groups', { name }),
  update: (id, name, version) => apiCall('PATCH', `/groups/${id}`, { name, version }),
  delete: (id) => apiCall('DELETE', `/groups/${id}`),
  members: (id) => apiCall('GET', `/groups/${id}/members`),
  updateMemberRole: (groupId, userId, role) => apiCall('PATCH', `/groups/${groupId}/members/${userId}`, { role }),
  removeMember: (groupId, userId) => apiCall('DELETE', `/groups/${groupId}/members/${userId}`),
  leave: (id) => apiCall('POST', `/groups/${id}/leave`),
};

// Invitations API
const InvitationsAPI = {
  list: () => apiCall('GET', '/invitations'),
  invite: (groupId, phoneNumber) => apiCall('POST', `/groups/${groupId}/invite`, { phone_number: phoneNumber }),
  join: (groupId) => apiCall('POST', `/groups/${groupId}/join`),
  decline: (groupId) => apiCall('POST', `/groups/${groupId}/decline`),
};

// Categories API
const CategoriesAPI = {
  list: (groupId) => apiCall('GET', `/groups/${groupId}/categories`),
  create: (groupId, data) => apiCall('POST', `/groups/${groupId}/categories`, data),
  update: (groupId, catId, data) => apiCall('PATCH', `/groups/${groupId}/categories/${catId}`, data),
  delete: (groupId, catId) => apiCall('DELETE', `/groups/${groupId}/categories/${catId}`),
};

// Transactions API
const TransactionsAPI = {
  list: (groupId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiCall('GET', `/groups/${groupId}/transactions${qs ? '?' + qs : ''}`);
  },
  create: (groupId, data) => apiCall('POST', `/groups/${groupId}/transactions`, data),
  delete: (groupId, txId) => apiCall('DELETE', `/groups/${groupId}/transactions/${txId}`),
  export: (groupId) => fetch(`${API}/groups/${groupId}/transactions/export`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('zunno-token')}` }, credentials: 'include' }),
  split: (groupId, data) => apiCall('POST', `/groups/${groupId}/transactions/split`, data),
};

// Budget API
const BudgetAPI = {
  summary: (groupId, month) => apiCall('GET', `/groups/${groupId}/budget/summary?month=${month}`),
  members: (groupId, month) => apiCall('GET', `/groups/${groupId}/budget/members?month=${month}`),
  statistics: (groupId, month) => apiCall('GET', `/groups/${groupId}/statistics?month=${month}`),
};

// Plans API
const PlansAPI = {
  list: (groupId, from, to) => apiCall('GET', `/groups/${groupId}/plans?from=${from}&to=${to}`),
  create: (groupId, data) => apiCall('POST', `/groups/${groupId}/plans`, data),
  update: (groupId, planId, data) => apiCall('PATCH', `/groups/${groupId}/plans/${planId}`, data),
  delete: (groupId, planId) => apiCall('DELETE', `/groups/${groupId}/plans/${planId}`),
  rsvp: (groupId, planId, status) => apiCall('POST', `/groups/${groupId}/plans/${planId}/rsvp`, { status }),
  getRsvp: (groupId, planId) => apiCall('GET', `/groups/${groupId}/plans/${planId}/rsvp`),
  addComment: (groupId, planId, text) => apiCall('POST', `/groups/${groupId}/plans/${planId}/comments`, { text }),
  getComments: (groupId, planId) => apiCall('GET', `/groups/${groupId}/plans/${planId}/comments`),
  addChecklist: (groupId, planId, text) => apiCall('POST', `/groups/${groupId}/plans/${planId}/checklist`, { text }),
  getChecklist: (groupId, planId) => apiCall('GET', `/groups/${groupId}/plans/${planId}/checklist`),
  updateChecklist: (groupId, itemId, data) => apiCall('PATCH', `/groups/${groupId}/checklist/${itemId}`, data),
  deleteChecklist: (groupId, itemId) => apiCall('DELETE', `/groups/${groupId}/checklist/${itemId}`),
};

// Goals API
const GoalsAPI = {
  listCategories: (groupId) => apiCall('GET', `/groups/${groupId}/goal-categories`),
  createCategory: (groupId, name) => apiCall('POST', `/groups/${groupId}/goal-categories`, { name }),
  updateCategory: (groupId, catId, data) => apiCall('PATCH', `/groups/${groupId}/goal-categories/${catId}`, data),
  deleteCategory: (groupId, catId) => apiCall('DELETE', `/groups/${groupId}/goal-categories/${catId}`),
  setDueDate: (groupId, catId, due_date) => apiCall('PUT', `/groups/${groupId}/goal-categories/${catId}/due`, { due_date }),
  reorderCategories: (groupId, ids) => apiCall('POST', `/groups/${groupId}/goal-categories/reorder`, { ids }),
  listItems: (groupId, catId) => apiCall('GET', `/groups/${groupId}/goal-categories/${catId}/items`),
  createItem: (groupId, catId, data) => apiCall('POST', `/groups/${groupId}/goal-categories/${catId}/items`, data),
  updateItem: (groupId, itemId, data) => apiCall('PATCH', `/groups/${groupId}/goal-items/${itemId}`, data),
  deleteItem: (groupId, itemId) => apiCall('DELETE', `/groups/${groupId}/goal-items/${itemId}`),
  reorderItems: (groupId, catId, ids) => apiCall('POST', `/groups/${groupId}/goal-categories/${catId}/items/reorder`, { ids }),
};

// Debts API
const DebtsAPI = {
  list: (groupId) => apiCall('GET', `/groups/${groupId}/debts`),
  pay: (groupId, debtId) => apiCall('POST', `/groups/${groupId}/debts/${debtId}/pay`),
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatCurrency(amount, currency = 'RUB') {
  const symbols = { RUB: '₽', USD: '$', EUR: '€', KZT: '₸' };
  return `${amount.toLocaleString('ru-RU')} ${symbols[currency] || '₽'}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function getCategoryName(id) {
  return state.categories.find(c => c.id === id)?.name || 'Без категории';
}

function getMemberName(id) {
  return state.members.find(m => m.user_id === id)?.full_name || 'Неизвестный';
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function icon(name, size = 20) {
  const icons = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    split: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>',
    telegram: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
}

// ═══════════════════════════════════════════════════════════════
// TOASTS
// ═══════════════════════════════════════════════════════════════

function showToast(message, type = 'info') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════

function showModal(title, bodyHTML, footerHTML = '') {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="icon-btn" onclick="closeModal()" aria-label="Закрыть">${icon('x')}</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    </div>
  `;
  root.style.pointerEvents = 'auto';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  root.style.pointerEvents = 'none';
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('zunno-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const colors = { dark: '#070912', light: '#eef2f8', pink: '#fdf6f8' };
    metaTheme.setAttribute('content', colors[theme]);
  }
  renderThemeSwitchers();
}

function renderThemeSwitchers() {
  const themes = ['dark', 'light', 'pink'];
  const html = themes.map(t => `
    <button class="theme-btn ${state.theme === t ? 'active' : ''}" data-theme="${t}" onclick="applyTheme('${t}')" title="${t === 'dark' ? 'Тёмная' : t === 'light' ? 'Светлая' : 'Розовая'}"></button>
  `).join('');
  document.getElementById('sidebar-themes').innerHTML = html;
  document.getElementById('topbar-themes').innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

let isLogin = true;

function initAuth() {
  const form = document.getElementById('auth-form');
  const switchBtn = document.getElementById('auth-switch-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('auth-phone').value;
    const password = document.getElementById('auth-password').value;

    if (!phone || phone.length < 11) { showToast('Введите корректный номер телефона', 'error'); return; }
    if (!password || password.length < 8) { showToast('Пароль должен быть минимум 8 символов', 'error'); return; }

    try {
      let data;
      if (isLogin) {
        data = await AuthAPI.login({ phone_number: phone, password });
      } else {
        const name = document.getElementById('auth-name').value;
        const age = parseInt(document.getElementById('auth-age').value);
        if (!name || name.length < 3) { showToast('Введите имя (минимум 3 символа)', 'error'); return; }
        if (!age || age < 18 || age > 100) { showToast('Возраст должен быть от 18 до 100', 'error'); return; }
        data = await AuthAPI.register({ phone_number: phone, password, full_name: name, age });
      }
      localStorage.setItem('zunno-token', data.access_token);
      state.user = data.user;
      showToast(isLogin ? 'Добро пожаловать!' : 'Регистрация успешна!', 'success');
      showApp();
    } catch (err) {
      // Demo mode — use mock data
      state.user = MOCK.user;
      showToast(isLogin ? 'Демо-режим: вход выполнен' : 'Демо-режим: регистрация выполнена', 'info');
      showApp();
    }
  });

  switchBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    document.getElementById('auth-title').textContent = isLogin ? 'Вход в Zunno' : 'Регистрация';
    document.getElementById('auth-subtitle').textContent = isLogin ? 'Управляйте совместным бюджетом' : 'Создайте аккаунт для начала';
    document.getElementById('auth-submit').textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
    document.getElementById('auth-switch-text').textContent = isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? ';
    switchBtn.textContent = isLogin ? 'Зарегистрироваться' : 'Войти';
    document.getElementById('auth-name-group').style.display = isLogin ? 'none' : 'block';
    document.getElementById('auth-age-group').style.display = isLogin ? 'none' : 'block';
  });
}

function logout() {
  localStorage.removeItem('zunno-token');
  state.user = null;
  document.getElementById('screen-auth').style.display = 'flex';
  document.getElementById('screen-app').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
// APP INIT
// ═══════════════════════════════════════════════════════════════

function showApp() {
  document.getElementById('screen-auth').style.display = 'none';
  document.getElementById('screen-app').style.display = 'flex';

  // Load mock data
  state.groups = MOCK.groups;
  state.members = MOCK.members;
  state.categories = MOCK.categories;
  state.transactions = MOCK.transactions;
  state.plans = MOCK.plans;
  state.rsvps = MOCK.rsvps;
  state.comments = MOCK.comments;
  state.checklist = MOCK.checklist;
  state.goalCategories = MOCK.goalCategories;
  state.goalItems = MOCK.goalItems;
  state.debts = MOCK.debts;
  state.invitations = MOCK.invitations;
  state.currentGroupId = state.groups[0]?.id || null;

  renderSidebar();
  renderBottomNav();
  renderFAB();
  renderView();
  updateTopbar();
  updateInvitationBadge();
}

function updateTopbar() {
  const group = state.groups.find(g => g.id === state.currentGroupId);
  if (group) {
    document.getElementById('group-name').textContent = group.name;
    document.getElementById('group-avatar').textContent = getInitials(group.name);
  }
  if (state.user) {
    document.getElementById('user-avatar').textContent = getInitials(state.user.full_name);
  }
}

function updateInvitationBadge() {
  const badge = document.getElementById('inv-badge');
  const count = state.invitations.length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════

function renderSidebar() {
  const navItems = [
    { id: 'dashboard', icon: 'home', label: 'Обзор' },
    { id: 'budget', icon: 'wallet', label: 'Бюджет' },
    { id: 'plans', icon: 'calendar', label: 'Планы' },
    { id: 'goals', icon: 'target', label: 'Цели' },
    { id: 'debts', icon: 'dollar', label: 'Долги' },
    { id: 'profile', icon: 'user', label: 'Профиль' },
  ];

  const navHTML = navItems.map(item => `
    <button class="sidebar-item ${state.view === item.id ? 'active' : ''}" data-view="${item.id}">
      ${icon(item.icon, 18)}
      <span>${item.label}</span>
    </button>
  `).join('');
  document.getElementById('sidebar-nav').innerHTML = navHTML;

  const groupsHTML = state.groups.map(g => `
    <button class="sidebar-item ${state.currentGroupId === g.id ? 'active' : ''}" data-group="${g.id}">
      <div class="avatar sm">${getInitials(g.name)}</div>
      <span class="truncate">${g.name}</span>
    </button>
  `).join('');
  document.getElementById('sidebar-groups').innerHTML = groupsHTML;

  // Event listeners
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      state.selectedPlanId = null;
      renderSidebar();
      renderView();
      closeSidebar();
    });
  });

  document.querySelectorAll('[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentGroupId = btn.dataset.group;
      state.view = 'dashboard';
      renderSidebar();
      renderView();
      updateTopbar();
      closeSidebar();
    });
  });
}

function closeSidebar() {
  state.sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════
// BOTTOM NAV
// ═══════════════════════════════════════════════════════════════

function renderBottomNav() {
  const items = [
    { id: 'dashboard', icon: 'home', label: 'Обзор' },
    { id: 'budget', icon: 'wallet', label: 'Бюджет' },
    { id: 'plans', icon: 'calendar', label: 'Планы' },
    { id: 'goals', icon: 'target', label: 'Цели' },
    { id: 'debts', icon: 'dollar', label: 'Долги' },
  ];

  const html = `<div class="bottom-nav-items">${items.map(item => `
    <button class="bottom-nav-item ${state.view === item.id ? 'active' : ''}" data-view="${item.id}">
      ${icon(item.icon, 22)}
      <span>${item.label}</span>
    </button>
  `).join('')}</div>`;
  document.getElementById('bottom-nav').innerHTML = html;

  document.querySelectorAll('#bottom-nav [data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      state.selectedPlanId = null;
      renderBottomNav();
      renderSidebar();
      renderView();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// FAB
// ═══════════════════════════════════════════════════════════════

function renderFAB() {
  const items = [
    { icon: 'dollar', label: 'Добавить трату', action: 'showTransactionModal' },
    { icon: 'split', label: 'Разделить счёт', action: 'showSplitModal' },
    { icon: 'calendar', label: 'Новый план', action: 'showPlanModal' },
    { icon: 'target', label: 'Новая цель', action: 'showGoalModal' },
  ];

  const menuHTML = items.map(item => `
    <button class="fab-menu-item" data-action="${item.action}">
      ${icon(item.icon, 18)}
      <span>${item.label}</span>
    </button>
  `).join('');
  document.getElementById('fab-menu').innerHTML = menuHTML;

  document.getElementById('fab-btn').addEventListener('click', () => {
    state.fabOpen = !state.fabOpen;
    document.getElementById('fab').classList.toggle('open', state.fabOpen);
  });

  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      window[btn.dataset.action]();
      state.fabOpen = false;
      document.getElementById('fab').classList.remove('open');
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════

function renderView() {
  const container = document.getElementById('view-container');
  renderBottomNav();
  renderSidebar();

  switch (state.view) {
    case 'dashboard': renderDashboard(container); break;
    case 'budget': renderBudget(container); break;
    case 'plans': renderPlans(container); break;
    case 'plan-detail': renderPlanDetail(container); break;
    case 'goals': renderGoals(container); break;
    case 'debts': renderDebts(container); break;
    case 'profile': renderProfile(container); break;
    default: renderDashboard(container);
  }
}

function renderDashboard(container) {
  const totalSpent = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const unpaidDebts = state.debts.incoming.length + state.debts.outgoing.length;
  const upcomingPlans = state.plans.filter(p => !p.is_done && new Date(p.event_date) > new Date()).length;
  const recentTx = state.transactions.slice(0, 5);
  const groupName = state.groups.find(g => g.id === state.currentGroupId)?.name || '';

  container.innerHTML = `
    <h1 class="view-title">Обзор</h1>
    <p class="view-subtitle">Общая картина по группе «${groupName}»</p>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Расходы</span>
        <span class="stat-value text-danger">${formatCurrency(totalSpent)}</span>
        <span class="stat-change negative">↓ 12% к прошлому месяцу</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Доходы</span>
        <span class="stat-value text-success">${formatCurrency(totalIncome)}</span>
        <span class="stat-change positive">↑ 5% к прошлому месяцу</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Долги</span>
        <span class="stat-value">${unpaidDebts}</span>
        <span class="stat-change text-muted">непогашенных</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Планы</span>
        <span class="stat-value">${upcomingPlans}</span>
        <span class="stat-change text-muted">предстоящих</span>
      </div>
    </div>
    <div class="card mb-6">
      <div class="card-header"><h3 class="card-title">Бюджет по категориям</h3></div>
      <div class="list">
        ${state.categories.slice(0, 4).map(cat => {
          const spent = state.transactions.filter(t => t.category_id === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const pct = cat.budget_limit > 0 ? Math.min(100, Math.round((spent / cat.budget_limit) * 100)) : 0;
          return `
            <div class="list-item" style="cursor:default">
              <div class="list-item-content">
                <div class="flex items-center justify-between mb-2">
                  <span class="list-item-title">${cat.name}</span>
                  <span class="text-sm text-muted">${formatCurrency(spent)} / ${formatCurrency(cat.budget_limit)}</span>
                </div>
                <div class="progress-bar"><div class="progress-fill ${pct > 90 ? 'danger' : ''}" style="width:${pct}%"></div></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">Последние операции</h3></div>
      <div class="list">
        ${recentTx.map(tx => `
          <div class="list-item" style="cursor:default">
            <div class="list-item-avatar" style="background:${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">${tx.type === 'income' ? '+' : '−'}</div>
            <div class="list-item-content">
              <div class="list-item-title">${tx.description || getCategoryName(tx.category_id)}</div>
              <div class="list-item-subtitle">${getCategoryName(tx.category_id)} · ${formatDate(tx.date)}</div>
            </div>
            <span class="font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">${tx.type === 'income' ? '+' : '−'}${formatCurrency(tx.amount)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderBudget(container) {
  const totalBudget = state.categories.reduce((s, c) => s + c.budget_limit, 0);
  const totalSpent = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  container.innerHTML = `
    <h1 class="view-title">Бюджет</h1>
    <p class="view-subtitle">Управление категориями и расходами</p>
    <div class="stats-grid">
      <div class="stat-card"><span class="stat-label">Общий бюджет</span><span class="stat-value">${formatCurrency(totalBudget)}</span></div>
      <div class="stat-card"><span class="stat-label">Потрачено</span><span class="stat-value text-danger">${formatCurrency(totalSpent)}</span></div>
      <div class="stat-card"><span class="stat-label">Остаток</span><span class="stat-value text-success">${formatCurrency(totalBudget - totalSpent)}</span></div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Категории</h3>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-secondary" id="btn-export-csv">${icon('download', 14)} CSV</button>
          <button class="btn btn-sm btn-primary" id="btn-add-category">${icon('plus', 14)} Добавить</button>
        </div>
      </div>
      <div class="list">
        ${state.categories.map(cat => {
          const spent = state.transactions.filter(t => t.category_id === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const pct = cat.budget_limit > 0 ? Math.min(100, Math.round((spent / cat.budget_limit) * 100)) : 0;
          return `
            <div class="list-item" style="cursor:default">
              <div class="list-item-content">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="list-item-title">${cat.name}</span>
                    <span class="chip ${cat.type === 'fixed' ? 'chip-primary' : 'chip-warning'}" style="font-size:10px;padding:2px 6px">${cat.type === 'fixed' ? 'Фикс' : 'Спонтан'}</span>
                  </div>
                  <span class="text-sm text-muted">${formatCurrency(spent)} / ${formatCurrency(cat.budget_limit)}</span>
                </div>
                <div class="progress-bar"><div class="progress-fill ${pct > 90 ? 'danger' : ''}" style="width:${pct}%"></div></div>
              </div>
              <button class="icon-btn sm btn-delete-cat" data-id="${cat.id}" aria-label="Удалить">${icon('trash', 16)}</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <div class="card mt-6">
      <div class="card-header"><h3 class="card-title">Все операции</h3></div>
      <div class="list">
        ${state.transactions.map(tx => `
          <div class="list-item" style="cursor:default">
            <div class="list-item-avatar" style="background:${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">${tx.type === 'income' ? '+' : '−'}</div>
            <div class="list-item-content">
              <div class="list-item-title">${tx.description || getCategoryName(tx.category_id)}</div>
              <div class="list-item-subtitle">${getMemberName(tx.user_id)} · ${getCategoryName(tx.category_id)} · ${formatDate(tx.date)}</div>
            </div>
            <span class="font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">${tx.type === 'income' ? '+' : '−'}${formatCurrency(tx.amount)}</span>
            <button class="icon-btn sm btn-delete-tx" data-id="${tx.id}" aria-label="Удалить">${icon('trash', 16)}</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('btn-add-category').addEventListener('click', showCategoryModal);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.querySelectorAll('.btn-delete-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      state.categories = state.categories.filter(c => c.id !== btn.dataset.id);
      renderView();
      showToast('Категория удалена', 'info');
    });
  });
  document.querySelectorAll('.btn-delete-tx').forEach(btn => {
    btn.addEventListener('click', () => {
      state.transactions = state.transactions.filter(t => t.id !== btn.dataset.id);
      renderView();
      showToast('Операция удалена', 'info');
    });
  });
}

function exportCSV() {
  const csv = 'Дата,Тип,Категория,Описание,Сумма,Участник\n' +
    state.transactions.map(tx =>
      `${formatDateTime(tx.date)},${tx.type === 'income' ? 'Доход' : 'Расход'},${getCategoryName(tx.category_id)},${tx.description},${tx.amount},${getMemberName(tx.user_id)}`
    ).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zunno-transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV экспортирован', 'success');
}

function renderPlans(container) {
  const recurrenceLabels = { daily: 'Каждый день', weekly: 'Каждую неделю', monthly: 'Каждый месяц' };

  container.innerHTML = `
    <h1 class="view-title">Планы</h1>
    <p class="view-subtitle">События и встречи группы</p>
    ${state.invitations.length > 0 ? `
      <div class="card mb-6" style="border-color:var(--primary);background:var(--primary-soft)">
        <div class="flex items-center gap-3">
          ${icon('mail', 20)}
          <div class="flex-1">
            <strong>${state.invitations.length} приглашений</strong>
            <p class="text-sm text-muted">От: ${state.invitations.map(i => i.inviter_name).join(', ')}</p>
          </div>
          <button class="btn btn-sm btn-primary" id="btn-view-invitations">Посмотреть</button>
        </div>
      </div>
    ` : ''}
    <div class="list">
      ${state.plans.map(plan => {
        const planRsvps = state.rsvps.filter(r => r.EventID === plan.id);
        const goingCount = planRsvps.filter(r => r.Status === 'going').length;
        return `
          <div class="list-item" data-plan-id="${plan.id}">
            <div class="list-item-avatar" style="background:${plan.is_done ? 'var(--success)' : 'var(--primary)'}">${icon('calendar', 18)}</div>
            <div class="list-item-content">
              <div class="flex items-center gap-2">
                <span class="list-item-title" style="text-decoration:${plan.is_done ? 'line-through' : 'none'}">${plan.title}</span>
                ${plan.recurrence_rule ? `<span class="chip chip-primary" style="font-size:10px;padding:2px 6px">🔁 ${recurrenceLabels[plan.recurrence_rule]}</span>` : ''}
              </div>
              <div class="list-item-subtitle">${formatDate(plan.event_date)} · ${goingCount} идут</div>
            </div>
            <div class="list-item-actions">
              <button class="icon-btn sm btn-toggle-plan" data-id="${plan.id}" aria-label="Выполнено">${icon('check', 16)}</button>
              ${icon('chevronRight', 16)}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${state.plans.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('calendar')}</div>
        <h3 class="empty-state-title">Нет планов</h3>
        <p class="empty-state-text">Создайте первый план для вашей группы</p>
        <button class="btn btn-primary" id="btn-create-plan">Создать план</button>
      </div>
    ` : ''}
  `;

  document.querySelectorAll('[data-plan-id]').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-toggle-plan')) return;
      state.selectedPlanId = item.dataset.planId;
      state.view = 'plan-detail';
      renderView();
    });
  });

  document.querySelectorAll('.btn-toggle-plan').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const plan = state.plans.find(p => p.id === btn.dataset.id);
      if (plan) { plan.is_done = !plan.is_done; renderView(); }
    });
  });

  const viewInvBtn = document.getElementById('btn-view-invitations');
  if (viewInvBtn) viewInvBtn.addEventListener('click', () => { state.view = 'profile'; renderView(); });

  const createBtn = document.getElementById('btn-create-plan');
  if (createBtn) createBtn.addEventListener('click', showPlanModal);
}

function renderPlanDetail(container) {
  const plan = state.plans.find(p => p.id === state.selectedPlanId);
  if (!plan) { container.innerHTML = '<div class="view"><p>План не найден</p></div>'; return; }

  const planRsvps = state.rsvps.filter(r => r.EventID === plan.id);
  const planComments = state.comments.filter(c => c.EventID === plan.id);
  const planChecklist = state.checklist.filter(c => c.event_id === plan.id);
  const myRsvp = planRsvps.find(r => r.UserID === state.user?.id);

  container.innerHTML = `
    <button class="btn btn-ghost mb-4" id="btn-back-plans">${icon('arrowLeft', 16)} Назад к планам</button>
    <div class="card mb-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="avatar lg">${getInitials(plan.title)}</div>
        <div class="flex-1">
          <h2 style="font-size:20px;font-weight:700">${plan.title}</h2>
          <p class="text-sm text-muted">${formatDateTime(plan.event_date)} · ${getMemberName(plan.creator_id)}</p>
        </div>
        <button class="icon-btn btn-delete-plan" aria-label="Удалить">${icon('trash', 18)}</button>
      </div>
      ${plan.description ? `<p class="text-sm mb-4" style="color:var(--text-2)">${plan.description}</p>` : ''}
      ${plan.recurrence_rule ? `<span class="chip chip-primary">🔁 Повторение: ${plan.recurrence_rule === 'daily' ? 'Каждый день' : plan.recurrence_rule === 'weekly' ? 'Каждую неделю' : 'Каждый месяц'}</span>` : ''}
    </div>
    <div class="tabs" id="plan-tabs">
      <button class="tab active" data-tab="info">Инфо</button>
      <button class="tab" data-tab="rsvp">RSVP (${planRsvps.length})</button>
      <button class="tab" data-tab="comments">Чат (${planComments.length})</button>
      <button class="tab" data-tab="checklist">Чеклист (${planChecklist.filter(c => c.is_checked).length}/${planChecklist.length})</button>
    </div>
    <div id="plan-tab-content"></div>
  `;

  document.getElementById('btn-back-plans').addEventListener('click', () => { state.view = 'plans'; state.selectedPlanId = null; renderView(); });
  document.querySelector('.btn-delete-plan').addEventListener('click', () => {
    state.plans = state.plans.filter(p => p.id !== plan.id);
    state.view = 'plans'; state.selectedPlanId = null;
    renderView();
    showToast('План удалён', 'info');
  });

  function renderTabContent(tab) {
    const content = document.getElementById('plan-tab-content');
    if (tab === 'info') {
      content.innerHTML = `
        <div class="card">
          <h3 class="card-title mb-4">Детали</h3>
          <div class="flex flex-col gap-3">
            <div class="flex justify-between"><span class="text-muted text-sm">Дата</span><span class="text-sm font-bold">${formatDateTime(plan.event_date)}</span></div>
            <div class="flex justify-between"><span class="text-muted text-sm">Создатель</span><span class="text-sm font-bold">${getMemberName(plan.creator_id)}</span></div>
            <div class="flex justify-between"><span class="text-muted text-sm">Статус</span><span class="chip ${plan.is_done ? 'chip-success' : 'chip-warning'}">${plan.is_done ? 'Завершён' : 'Активен'}</span></div>
          </div>
        </div>
      `;
    } else if (tab === 'rsvp') {
      content.innerHTML = `
        <div class="card">
          <h3 class="card-title mb-4">Кто идёт?</h3>
          <div class="rsvp-buttons mb-6">
            <button class="rsvp-btn ${myRsvp?.Status === 'going' ? 'active-going' : ''}" data-rsvp="going">✅ Иду</button>
            <button class="rsvp-btn ${myRsvp?.Status === 'not_going' ? 'active-not-going' : ''}" data-rsvp="not_going">❌ Не иду</button>
            <button class="rsvp-btn ${myRsvp?.Status === 'maybe' ? 'active-maybe' : ''}" data-rsvp="maybe">🤔 Может быть</button>
          </div>
          <div class="divider"></div>
          <div class="list mt-4">
            ${state.members.filter(m => m.status === 'active').map(member => {
              const rsvp = planRsvps.find(r => r.UserID === member.user_id);
              return `
                <div class="list-item" style="cursor:default">
                  <div class="avatar sm">${getInitials(member.full_name)}</div>
                  <span class="flex-1 text-sm font-bold">${member.full_name}</span>
                  ${rsvp ? `<span class="chip ${rsvp.Status === 'going' ? 'chip-success' : rsvp.Status === 'not_going' ? 'chip-danger' : 'chip-warning'}">${rsvp.Status === 'going' ? '✅ Иду' : rsvp.Status === 'not_going' ? '❌ Не иду' : '🤔 Может быть'}</span>` : '<span class="chip" style="font-size:10px">Нет ответа</span>'}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      content.querySelectorAll('[data-rsvp]').forEach(btn => {
        btn.addEventListener('click', () => {
          const status = btn.dataset.rsvp;
          state.rsvps = state.rsvps.filter(r => !(r.UserID === state.user.id && r.EventID === plan.id));
          state.rsvps.push({ UserID: state.user.id, EventID: plan.id, Status: status, UpdatedAt: new Date().toISOString() });
          renderTabContent('rsvp');
          showToast(`Статус: ${status === 'going' ? 'Иду' : status === 'not_going' ? 'Не иду' : 'Может быть'}`, 'success');
        });
      });
    } else if (tab === 'comments') {
      content.innerHTML = `
        <div class="card">
          <h3 class="card-title mb-4">Обсуждение</h3>
          <div class="comments-list" id="comments-list">
            ${planComments.map(c => `
              <div class="comment-item">
                <div class="avatar sm">${getInitials(c.FullName)}</div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-author">${c.FullName}</span>
                    <span class="comment-time">${formatDateTime(c.CreatedAt)}</span>
                  </div>
                  <p class="comment-text">${c.Text}</p>
                </div>
              </div>
            `).join('')}
            ${planComments.length === 0 ? '<p class="text-muted text-sm text-center p-4">Пока нет сообщений</p>' : ''}
          </div>
          <div class="comment-input-row">
            <input class="form-input" id="comment-input" placeholder="Написать сообщение..." />
            <button class="btn btn-primary" id="btn-send-comment" aria-label="Отправить">${icon('send', 16)}</button>
          </div>
        </div>
      `;
      const input = document.getElementById('comment-input');
      const sendBtn = document.getElementById('btn-send-comment');
      const sendComment = () => {
        if (!input.value.trim()) return;
        state.comments.push({ ID: generateId(), EventID: plan.id, UserID: state.user.id, FullName: state.user.full_name, Text: input.value, CreatedAt: new Date().toISOString() });
        input.value = '';
        renderTabContent('comments');
      };
      sendBtn.addEventListener('click', sendComment);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } });
    } else if (tab === 'checklist') {
      content.innerHTML = `
        <div class="card">
          <h3 class="card-title mb-4">Чеклист</h3>
          <div class="list">
            ${planChecklist.map(item => `
              <div class="list-item" data-checklist-id="${item.id}">
                <div class="checkbox ${item.is_checked ? 'checked' : ''}">${item.is_checked ? icon('check', 12) : ''}</div>
                <span class="text-sm" style="text-decoration:${item.is_checked ? 'line-through' : 'none'};color:${item.is_checked ? 'var(--text-3)' : 'var(--text)'}">${item.text}</span>
              </div>
            `).join('')}
          </div>
          <div class="flex gap-2 mt-4">
            <input class="form-input flex-1" id="checklist-input" placeholder="Новый пункт..." />
            <button class="btn btn-primary" id="btn-add-checklist">${icon('plus', 16)}</button>
          </div>
        </div>
      `;
      content.querySelectorAll('[data-checklist-id]').forEach(item => {
        item.addEventListener('click', () => {
          const cl = state.checklist.find(c => c.id === item.dataset.checklistId);
          if (cl) { cl.is_checked = !cl.is_checked; renderTabContent('checklist'); }
        });
      });
      const addBtn = document.getElementById('btn-add-checklist');
      const input = document.getElementById('checklist-input');
      const addItem = () => {
        if (!input.value.trim()) return;
        state.checklist.push({ id: generateId(), version: 1, event_id: plan.id, text: input.value, is_checked: false, checked_at: null });
        input.value = '';
        renderTabContent('checklist');
      };
      addBtn.addEventListener('click', addItem);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });
    }
  }

  document.querySelectorAll('#plan-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#plan-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTabContent(tab.dataset.tab);
    });
  });

  renderTabContent('info');
}

function renderGoals(container) {
  container.innerHTML = `
    <h1 class="view-title">Цели</h1>
    <p class="view-subtitle">Достижения и задачи группы</p>
    <div class="list" id="goals-list">
      ${state.goalCategories.map(cat => {
        const items = state.goalItems.filter(g => g.category_id === cat.id);
        const done = items.filter(g => g.done).length;
        const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
        const isUrgent = cat.due_date && new Date(cat.due_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && done < items.length;
        return `
          <div class="list-item" data-cat-id="${cat.id}" style="${isUrgent ? 'border-color:var(--danger)' : ''}">
            <div class="list-item-avatar" style="background:${isUrgent ? 'var(--danger)' : 'var(--primary)'}">${icon('target', 18)}</div>
            <div class="list-item-content">
              <div class="flex items-center gap-2">
                <span class="list-item-title">${cat.name}</span>
                ${isUrgent ? '<span class="chip chip-danger" style="font-size:10px;padding:2px 6px">Срочно!</span>' : ''}
              </div>
              <div class="list-item-subtitle">${done}/${items.length} выполнено${cat.due_date ? ` · Дедлайн: ${formatDate(cat.due_date)}` : ''}</div>
              <div class="progress-bar mt-2"><div class="progress-fill ${isUrgent ? 'danger' : ''}" style="width:${pct}%"></div></div>
            </div>
            ${icon('chevronRight', 16)}
          </div>
        `;
      }).join('')}
    </div>
    ${state.goalCategories.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('target')}</div>
        <h3 class="empty-state-title">Нет целей</h3>
        <p class="empty-state-text">Создайте первую категорию целей</p>
        <button class="btn btn-primary" id="btn-create-goal">Создать</button>
      </div>
    ` : ''}
  `;

  document.querySelectorAll('[data-cat-id]').forEach(item => {
    item.addEventListener('click', () => renderGoalDetail(item.dataset.catId));
  });

  const createBtn = document.getElementById('btn-create-goal');
  if (createBtn) createBtn.addEventListener('click', showGoalModal);
}

function renderGoalDetail(catId) {
  const cat = state.goalCategories.find(c => c.id === catId);
  if (!cat) return;
  const items = state.goalItems.filter(g => g.category_id === catId);
  const doneCount = items.filter(g => g.done).length;
  const container = document.getElementById('view-container');

  container.innerHTML = `
    <button class="btn btn-ghost mb-4" id="btn-back-goals">${icon('arrowLeft', 16)} Назад</button>
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title">${cat.name}</h3>
        ${cat.due_date ? `<span class="chip chip-primary">📅 ${formatDate(cat.due_date)}</span>` : ''}
      </div>
      <div class="flex items-center gap-3 mb-2">
        <span class="text-sm text-muted">Прогресс: ${doneCount}/${items.length}</span>
        <div class="progress-bar flex-1"><div class="progress-fill" style="width:${items.length > 0 ? (doneCount / items.length) * 100 : 0}%"></div></div>
      </div>
      <div class="flex gap-2 mt-4">
        <button class="btn btn-sm btn-secondary" id="btn-set-due">📅 Дедлайн</button>
      </div>
    </div>
    <div class="list">
      ${items.map(item => `
        <div class="list-item" data-item-id="${item.id}">
          <div class="checkbox ${item.done ? 'checked' : ''}">${item.done ? icon('check', 12) : ''}</div>
          <div class="list-item-content">
            <span class="list-item-title" style="text-decoration:${item.done ? 'line-through' : 'none'};color:${item.done ? 'var(--text-3)' : 'var(--text)'}">${item.title}</span>
            ${item.description ? `<div class="list-item-subtitle">${item.description}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-secondary mt-4" id="btn-add-goal-item">${icon('plus', 16)} Добавить пункт</button>
  `;

  document.getElementById('btn-back-goals').addEventListener('click', () => renderView());
  document.getElementById('btn-set-due').addEventListener('click', () => {
    const dateStr = prompt('Дедлайн (ГГГГ-ММ-ДД) или пусто для отмены:', cat.due_date ? cat.due_date.split('T')[0] : '');
    if (dateStr !== null) {
      cat.due_date = dateStr ? new Date(dateStr).toISOString() : null;
      renderGoalDetail(catId);
      showToast(dateStr ? 'Дедлайн установлен' : 'Дедлайн убран', 'success');
    }
  });
  document.querySelectorAll('[data-item-id]').forEach(item => {
    item.addEventListener('click', () => {
      const gi = state.goalItems.find(g => g.id === item.dataset.itemId);
      if (gi) { gi.done = !gi.done; renderGoalDetail(catId); }
    });
  });
  document.getElementById('btn-add-goal-item').addEventListener('click', () => {
    const title = prompt('Название пункта:');
    if (title) {
      state.goalItems.push({ id: generateId(), version: 1, category_id: catId, title, description: '', done: false, created_at: new Date().toISOString(), done_at: null });
      renderGoalDetail(catId);
      showToast('Пункт добавлен', 'success');
    }
  });
}

function renderDebts(container) {
  const incoming = state.debts.incoming.filter(d => !d.is_paid);
  const outgoing = state.debts.outgoing.filter(d => !d.is_paid);
  const totalIncoming = incoming.reduce((s, d) => s + d.amount, 0);
  const totalOutgoing = outgoing.reduce((s, d) => s + d.amount, 0);

  container.innerHTML = `
    <h1 class="view-title">Долги</h1>
    <p class="view-subtitle">Учёт долгов между участниками</p>
    <div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">
      <div class="stat-card"><span class="stat-label">Мне должны</span><span class="stat-value text-success">${formatCurrency(totalIncoming)}</span><span class="stat-change text-muted">${incoming.length} долгов</span></div>
      <div class="stat-card"><span class="stat-label">Я должен</span><span class="stat-value text-danger">${formatCurrency(totalOutgoing)}</span><span class="stat-change text-muted">${outgoing.length} долгов</span></div>
    </div>
    <div class="tabs" id="debt-tabs">
      <button class="tab active" data-tab="incoming">Мне должны (${incoming.length})</button>
      <button class="tab" data-tab="outgoing">Я должен (${outgoing.length})</button>
    </div>
    <div id="debt-content"></div>
  `;

  function renderDebtContent(tab) {
    const debts = tab === 'incoming' ? incoming : outgoing;
    const content = document.getElementById('debt-content');
    content.innerHTML = `
      <div class="list">
        ${debts.map(debt => `
          <div class="list-item" style="cursor:default">
            <div class="list-item-avatar" style="background:${tab === 'incoming' ? 'var(--success)' : 'var(--danger)'}">${getInitials(tab === 'incoming' ? debt.debtor_name : debt.creditor_name)}</div>
            <div class="list-item-content">
              <div class="list-item-title">${tab === 'incoming' ? debt.debtor_name : debt.creditor_name}</div>
              <div class="list-item-subtitle">${formatDate(debt.created_at)}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-bold" style="color:${tab === 'incoming' ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(debt.amount)}</span>
              ${tab === 'incoming' ? `<button class="btn btn-sm btn-primary btn-pay-debt" data-id="${debt.id}">Погашено</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ${debts.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('dollar')}</div>
          <h3 class="empty-state-title">${tab === 'incoming' ? 'Вам никто не должен' : 'Вы никому не должны'}</h3>
          <p class="empty-state-text">Отлично! Все долги погашены</p>
        </div>
      ` : ''}
    `;
    content.querySelectorAll('.btn-pay-debt').forEach(btn => {
      btn.addEventListener('click', () => {
        const debt = state.debts.incoming.find(d => d.id === btn.dataset.id);
        if (debt) { debt.is_paid = true; renderDebtContent('incoming'); showToast('Долг погашен', 'success'); }
      });
    });
  }

  document.querySelectorAll('#debt-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#debt-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDebtContent(tab.dataset.tab);
    });
  });

  renderDebtContent('incoming');
}

function renderProfile(container) {
  container.innerHTML = `
    <h1 class="view-title">Профиль</h1>
    <p class="view-subtitle">Настройки аккаунта и группы</p>
    <div class="card mb-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="avatar xl">${state.user ? getInitials(state.user.full_name) : '?'}</div>
        <div>
          <h3 style="font-size:18px;font-weight:700">${state.user?.full_name}</h3>
          <p class="text-sm text-muted">${state.user?.phone_number}</p>
          <p class="text-sm text-muted">${state.user?.age} лет · ${state.user?.currency}</p>
        </div>
      </div>
    </div>
    ${state.invitations.length > 0 ? `
      <div class="card mb-6">
        <div class="card-header">
          <h3 class="card-title">Приглашения</h3>
          <span class="chip chip-primary">${state.invitations.length}</span>
        </div>
        <div class="list">
          ${state.invitations.map(inv => `
            <div class="list-item" style="cursor:default">
              <div class="list-item-content">
                <div class="list-item-title">${inv.group_name}</div>
                <div class="list-item-subtitle">От: ${inv.inviter_name} · ${formatDate(inv.created_at)}</div>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-primary btn-accept-inv" data-id="${inv.group_id}">Принять</button>
                <button class="btn btn-sm btn-secondary btn-decline-inv" data-id="${inv.group_id}">Отклонить</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="card mb-6">
      <div class="card-header"><h3 class="card-title">Telegram уведомления</h3></div>
      ${state.telegramLinked ? `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            ${icon('telegram', 24)}
            <div><span class="font-bold text-sm">Привязан</span><p class="text-xs text-muted">Push-уведомления активны</p></div>
          </div>
          <button class="btn btn-sm btn-danger" id="btn-unlink-telegram">Отвязать</button>
        </div>
      ` : `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            ${icon('telegram', 24)}
            <div><span class="font-bold text-sm">Не привязан</span><p class="text-xs text-muted">Получайте уведомления о транзакциях</p></div>
          </div>
          <button class="btn btn-sm btn-primary" id="btn-link-telegram">Привязать</button>
        </div>
      `}
    </div>
    <div class="card mb-6">
      <div class="card-header"><h3 class="card-title">Тема оформления</h3></div>
      <div class="theme-switcher" id="profile-themes"></div>
      <p class="text-xs text-muted mt-2">${state.theme === 'dark' ? '🌙 Тёмная тема' : state.theme === 'light' ? '☀️ Светлая тема' : '🌸 Розовая тема'}</p>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">Участники группы</h3></div>
      <div class="list">
        ${state.members.filter(m => m.status === 'active').map(member => `
          <div class="list-item" style="cursor:default">
            <div class="avatar sm">${getInitials(member.full_name)}</div>
            <div class="list-item-content">
              <div class="list-item-title">${member.full_name}${member.user_id === state.user?.id ? ' (вы)' : ''}</div>
              <div class="list-item-subtitle">${member.phone_number}</div>
            </div>
            <span class="chip ${member.role === 'admin' ? 'chip-primary' : ''}" style="font-size:10px">${member.role === 'admin' ? 'Админ' : 'Участник'}</span>
            ${member.user_id !== state.user?.id ? `<button class="icon-btn sm" aria-label="Действия">${icon('more', 16)}</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    <div class="mt-6" style="text-align:center">
      <button class="btn btn-ghost" id="btn-logout">${icon('logout', 16)} Выйти</button>
    </div>
  `;

  // Theme switcher
  const themes = ['dark', 'light', 'pink'];
  document.getElementById('profile-themes').innerHTML = themes.map(t => `
    <button class="theme-btn ${state.theme === t ? 'active' : ''}" data-theme="${t}" onclick="applyTheme('${t}')" title="${t === 'dark' ? 'Тёмная' : t === 'light' ? 'Светлая' : 'Розовая'}"></button>
  `).join('');

  // Telegram
  document.getElementById('btn-link-telegram')?.addEventListener('click', showTelegramModal);
  document.getElementById('btn-unlink-telegram')?.addEventListener('click', () => {
    state.telegramLinked = false;
    localStorage.removeItem('zunno-telegram-linked');
    renderView();
    showToast('Telegram отвязан', 'info');
  });

  // Invitations
  document.querySelectorAll('.btn-accept-inv').forEach(btn => {
    btn.addEventListener('click', () => {
      const inv = state.invitations.find(i => i.group_id === btn.dataset.id);
      state.invitations = state.invitations.filter(i => i.group_id !== btn.dataset.id);
      if (inv) state.groups.push({ id: inv.group_id, version: 1, name: inv.group_name, owner_id: '', created_at: new Date().toISOString() });
      updateInvitationBadge();
      renderView();
      showToast(`Вы присоединились к «${inv?.group_name}»`, 'success');
    });
  });
  document.querySelectorAll('.btn-decline-inv').forEach(btn => {
    btn.addEventListener('click', () => {
      state.invitations = state.invitations.filter(i => i.group_id !== btn.dataset.id);
      updateInvitationBadge();
      renderView();
      showToast('Приглашение отклонено', 'info');
    });
  });

  document.getElementById('btn-logout').addEventListener('click', logout);
}

// ═══════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════

function showTransactionModal() {
  showModal('Новая операция', `
    <div class="tabs" id="tx-type-tabs" style="margin-bottom:16px">
      <button class="tab active" data-type="expense">Расход</button>
      <button class="tab" data-type="income">Доход</button>
    </div>
    <div class="form-group">
      <label class="form-label">Сумма</label>
      <input type="number" class="form-input" id="tx-amount" placeholder="0" inputmode="decimal" style="font-size:20px;font-weight:700" />
    </div>
    <div class="form-group">
      <label class="form-label">Категория</label>
      <select class="form-select" id="tx-category">
        ${state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Описание</label>
      <input type="text" class="form-input" id="tx-description" placeholder="Необязательно" />
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
    <button class="btn btn-primary" id="btn-save-tx">Добавить</button>
  `);

  let txType = 'expense';
  document.querySelectorAll('#tx-type-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#tx-type-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      txType = tab.dataset.type;
    });
  });

  document.getElementById('btn-save-tx').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('tx-amount').value);
    if (!amount || amount <= 0) { showToast('Введите сумму', 'error'); return; }
    state.transactions.unshift({
      id: generateId(), version: 1, group_id: state.currentGroupId, user_id: state.user.id,
      category_id: document.getElementById('tx-category').value, amount, type: txType,
      date: new Date().toISOString(), description: document.getElementById('tx-description').value,
      created_at: new Date().toISOString(),
    });
    closeModal();
    renderView();
    showToast(`${txType === 'income' ? 'Доход' : 'Расход'} ${formatCurrency(amount)} добавлен`, 'success');
  });
}

function showSplitModal() {
  const activeMembers = state.members.filter(m => m.status === 'active' && m.user_id !== state.user?.id);
  showModal('Разделить счёт', `
    <div class="form-group">
      <label class="form-label">Сумма</label>
      <input type="number" class="form-input" id="split-amount" placeholder="0" inputmode="decimal" style="font-size:24px;font-weight:700;text-align:center" />
    </div>
    <div class="form-group">
      <label class="form-label">Категория</label>
      <select class="form-select" id="split-category">
        ${state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Описание</label>
      <input type="text" class="form-input" id="split-description" placeholder="Необязательно" />
    </div>
    <div id="split-calc" class="split-calc" style="display:none"></div>
    <div class="form-group">
      <label class="form-label">Участники</label>
      <div class="split-participants">
        ${activeMembers.map(m => `
          <label class="checkbox-wrapper" style="padding:8px 12px;background:var(--surface-2);border-radius:var(--radius-md);cursor:pointer">
            <input type="checkbox" class="split-member" value="${m.user_id}" style="display:none" />
            <div class="checkbox"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="avatar sm">${getInitials(m.full_name)}</div>
            <span style="font-size:14px;font-weight:500">${m.full_name}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
    <button class="btn btn-primary" id="btn-split">Разделить</button>
  `);

  const amountInput = document.getElementById('split-amount');
  const calcDiv = document.getElementById('split-calc');
  amountInput.addEventListener('input', () => {
    const amount = parseFloat(amountInput.value);
    const checked = document.querySelectorAll('.split-member:checked');
    const numPeople = checked.length + 1;
    if (amount > 0) {
      calcDiv.style.display = 'block';
      calcDiv.innerHTML = `${formatCurrency(amount)} / ${numPeople} = <strong>${formatCurrency(Math.round(amount / numPeople))}</strong> с каждого`;
    } else {
      calcDiv.style.display = 'none';
    }
  });

  document.querySelectorAll('.split-member').forEach(cb => {
    cb.addEventListener('change', () => {
      const checkbox = cb.nextElementSibling;
      checkbox.classList.toggle('checked', cb.checked);
      amountInput.dispatchEvent(new Event('input'));
    });
  });

  document.getElementById('btn-split').addEventListener('click', () => {
    const amount = parseFloat(amountInput.value);
    const checked = Array.from(document.querySelectorAll('.split-member:checked')).map(cb => cb.value);
    if (!amount || amount <= 0) { showToast('Введите сумму', 'error'); return; }
    if (checked.length === 0) { showToast('Выберите участников', 'error'); return; }
    const numPeople = checked.length + 1;
    const perPerson = Math.round(amount / numPeople);

    // Create transaction
    state.transactions.unshift({
      id: generateId(), version: 1, group_id: state.currentGroupId, user_id: state.user.id,
      category_id: document.getElementById('split-category').value, amount, type: 'expense',
      date: new Date().toISOString(), description: document.getElementById('split-description').value || 'Разделённый счёт',
      created_at: new Date().toISOString(),
    });

    // Create debts
    checked.forEach(memberId => {
      state.debts.outgoing.push({
        id: generateId(), group_id: state.currentGroupId, transaction_id: null,
        creditor_id: memberId, creditor_name: getMemberName(memberId),
        debtor_id: state.user.id, debtor_name: state.user.full_name,
        amount: perPerson, is_paid: false, created_at: new Date().toISOString(), paid_at: null,
      });
    });

    closeModal();
    renderView();
    showToast(`Счёт ${formatCurrency(amount)} разделён на ${numPeople}`, 'success');
  });
}

function showPlanModal() {
  showModal('Новый план', `
    <div class="form-group">
      <label class="form-label">Название</label>
      <input type="text" class="form-input" id="plan-title" placeholder="Например: Поход в кино" />
    </div>
    <div class="form-group">
      <label class="form-label">Описание</label>
      <textarea class="form-input" id="plan-description" placeholder="Детали события..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Дата и время</label>
      <input type="datetime-local" class="form-input" id="plan-date" />
    </div>
    <div class="form-group">
      <label class="form-label">Повторение</label>
      <select class="form-select" id="plan-recurrence">
        <option value="none">Разово</option>
        <option value="daily">Каждый день</option>
        <option value="weekly">Каждую неделю</option>
        <option value="monthly">Каждый месяц</option>
      </select>
    </div>
    <div class="form-group" id="plan-recurrence-until-group" style="display:none">
      <label class="form-label">Повторять до</label>
      <input type="date" class="form-input" id="plan-recurrence-until" />
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
    <button class="btn btn-primary" id="btn-save-plan">Создать</button>
  `);

  document.getElementById('plan-recurrence').addEventListener('change', (e) => {
    document.getElementById('plan-recurrence-until-group').style.display = e.target.value === 'none' ? 'none' : 'block';
  });

  document.getElementById('btn-save-plan').addEventListener('click', () => {
    const title = document.getElementById('plan-title').value;
    const date = document.getElementById('plan-date').value;
    if (!title) { showToast('Введите название', 'error'); return; }
    if (!date) { showToast('Укажите дату', 'error'); return; }
    const recurrence = document.getElementById('plan-recurrence').value;
    state.plans.unshift({
      id: generateId(), version: 1, group_id: state.currentGroupId, creator_id: state.user.id,
      title, description: document.getElementById('plan-description').value,
      event_date: new Date(date).toISOString(), is_done: false, created_at: new Date().toISOString(), done_at: null,
      recurrence_rule: recurrence === 'none' ? null : recurrence,
      recurrence_until: recurrence !== 'none' && document.getElementById('plan-recurrence-until').value ? new Date(document.getElementById('plan-recurrence-until').value).toISOString() : null,
      parent_plan_id: null,
    });
    closeModal();
    renderView();
    showToast(recurrence !== 'none' ? '⏳ Серия создаётся...' : 'План создан', 'success');
  });
}

function showCategoryModal() {
  showModal('Новая категория', `
    <div class="form-group">
      <label class="form-label">Название</label>
      <input type="text" class="form-input" id="cat-name" placeholder="Например: Продукты" />
    </div>
    <div class="form-group">
      <label class="form-label">Тип</label>
      <select class="form-select" id="cat-type">
        <option value="fixed">Фиксированная</option>
        <option value="spontaneous">Спонтанная</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Лимит (₽/мес)</label>
      <input type="number" class="form-input" id="cat-limit" placeholder="0" inputmode="decimal" />
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
    <button class="btn btn-primary" id="btn-save-cat">Создать</button>
  `);

  document.getElementById('btn-save-cat').addEventListener('click', () => {
    const name = document.getElementById('cat-name').value;
    if (!name) { showToast('Введите название', 'error'); return; }
    state.categories.push({
      id: generateId(), version: 1, group_id: state.currentGroupId, name,
      type: document.getElementById('cat-type').value,
      budget_limit: parseFloat(document.getElementById('cat-limit').value) || 0,
      created_at: new Date().toISOString(),
    });
    closeModal();
    renderView();
    showToast('Категория добавлена', 'success');
  });
}

function showGoalModal() {
  showModal('Новая категория целей', `
    <div class="form-group">
      <label class="form-label">Название</label>
      <input type="text" class="form-input" id="goal-name" placeholder="Например: Отпуск" />
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
    <button class="btn btn-primary" id="btn-save-goal">Создать</button>
  `);

  document.getElementById('btn-save-goal').addEventListener('click', () => {
    const name = document.getElementById('goal-name').value;
    if (!name) { showToast('Введите название', 'error'); return; }
    state.goalCategories.push({
      id: generateId(), version: 1, group_id: state.currentGroupId, name,
      due_date: null, notified_due_at: null,
    });
    closeModal();
    renderView();
    showToast('Категория целей создана', 'success');
  });
}

function showTelegramModal() {
  const code = 'A3K7P2';
  showModal('Привязка Telegram', `
    <div class="flex flex-col items-center gap-4 p-4">
      <div class="avatar xl" style="background:linear-gradient(135deg,#0088cc,#00aaff);width:64px;height:64px;font-size:22px">${icon('telegram', 28)}</div>
      <p class="text-sm text-center" style="color:var(--text-2)">Отправьте боту команду:</p>
      <div class="flex items-center gap-2 p-3 rounded" style="background:var(--surface-2);border:1px solid var(--border)">
        <code style="font-size:20px;font-weight:700;color:var(--primary)">/start ${code}</code>
        <button class="icon-btn sm" id="btn-copy-code" aria-label="Копировать">${icon('copy', 16)}</button>
      </div>
      <p class="text-xs text-center text-muted">Откройте @zunno_bot в Telegram и отправьте эту команду</p>
    </div>
  `, `<button class="btn btn-primary" id="btn-telegram-done">Готово</button>`);

  document.getElementById('btn-copy-code').addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(() => showToast('Код скопирован', 'success'));
  });
  document.getElementById('btn-telegram-done').addEventListener('click', () => {
    state.telegramLinked = true;
    localStorage.setItem('zunno-telegram-linked', 'true');
    closeModal();
    renderView();
    showToast('Telegram привязан!', 'success');
  });
}

function showInviteModal() {
  const groupName = state.groups.find(g => g.id === state.currentGroupId)?.name || '';
  showModal('Пригласить участника', `
    <div class="form-group">
      <label class="form-label">Номер телефона</label>
      <input type="tel" class="form-input" id="invite-phone" placeholder="+7 999 123 45 67" pattern="^\\+[0-9]{10,14}$" />
    </div>
    <p class="text-sm text-muted">Пользователь получит приглашение и сможет присоединиться к группе «${groupName}»</p>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
    <button class="btn btn-primary" id="btn-send-invite">Пригласить</button>
  `);

  document.getElementById('btn-send-invite').addEventListener('click', () => {
    const phone = document.getElementById('invite-phone').value;
    if (!phone || phone.length < 11) { showToast('Введите корректный номер телефона', 'error'); return; }
    closeModal();
    showToast(`Приглашение отправлено на ${phone}`, 'success');
  });
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

function init() {
  applyTheme(state.theme);
  initAuth();

  // Sidebar toggle
  document.getElementById('btn-menu').addEventListener('click', () => {
    state.sidebarOpen = !state.sidebarOpen;
    document.getElementById('sidebar').classList.toggle('open', state.sidebarOpen);
    document.getElementById('sidebar-overlay').classList.toggle('visible', state.sidebarOpen);
  });
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // Topbar buttons
  document.getElementById('btn-invitations').addEventListener('click', () => { state.view = 'profile'; renderView(); });
  document.getElementById('btn-invite').addEventListener('click', showInviteModal);
  document.getElementById('user-avatar').addEventListener('click', () => { state.view = 'profile'; renderView(); });
  document.getElementById('btn-create-group').addEventListener('click', () => {
    const name = prompt('Название новой группы:');
    if (name) {
      const group = { id: generateId(), version: 1, name, owner_id: state.user?.id || 'user-1', created_at: new Date().toISOString() };
      state.groups.push(group);
      state.currentGroupId = group.id;
      renderSidebar();
      updateTopbar();
      renderView();
      showToast('Группа создана', 'success');
    }
  });

  // Command palette (Ctrl+K)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const palette = document.getElementById('command-palette');
      palette.style.display = palette.style.display === 'none' ? 'flex' : 'none';
      palette.style.pointerEvents = palette.style.display === 'flex' ? 'auto' : 'none';
      if (palette.style.display === 'flex') document.getElementById('cmd-input').focus();
    }
    if (e.key === 'Escape') {
      document.getElementById('command-palette').style.display = 'none';
      document.getElementById('command-palette').style.pointerEvents = 'none';
      closeModal();
    }
  });

  document.getElementById('command-palette').addEventListener('click', (e) => {
    if (e.target === document.getElementById('command-palette')) {
      document.getElementById('command-palette').style.display = 'none';
      document.getElementById('command-palette').style.pointerEvents = 'none';
    }
  });

  // Command palette search
  document.getElementById('cmd-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const actions = [
      { label: 'Обзор', action: () => { state.view = 'dashboard'; renderView(); } },
      { label: 'Бюджет', action: () => { state.view = 'budget'; renderView(); } },
      { label: 'Планы', action: () => { state.view = 'plans'; renderView(); } },
      { label: 'Цели', action: () => { state.view = 'goals'; renderView(); } },
      { label: 'Долги', action: () => { state.view = 'debts'; renderView(); } },
      { label: 'Профиль', action: () => { state.view = 'profile'; renderView(); } },
      { label: 'Добавить трату', action: showTransactionModal },
      { label: 'Разделить счёт', action: showSplitModal },
      { label: 'Новый план', action: showPlanModal },
      { label: 'Экспорт CSV', action: exportCSV },
    ];
    const filtered = actions.filter(a => a.label.toLowerCase().includes(query));
    document.getElementById('cmd-results').innerHTML = filtered.map(a => `
      <button class="sidebar-item" data-cmd="${a.label}">${a.label}</button>
    `).join('');
    document.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = actions.find(a => a.label === btn.dataset.cmd);
        if (action) action.action();
        document.getElementById('command-palette').style.display = 'none';
        document.getElementById('command-palette').style.pointerEvents = 'none';
        document.getElementById('cmd-input').value = '';
      });
    });
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
