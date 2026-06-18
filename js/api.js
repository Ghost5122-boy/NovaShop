/**
 * API hybride : backend Render → catalogue statique GitHub Pages → localStorage (local).
 */

import {
  PAYPAL_ME,
  PAYPAL_CLIENT_ID,
  BACKEND_URL,
  dataUrl
} from './config.js?v=6';

const STORE_KEY = 'nova_store_v2';
const TOKEN_KEY = 'nova_admin_token';
const PAID_KEY = 'nova_paid_proof';

const DEFAULT_STORE = {
  settings: {
    siteName: 'Nova Shop',
    paypalMe: PAYPAL_ME,
    paypalClientId: PAYPAL_CLIENT_ID,
    adminPassword: 'NovaShop1986*',
    currency: 'EUR'
  },
  accounts: [],
  orders: []
};

let backendOk = null;
let staticCatalog = null;
let staticStore = null;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const store = JSON.parse(raw);
      if (!store.settings) store.settings = clone(DEFAULT_STORE.settings);
      if (!Array.isArray(store.accounts)) store.accounts = [];
      if (!Array.isArray(store.orders)) store.orders = [];
      if (!store.settings.paypalMe) store.settings.paypalMe = PAYPAL_ME;
      if (!store.settings.paypalClientId) store.settings.paypalClientId = PAYPAL_CLIENT_ID;
      return store;
    }
  } catch { /* store corrompu */ }
  const seed = clone(DEFAULT_STORE);
  saveStore(seed);
  return seed;
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function genId() {
  return 'acc-' + Math.random().toString(36).slice(2, 10);
}

function genToken() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'tok-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function publicAccount(acc) {
  const { email, password, ...pub } = acc;
  return pub;
}

function isGitHubPages() {
  return location.hostname.endsWith('github.io');
}

function isLocalServer() {
  return location.hostname === '127.0.0.1' || location.hostname === 'localhost';
}

function apiBase() {
  if (isLocalServer()) return '';
  if (!BACKEND_URL) return null;
  return BACKEND_URL.replace(/\/$/, '');
}

async function backendOnline() {
  const base = apiBase();
  if (!base && !isLocalServer()) return false;
  if (backendOk !== null) return backendOk;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${base || ''}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    backendOk = r.ok;
  } catch {
    backendOk = false;
  }
  return backendOk;
}

async function apiFetch(path, opts = {}) {
  const base = apiBase();
  if (base === null) throw new Error('API indisponible');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (getAdminToken()) headers.Authorization = `Bearer ${getAdminToken()}`;
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status}`);
  }
  return res.json();
}

async function fetchStaticCatalog() {
  if (staticCatalog) return staticCatalog;
  const res = await fetch(dataUrl('accounts-public.json'), { cache: 'no-store' });
  if (!res.ok) throw new Error('Catalogue indisponible');
  const data = await res.json();
  staticCatalog = data.accounts || [];
  return staticCatalog;
}

async function fetchStaticStore() {
  if (staticStore) return staticStore;
  const res = await fetch(dataUrl('store.json'), { cache: 'no-store' });
  if (!res.ok) throw new Error('Données boutique indisponibles');
  staticStore = await res.json();
  return staticStore;
}

function savePaidProof(accountId, token, paypalOrderId) {
  sessionStorage.setItem(`${PAID_KEY}_${accountId}`, JSON.stringify({
    token,
    paypalOrderId,
    at: Date.now()
  }));
}

function getPaidProof(accountId) {
  try {
    const raw = sessionStorage.getItem(`${PAID_KEY}_${accountId}`);
    if (!raw) return null;
    const proof = JSON.parse(raw);
    if (Date.now() - proof.at > 24 * 60 * 60 * 1000) return null;
    return proof;
  } catch {
    return null;
  }
}

// ---- Session admin ----

let adminToken = sessionStorage.getItem(TOKEN_KEY) || null;

export function setAdminToken(token) {
  adminToken = token;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken() {
  return adminToken;
}

function ensureAdmin() {
  if (!adminToken) throw new Error('Non autorisé');
}

// ---- Boutique (public) ----

export async function getPublicSettings() {
  if (await backendOnline()) {
    try {
      return await apiFetch('/api/settings/public');
    } catch { /* fallback */ }
  }
  const s = loadStore().settings;
  return {
    siteName: s.siteName || 'Nova Shop',
    paypalMe: s.paypalMe || PAYPAL_ME,
    paypalClientId: s.paypalClientId || PAYPAL_CLIENT_ID || ''
  };
}

export async function getAccounts() {
  if (await backendOnline()) {
    try {
      return await apiFetch('/api/accounts');
    } catch { /* fallback */ }
  }
  if (isGitHubPages()) {
    const accounts = await fetchStaticCatalog();
    return accounts.filter(a => !a.sold).map(publicAccount);
  }
  const store = loadStore();
  if (store.accounts.length) {
    return store.accounts.filter(a => !a.sold).map(publicAccount);
  }
  try {
    const accounts = await fetchStaticCatalog();
    return accounts.filter(a => !a.sold).map(publicAccount);
  } catch {
    return [];
  }
}

export async function getAccount(id) {
  if (await backendOnline()) {
    try {
      return await apiFetch(`/api/accounts/${encodeURIComponent(id)}`);
    } catch { /* fallback */ }
  }
  if (isGitHubPages()) {
    const accounts = await fetchStaticCatalog();
    const acc = accounts.find(a => a.id === id);
    if (!acc) throw new Error('Compte introuvable');
    return publicAccount(acc);
  }
  const store = loadStore();
  let acc = store.accounts.find(a => a.id === id);
  if (!acc) {
    const accounts = await fetchStaticCatalog();
    acc = accounts.find(a => a.id === id);
  }
  if (!acc) throw new Error('Compte introuvable');
  return publicAccount(acc);
}

export async function getCredentials(id, orderToken) {
  if (await backendOnline()) {
    return apiFetch(`/api/accounts/${encodeURIComponent(id)}/credentials?token=${encodeURIComponent(orderToken)}`);
  }

  // La preuve n'est créée qu'après une capture PayPal réussie (status COMPLETED).
  const proof = getPaidProof(id);
  const localOrder = loadStore().orders.find(o => o.token === orderToken && o.accountId === id && o.paid);
  const paid = (proof && proof.token === orderToken) || !!localOrder;
  if (!paid) throw new Error('Paiement non confirmé');

  // Identifiants : d'abord le store local, sinon le catalogue déployé (store.json).
  let acc = loadStore().accounts.find(a => a.id === id && a.email);
  if (!acc) {
    try {
      const remote = await fetchStaticStore();
      acc = remote.accounts?.find(a => a.id === id);
    } catch { /* ignore */ }
  }
  if (!acc?.email) throw new Error('Identifiants indisponibles. Contacte le vendeur.');
  return { username: acc.username, email: acc.email, password: acc.password };
}

// ---- Paiement PayPal ----

export async function createPayPalOrder(accountId) {
  if (await backendOnline()) {
    try {
      return await apiFetch('/api/paypal/create-order', {
        method: 'POST',
        body: JSON.stringify({ accountId })
      });
    } catch { /* fallback */ }
  }

  const store = loadStore();
  let acc = store.accounts.find(a => a.id === accountId);
  if (!acc) {
    const catalog = await fetchStaticCatalog().catch(() => []);
    acc = catalog.find(a => a.id === accountId);
    if (acc) store.accounts.push({ ...acc, email: '', password: '' });
  }
  if (!acc) throw new Error('Compte introuvable');
  if (acc.sold) throw new Error('Ce compte est déjà vendu');

  const token = genToken();
  store.orders.push({
    id: genToken(),
    accountId,
    token,
    paid: false,
    amount: acc.price,
    createdAt: new Date().toISOString()
  });
  saveStore(store);

  const me = store.settings.paypalMe || PAYPAL_ME;
  return {
    orderId: store.orders.at(-1).id,
    token,
    amount: acc.price,
    paypalLink: `https://paypal.me/${me}/${acc.price.toFixed(2)}`,
    approvalUrl: null
  };
}

export async function confirmPayment(token, accountId, paypalOrderId) {
  if (await backendOnline()) {
    try {
      const result = await apiFetch('/api/paypal/confirm', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      if (accountId && paypalOrderId) savePaidProof(accountId, token, paypalOrderId);
      return result;
    } catch { /* fallback */ }
  }

  const store = loadStore();
  const order = store.orders.find(o => o.token === token);
  if (!order) throw new Error('Commande introuvable');
  order.paid = true;
  order.paidAt = new Date().toISOString();
  if (order.accountId) {
    const acc = store.accounts.find(a => a.id === order.accountId);
    if (acc) acc.sold = true;
    if (accountId && paypalOrderId) savePaidProof(accountId, token, paypalOrderId);
  }
  saveStore(store);
  return { success: true, token: order.token };
}

export async function capturePayPalOrder(orderId, accountId) {
  if (await backendOnline()) {
    return apiFetch('/api/paypal/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId, accountId })
    });
  }
  return confirmPayment(orderId, accountId);
}

// ---- Admin ----

export async function adminLogin(password) {
  if (await backendOnline()) {
    try {
      const { token } = await apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      setAdminToken(token);
      return { token };
    } catch (e) {
      if (!e.message.includes('fetch')) throw e;
    }
  }
  const store = loadStore();
  if (password !== store.settings.adminPassword) {
    throw new Error('Mot de passe incorrect');
  }
  const token = genToken();
  setAdminToken(token);
  return { token };
}

export async function adminGetStore() {
  if (await backendOnline()) {
    try {
      return await apiFetch('/api/admin/store');
    } catch { /* fallback */ }
  }
  ensureAdmin();
  const local = loadStore();
  if (local.accounts.length) return local;
  try {
    return await fetchStaticStore();
  } catch {
    return local;
  }
}

export async function adminSaveAccount(account) {
  if (await backendOnline()) {
    try {
      const method = account.id ? 'PUT' : 'POST';
      return await apiFetch('/api/admin/accounts', {
        method,
        body: JSON.stringify(account)
      });
    } catch { /* fallback */ }
  }
  ensureAdmin();
  const store = loadStore();
  if (account.id) {
    const idx = store.accounts.findIndex(a => a.id === account.id);
    if (idx === -1) throw new Error('Compte introuvable');
    store.accounts[idx] = { ...store.accounts[idx], ...account };
    saveStore(store);
    return store.accounts[idx];
  }
  const newAcc = { ...account, id: genId(), sold: account.sold ?? false };
  store.accounts.push(newAcc);
  saveStore(store);
  return newAcc;
}

export async function adminDeleteAccount(id) {
  if (await backendOnline()) {
    try {
      return await apiFetch(`/api/admin/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch { /* fallback */ }
  }
  ensureAdmin();
  const store = loadStore();
  store.accounts = store.accounts.filter(a => a.id !== id);
  saveStore(store);
  return { success: true };
}

export async function adminSaveSettings(settings) {
  if (await backendOnline()) {
    try {
      return await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
    } catch { /* fallback */ }
  }
  ensureAdmin();
  const store = loadStore();
  store.settings = { ...store.settings, ...settings };
  saveStore(store);
  return store.settings;
}

export function exportStore() {
  return loadStore();
}

export function importStore(data) {
  if (!data || !Array.isArray(data.accounts)) throw new Error('Fichier invalide');
  const store = loadStore();
  const merged = {
    settings: { ...store.settings, ...(data.settings || {}) },
    accounts: data.accounts,
    orders: store.orders
  };
  saveStore(merged);
  return merged;
}
