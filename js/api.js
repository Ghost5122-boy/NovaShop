/**
 * API hybride : backend Render → catalogue statique GitHub Pages → localStorage (local).
 */

import {
  PAYPAL_ME,
  PAYPAL_CLIENT_ID,
  BACKEND_URL,
  dataUrl,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH
} from './config.js?v=11';

const STORE_KEY = 'nova_store_v2';
const TOKEN_KEY = 'nova_admin_token';
const PAID_KEY = 'nova_paid_proof';

const DEFAULT_STORE = {
  settings: {
    siteName: 'Nexus Market',
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
      if (store.settings.siteName === 'Nova Shop') {
        store.settings.siteName = 'Nexus Market';
        localStorage.setItem(STORE_KEY, JSON.stringify(store));
      }
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

async function fetchStaticCatalog(bust = false) {
  if (staticCatalog && !bust) return staticCatalog;
  const q = bust ? `?t=${Date.now()}` : '';
  const res = await fetch(dataUrl('accounts-public.json') + q, { cache: 'no-store' });
  if (!res.ok) throw new Error('Catalogue indisponible');
  const data = await res.json();
  staticCatalog = data.accounts || [];
  return staticCatalog;
}

async function fetchStaticStore(bust = false) {
  if (staticStore && !bust) return staticStore;
  const q = bust ? `?t=${Date.now()}` : '';
  const res = await fetch(dataUrl('store.json') + q, { cache: 'no-store' });
  if (!res.ok) throw new Error('Données boutique indisponibles');
  staticStore = await res.json();
  return staticStore;
}

/** Comptes déployés sur GitHub Pages (visible par tous les visiteurs). */
async function getDeployedAccounts(includeSold = true) {
  invalidateStaticCache();
  let list = [];
  try {
    const s = await fetchStaticStore(true);
    list = s.accounts || [];
  } catch {
    list = await fetchStaticCatalog(true);
  }
  if (!includeSold) list = list.filter(a => !a.sold);
  return list;
}

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function githubPutFile(token, path, content, message) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };

  let sha = null;
  const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, { headers });
  if (getRes.ok) sha = (await getRes.json()).sha;

  const body = {
    message,
    content: toBase64Utf8(content),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur GitHub (${res.status})`);
  }
  return res.json();
}

/** Publie le catalogue sur GitHub → visible par tous après ~2 min. */
export async function publishCatalog() {
  ensureAdmin();
  const local = loadStore();
  const token = local.settings.githubToken?.trim();
  if (!token) {
    throw new Error('Ajoute un token GitHub dans Réglages (section « Publier pour tous »).');
  }

  const accounts = await getMergedAccounts(true);
  const settings = { ...local.settings };
  delete settings.githubToken;

  const storeJson = JSON.stringify({ settings, accounts, orders: [] }, null, 2) + '\n';
  const publicJson = JSON.stringify({ accounts: accounts.map(publicAccount) }, null, 2) + '\n';

  await githubPutFile(token, 'data/store.json', storeJson, 'Mise à jour catalogue Nexus Market');
  await githubPutFile(token, 'data/accounts-public.json', publicJson, 'Mise à jour catalogue public Nexus Market');
  invalidateStaticCache();
  return { success: true };
}

function invalidateStaticCache() {
  staticCatalog = null;
  staticStore = null;
}

/** Fusionne le catalogue déployé + les modifications admin (localStorage). */
async function getMergedAccounts(includeSold = true) {
  const local = loadStore();
  let staticFull = [];
  let staticPublic = [];

  try {
    const s = await fetchStaticStore();
    staticFull = s.accounts || [];
  } catch {
    try {
      staticPublic = await fetchStaticCatalog();
      staticFull = staticPublic;
    } catch { /* ignore */ }
  }

  if (!staticFull.length && staticPublic.length) staticFull = staticPublic;

  const byId = new Map();
  for (const a of staticFull) byId.set(a.id, clone(a));
  for (const a of local.accounts) {
    const prev = byId.get(a.id) || {};
    byId.set(a.id, { ...prev, ...a });
  }

  let list = [...byId.values()];
  if (!includeSold) list = list.filter(a => !a.sold);
  return list;
}

async function findFullAccount(id) {
  const acc = (await getMergedAccounts(true)).find(a => a.id === id);
  if (!acc) throw new Error('Compte introuvable');
  return acc;
}

function persistAccountsToLocal(accounts) {
  const store = loadStore();
  store.accounts = accounts;
  saveStore(store);
  invalidateStaticCache();
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
    siteName: s.siteName || 'Nexus Market',
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
    return (await getDeployedAccounts(false)).map(publicAccount);
  }
  const accounts = await getMergedAccounts(false);
  return accounts.map(publicAccount);
}

export async function getAccount(id) {
  if (await backendOnline()) {
    try {
      return await apiFetch(`/api/accounts/${encodeURIComponent(id)}`);
    } catch { /* fallback */ }
  }
  if (isGitHubPages()) {
    const acc = (await getDeployedAccounts(true)).find(a => a.id === id);
    if (!acc) throw new Error('Compte introuvable');
    return publicAccount(acc);
  }
  const acc = await findFullAccount(id);
  return publicAccount(acc);
}

export async function getCredentials(id, orderToken) {
  if (await backendOnline()) {
    return apiFetch(`/api/accounts/${encodeURIComponent(id)}/credentials?token=${encodeURIComponent(orderToken)}`);
  }

  const proof = getPaidProof(id);
  const localOrder = loadStore().orders.find(o => o.token === orderToken && o.accountId === id && o.paid);
  const paid = (proof && proof.token === orderToken) || !!localOrder;
  if (!paid) throw new Error('Paiement non confirmé');

  const acc = isGitHubPages()
    ? (await getDeployedAccounts(true)).find(a => a.id === id)
    : await findFullAccount(id);
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

  const acc = await findFullAccount(accountId);
  if (acc.sold) throw new Error('Ce compte est déjà vendu');

  const store = loadStore();
  const idx = store.accounts.findIndex(a => a.id === accountId);
  if (idx >= 0) store.accounts[idx] = { ...store.accounts[idx], ...acc };
  else store.accounts.push({ ...acc });

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
    if (accountId) savePaidProof(accountId, token, paypalOrderId || 'FREE');
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
  const accounts = await getMergedAccounts(true);
  return {
    settings: local.settings,
    accounts,
    orders: local.orders || []
  };
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
  const merged = await getMergedAccounts(true);

  if (account.id) {
    const idx = merged.findIndex(a => a.id === account.id);
    if (idx >= 0) merged[idx] = { ...merged[idx], ...account };
    else merged.push({ ...account });
    persistAccountsToLocal(merged);
    return merged.find(a => a.id === account.id);
  }

  const newAcc = { ...account, id: genId(), sold: account.sold ?? false };
  merged.push(newAcc);
  persistAccountsToLocal(merged);
  return newAcc;
}

export async function adminDeleteAccount(id) {
  if (await backendOnline()) {
    try {
      return await apiFetch(`/api/admin/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch { /* fallback */ }
  }
  ensureAdmin();
  const merged = (await getMergedAccounts(true)).filter(a => a.id !== id);
  persistAccountsToLocal(merged);
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

export async function exportStore() {
  const local = loadStore();
  const accounts = await getMergedAccounts(true);
  return { settings: local.settings, accounts, orders: local.orders || [] };
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
  invalidateStaticCache();
  return merged;
}
