const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const sessions = new Map();

function readStore() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

function publicAccount(acc) {
  const { email, password, ...pub } = acc;
  return pub;
}

// --- Public API ---

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
  res.json({
    username: acc.username,
    email: acc.email,
    password: acc.password
  });
});

// --- PayPal ---

app.post('/api/paypal/create-order', (req, res) => {
  const { accountId } = req.body;
  const store = readStore();
  const acc = store.accounts.find(a => a.id === accountId && !a.sold);
  if (!acc) return res.status(404).json({ error: 'Compte introuvable' });

  const token = generateToken();
  const order = {
    id: uuidv4(),
    accountId,
    token,
    paid: false,
    amount: acc.price,
    createdAt: new Date().toISOString()
  };
  store.orders.push(order);
  writeStore(store);

  const paypalEmail = store.settings.paypalEmail;
  let paypalLink = null;
  if (paypalEmail) {
    paypalLink = `https://www.paypal.com/paypalme/${encodeURIComponent(paypalEmail)}/${acc.price}EUR`;
  }

  res.json({
    orderId: order.id,
    token,
    amount: acc.price,
    paypalLink,
    approvalUrl: null
  });
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

// Manual payment confirmation endpoint (admin can also mark as paid)
app.post('/api/paypal/confirm', (req, res) => {
  const { token } = req.body;
  const store = readStore();
  const order = store.orders.find(o => o.token === token);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });

  order.paid = true;
  order.paidAt = new Date().toISOString();
  const acc = store.accounts.find(a => a.id === order.accountId);
  if (acc) acc.sold = true;
  writeStore(store);

  res.json({ success: true });
});

// --- Admin API ---

app.post('/api/admin/login', (req, res) => {
  const store = readStore();
  if (req.body.password !== store.settings.adminPassword) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  const token = generateToken();
  sessions.set(token, { loginAt: Date.now() });
  res.json({ token });
});

app.get('/api/admin/store', authMiddleware, (req, res) => {
  res.json(readStore());
});

app.post('/api/admin/accounts', authMiddleware, (req, res) => {
  const store = readStore();
  const account = {
    id: `acc-${uuidv4().slice(0, 8)}`,
    ...req.body,
    sold: false
  };
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

app.listen(PORT, () => {
  console.log(`Nova Shop running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/`);
});
