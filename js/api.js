const API_BASE = '/api';

let adminToken = sessionStorage.getItem('nova_admin_token') || null;

export function setAdminToken(token) {
  adminToken = token;
  if (token) sessionStorage.setItem('nova_admin_token', token);
  else sessionStorage.removeItem('nova_admin_token');
}

export function getAdminToken() {
  return adminToken;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  } catch (err) {
    if (path.startsWith('/accounts') && options.method !== 'POST') {
      return fallbackRequest(path);
    }
    throw err;
  }
}

async function fallbackRequest(path) {
  const base = import.meta.url.includes('/admin/') ? '../' : './';
  const res = await fetch(`${base}data/accounts-public.json`);
  const store = await res.json();
  if (path === '/accounts') {
    return store.accounts.filter(a => !a.sold);
  }
  const match = path.match(/\/accounts\/([^/]+)/);
  if (match) {
    const acc = store.accounts.find(a => a.id === match[1]);
    if (!acc) throw new Error('Compte introuvable');
    return acc;
  }
  return store;
}

export async function getAccounts() {
  return request('/accounts');
}

export async function getAccount(id) {
  return request(`/accounts/${id}`);
}

export async function getCredentials(id, orderToken) {
  return request(`/accounts/${id}/credentials?token=${orderToken}`);
}

export async function adminLogin(password) {
  const data = await request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
  setAdminToken(data.token);
  return data;
}

export async function adminGetStore() {
  return request('/admin/store');
}

export async function adminSaveAccount(account) {
  return request('/admin/accounts', {
    method: account.id ? 'PUT' : 'POST',
    body: JSON.stringify(account)
  });
}

export async function adminDeleteAccount(id) {
  return request(`/admin/accounts/${id}`, { method: 'DELETE' });
}

export async function adminSaveSettings(settings) {
  return request('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}

export async function createPayPalOrder(accountId) {
  return request('/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({ accountId })
  });
}

export async function confirmPayment(token) {
  return request('/paypal/confirm', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

export async function capturePayPalOrder(orderId, accountId) {
  return request('/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({ orderId, accountId })
  });
}
