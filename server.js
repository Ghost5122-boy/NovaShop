const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4782;
const IS_CLOUD = !!(process.env.RENDER || process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
const SEED_FILE = path.join(__dirname, 'data', 'store.json');
const DATA_FILE = IS_CLOUD
  ? path.join('/tmp', 'nova-shop-store.json')
  : SEED_FILE;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => res.json({ ok: true }));

const PAYPAL_ME_DEFAULT = 'NexusMarket1733';
const PAYPAL_CLIENT_ID_DEFAULT =
  'AZiTIxB8vNgL9pxrwrs9FaeURfrhE5FJGKCscmu2ZniZDGaC6-NjsrlDTl2ySu0TTxxYU37OZqJqZdQW';

app.get('/api/settings/public', (req, res) => {
  const store = readStore();
  const s = store.settings;
  res.json({
    siteName: s.siteName || 'Nexus Market',
    paypalMe: s.paypalMe || s.paypalEmail || PAYPAL_ME_DEFAULT,
    paypalClientId: s.paypalClientId || process.env.PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID_DEFAULT
  });
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(SEED_FILE, DATA_FILE);
  }
}

function readStore() {
  ensureDataFile();
  let raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
  const store = JSON.parse(raw);
  if (!store.sessions) store.sessions = {};
  if (!store.orders) store.orders = [];
  return store;
}

function writeStore(store) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const store = readStore();
  if (!token || !store.sessions[token]) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

function publicAccount(acc) {
  const { email, password, ...pub } = acc;
  return pub;
}

app.get('/api/accounts', (req, res) => {
  const store = readStore();
  res.json(store.accounts.filter(a => !a.sold).map(publicAccount));
});

app.get('/api/accounts/:id', (req, res) => {
  const store = readStore();
  const acc = store.accounts.find(a => a.id === req.params.id && !a.sold);
  if (!acc) return res.status(404).json({ error: 'Compte introuvable' });
  res.json(publicAccount(acc));
});

app.get('/api/accounts/:id/credentials', (req, res) => {
  const { token } = req.query;
  const store = readStore();
  const order = store.orders.find(o => o.token === token && o.accountId === req.params.id);
  if (!order || !order.paid) {
    return res.status(403).json({ error: 'Paiement non confirmé' });
  }
  const acc = store.accounts.find(a => a.id === req.params.id);
  if (!acc) return res.status(404).json({ error: 'Compte introuvable' });
  res.json({ username: acc.username, email: acc.email, password: acc.password });
});

app.post('/api/paypal/create-order', (req, res) => {
  const { accountId } = req.body;
  const store = readStore();
  const acc = store.accounts.find(a => a.id === accountId && !a.sold);
  if (!acc) return res.status(404).json({ error: 'Compte introuvable' });

  const token = generateToken();
  store.orders.push({
    id: uuidv4(),
    accountId,
    token,
    paid: false,
    amount: acc.price,
    createdAt: new Date().toISOString()
  });
  writeStore(store);

  let paypalLink = null;
  const paypalMe = store.settings.paypalMe || store.settings.paypalEmail;
  if (paypalMe) {
    paypalLink = `https://paypal.me/${encodeURIComponent(paypalMe)}/${acc.price.toFixed(2)}`;
  }

  res.json({ orderId: store.orders.at(-1).id, token, amount: acc.price, paypalLink, approvalUrl: null });
});

app.post('/api/paypal/capture-order', (req, res) => {
  const { orderId, accountId } = req.body;
  const store = readStore();
  const order = store.orders.find(o =>
    (o.id === orderId || o.token === orderId) && o.accountId === accountId
  );
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  order.paid = true;
  order.paidAt = new Date().toISOString();
  const acc = store.accounts.find(a => a.id === accountId);
  if (acc) acc.sold = true;
  writeStore(store);
  res.json({ token: order.token, success: true });
});

app.post('/api/paypal/confirm', (req, res) => {
  const store = readStore();
  const order = store.orders.find(o => o.token === req.body.token);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  order.paid = true;
  order.paidAt = new Date().toISOString();
  const acc = store.accounts.find(a => a.id === order.accountId);
  if (acc) acc.sold = true;
  writeStore(store);
  res.json({ success: true, token: order.token });
});

app.post('/api/admin/login', (req, res) => {
  const store = readStore();
  const adminPass = process.env.ADMIN_PASSWORD || store.settings.adminPassword;
  if (req.body.password !== adminPass) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  const token = generateToken();
  store.sessions[token] = { loginAt: Date.now() };
  writeStore(store);
  res.json({ token });
});

app.get('/api/admin/store', authMiddleware, (req, res) => {
  res.json(readStore());
});

app.post('/api/admin/accounts', authMiddleware, (req, res) => {
  const store = readStore();
  const account = { id: `acc-${uuidv4().slice(0, 8)}`, ...req.body, sold: false };
  store.accounts.push(account);
  writeStore(store);
  res.json(account);
});

app.put('/api/admin/accounts', authMiddleware, (req, res) => {
  const store = readStore();
  const idx = store.accounts.findIndex(a => a.id === req.body.id);
  if (idx === -1) return res.status(404).json({ error: 'Compte introuvable' });
  store.accounts[idx] = { ...store.accounts[idx], ...req.body };
  writeStore(store);
  res.json(store.accounts[idx]);
});

app.delete('/api/admin/accounts/:id', authMiddleware, (req, res) => {
  const store = readStore();
  store.accounts = store.accounts.filter(a => a.id !== req.params.id);
  writeStore(store);
  res.json({ success: true });
});

app.put('/api/admin/settings', authMiddleware, (req, res) => {
  const store = readStore();
  store.settings = { ...store.settings, ...req.body };
  writeStore(store);
  res.json(store.settings);
});

if (process.env.VERCEL) {
  module.exports = app;
} else {
  const HOST = IS_CLOUD ? '0.0.0.0' : '127.0.0.1';
  app.listen(PORT, HOST, () => {
    console.log(`Nexus Market actif sur le port ${PORT}`);
  });
}
