// Couche de données 100% navigateur (localStorage) — aucun serveur requis.
// L'admin, la boutique, le paiement et la livraison fonctionnent hors-ligne.

import { PAYPAL_ME } from './config.js';

const STORE_KEY = 'nova_store_v2';
const TOKEN_KEY = 'nova_admin_token';

const DEFAULT_STORE = {
  settings: {
    siteName: 'Nova Shop',
    paypalMe: PAYPAL_ME,
    adminPassword: 'NovaShop1986*',
    currency: 'EUR'
  },
  accounts: [
    {
      id: 'acc-demo-1',
      username: 'ItzRealMe',
      price: 49.99,
      certified: true,
      description: 'Compte PvP premium avec excellents tiers Crystal et SMP.',
      sold: false,
      email: 'itzrealme@example.com',
      password: 'ChangeMoi123!'
    },
    {
      id: 'acc-demo-2',
      username: 'Dream',
      price: 29.99,
      certified: true,
      description: 'Compte certifié avec skin personnalisé.',
      sold: false,
      email: 'dream@example.com',
      password: 'ChangeMoi456!'
    }
  ],
  orders: []
};

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
      if (!store.settings.adminPassword) store.settings.adminPassword = 'NovaShop1986*';
      if (!store.settings.paypalMe) store.settings.paypalMe = PAYPAL_ME;
      return store;
    }
  } catch {
    /* store corrompu → on repart du défaut */
  }
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

// ---- Session admin (locale) ----

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

export async function getAccounts() {
  const store = loadStore();
  return store.accounts.filter(a => !a.sold).map(publicAccount);
}

export async function getAccount(id) {
  const store = loadStore();
  const acc = store.accounts.find(a => a.id === id);
  if (!acc) throw new Error('Compte introuvable');
  return publicAccount(acc);
}

export async function getCredentials(id, orderToken) {
  const store = loadStore();
  const order = store.orders.find(o => o.token === orderToken && o.accountId === id);
  if (!order || !order.paid) throw new Error('Paiement non confirmé');
  const acc = store.accounts.find(a => a.id === id);
  if (!acc) throw new Error('Compte introuvable');
  return { username: acc.username, email: acc.email, password: acc.password };
}

// ---- Paiement (PayPal.me direct) ----

export async function createPayPalOrder(accountId) {
  const store = loadStore();
  const acc = store.accounts.find(a => a.id === accountId);
  if (!acc) throw new Error('Compte introuvable');

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

export async function confirmPayment(token) {
  const store = loadStore();
  let order = store.orders.find(o => o.token === token);
  if (!order) {
    order = { id: genToken(), token, paid: false, createdAt: new Date().toISOString() };
    store.orders.push(order);
  }
  order.paid = true;
  order.paidAt = new Date().toISOString();
  if (order.accountId) {
    const acc = store.accounts.find(a => a.id === order.accountId);
    if (acc) acc.sold = true;
  }
  saveStore(store);
  return { success: true, token: order.token };
}

export async function capturePayPalOrder(orderId, accountId) {
  const store = loadStore();
  const order = store.orders.find(o =>
    (o.id === orderId || o.token === orderId) && o.accountId === accountId
  );
  if (!order) throw new Error('Commande introuvable');
  order.paid = true;
  order.paidAt = new Date().toISOString();
  const acc = store.accounts.find(a => a.id === accountId);
  if (acc) acc.sold = true;
  saveStore(store);
  return { token: order.token, success: true };
}

// ---- Admin ----

export async function adminLogin(password) {
  const store = loadStore();
  if (password !== store.settings.adminPassword) {
    throw new Error('Mot de passe incorrect');
  }
  const token = genToken();
  setAdminToken(token);
  return { token };
}

export async function adminGetStore() {
  ensureAdmin();
  return loadStore();
}

export async function adminSaveAccount(account) {
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
  ensureAdmin();
  const store = loadStore();
  store.accounts = store.accounts.filter(a => a.id !== id);
  saveStore(store);
  return { success: true };
}

export async function adminSaveSettings(settings) {
  ensureAdmin();
  const store = loadStore();
  store.settings = { ...store.settings, ...settings };
  saveStore(store);
  return store.settings;
}

// ---- Export / Import (sauvegarde du catalogue) ----

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
