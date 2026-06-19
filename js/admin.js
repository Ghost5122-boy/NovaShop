import {
  adminLogin, getAdminToken, setAdminToken,
  adminGetStore, adminSaveAccount, adminDeleteAccount, adminSaveSettings,
  exportStore, importStore
} from './api.js?v=8';
import { TIER_VALUES, tierValueClass } from './tiers.js?v=8';

let currentTiers = [];

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const accountsTable = document.getElementById('accounts-table');
const accountsEmpty = document.getElementById('accounts-empty');
const ordersTable = document.getElementById('orders-table');
const ordersEmpty = document.getElementById('orders-empty');
const accountModal = document.getElementById('account-modal');
let store = null;

function showAdmin() {
  loginView.classList.add('hidden');
  adminView.classList.remove('hidden');
  loadStore();
}

function showLogin() {
  setAdminToken(null);
  loginView.classList.remove('hidden');
  adminView.classList.add('hidden');
}

async function loadStore() {
  try {
    store = await adminGetStore();
    renderAccounts();
    renderOrders();
    fillSettings();
  } catch {
    showLogin();
  }
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderAccounts() {
  const list = store.accounts || [];
  accountsEmpty.classList.toggle('hidden', list.length > 0);
  accountsTable.innerHTML = list.map(acc => `
    <tr>
      <td><strong>${escapeHtml(acc.username)}</strong></td>
      <td class="cell-price">${Number(acc.price).toFixed(2)} €</td>
      <td class="cell-muted">${escapeHtml(acc.email || '—')}</td>
      <td>${acc.certified ? '✅' : '—'}</td>
      <td>${acc.sold
        ? '<span class="badge-sold">Vendu</span>'
        : '<span class="badge-available">Disponible</span>'}</td>
      <td class="action-btns">
        <button class="btn btn-sm btn-outline edit-btn" data-id="${acc.id}">Modifier</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${acc.id}">Suppr.</button>
      </td>
    </tr>
  `).join('');

  accountsTable.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  accountsTable.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

function renderOrders() {
  const paid = (store.orders || []).filter(o => o.paid).reverse();
  ordersEmpty.classList.toggle('hidden', paid.length > 0);
  ordersTable.innerHTML = paid.map(o => {
    const acc = store.accounts.find(a => a.id === o.accountId);
    const date = o.paidAt ? new Date(o.paidAt).toLocaleString('fr-FR') : '—';
    return `
      <tr>
        <td class="cell-muted">${date}</td>
        <td>${acc ? escapeHtml(acc.username) : '<span class="cell-muted">compte supprimé</span>'}</td>
        <td class="cell-price">${o.amount != null ? Number(o.amount).toFixed(2) + ' €' : '—'}</td>
        <td><span class="badge-available">Payé</span></td>
      </tr>`;
  }).join('');
}

function fillSettings() {
  const me = store.settings.paypalMe || store.settings.paypalEmail || 'NovaShop1733';
  document.getElementById('paypal-email').value = me;
  document.getElementById('paypal-client').value = store.settings.paypalClientId || '';
  document.getElementById('site-name').value = store.settings.siteName || 'Nova Shop';
  document.getElementById('admin-pass').value = store.settings.adminPassword || '';
  const preview = document.getElementById('paypal-preview');
  if (preview) preview.textContent = me;
}

function renderTierList() {
  const el = document.getElementById('tier-list');
  el.innerHTML = currentTiers.map((t, i) => `
    <span class="tier-chip">
      <span class="tier-badge ${tierValueClass(t.value)}">${escapeHtml(t.mode)} ${escapeHtml(t.value)}</span>
      <button type="button" class="tier-chip-remove" data-i="${i}" aria-label="Retirer">&times;</button>
    </span>
  `).join('') || '<span class="cell-muted">Aucun tier ajouté</span>';
  el.querySelectorAll('.tier-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTiers.splice(Number(btn.dataset.i), 1);
      renderTierList();
    });
  });
}

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Ajouter un compte';
  document.getElementById('account-form').reset();
  document.getElementById('acc-id').value = '';
  document.getElementById('acc-certified').checked = true;
  document.getElementById('acc-sold').checked = false;
  currentTiers = [];
  renderTierList();
  accountModal.classList.add('active');
}

function openEditModal(id) {
  const acc = store.accounts.find(a => a.id === id);
  if (!acc) return;
  document.getElementById('modal-title').textContent = 'Modifier le compte';
  document.getElementById('acc-id').value = acc.id;
  document.getElementById('acc-username').value = acc.username;
  document.getElementById('acc-price').value = acc.price;
  document.getElementById('acc-email').value = acc.email || '';
  document.getElementById('acc-password').value = acc.password || '';
  document.getElementById('acc-description').value = acc.description || '';
  document.getElementById('acc-certified').checked = !!acc.certified;
  document.getElementById('acc-sold').checked = !!acc.sold;
  currentTiers = Array.isArray(acc.tiers) ? acc.tiers.map(t => ({ ...t })) : [];
  renderTierList();
  accountModal.classList.add('active');
}

async function handleDelete(id) {
  if (!confirm('Supprimer ce compte ?')) return;
  await adminDeleteAccount(id);
  await loadStore();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Connexion...';
  try {
    await adminLogin(password);
    errorEl.style.display = 'none';
    showAdmin();
  } catch {
    errorEl.textContent = 'Mot de passe incorrect';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Connexion';
  }
});

document.getElementById('logout-btn').addEventListener('click', showLogin);
document.getElementById('add-account-btn').addEventListener('click', openAddModal);
document.getElementById('modal-close').addEventListener('click', () => accountModal.classList.remove('active'));
accountModal.addEventListener('click', (e) => {
  if (e.target === accountModal) accountModal.classList.remove('active');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') accountModal.classList.remove('active');
});

document.getElementById('account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('acc-id').value;
  const price = Math.max(0, parseFloat(document.getElementById('acc-price').value) || 0);
  const account = {
    id: id || undefined,
    username: document.getElementById('acc-username').value.trim(),
    price,
    email: document.getElementById('acc-email').value.trim(),
    password: document.getElementById('acc-password').value,
    description: document.getElementById('acc-description').value.trim(),
    certified: document.getElementById('acc-certified').checked,
    sold: document.getElementById('acc-sold').checked,
    tiers: currentTiers.map(t => ({ ...t }))
  };
  try {
    await adminSaveAccount(account);
    accountModal.classList.remove('active');
    await loadStore();
  } catch (err) {
    alert('Erreur : ' + (err.message || 'impossible de sauvegarder'));
  }
});

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = document.getElementById('admin-pass').value.trim();
  await adminSaveSettings({
    paypalEmail: document.getElementById('paypal-email').value.trim(),
    paypalMe: document.getElementById('paypal-email').value.trim(),
    paypalClientId: document.getElementById('paypal-client').value.trim(),
    siteName: document.getElementById('site-name').value.trim(),
    ...(pass ? { adminPassword: pass } : {})
  });
  alert('Réglages sauvegardés !');
  await loadStore();
});

document.getElementById('paypal-email').addEventListener('input', (e) => {
  document.getElementById('paypal-preview').textContent = e.target.value || 'NovaShop1733';
});

document.getElementById('export-btn').addEventListener('click', async () => {
  const data = await exportStore();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nova-shop-catalogue.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    importStore(JSON.parse(text));
    alert('Catalogue importé !');
    await loadStore();
  } catch (err) {
    alert('Erreur import : ' + err.message);
  }
  e.target.value = '';
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-accounts').classList.toggle('hidden', tab !== 'accounts');
    document.getElementById('tab-orders').classList.toggle('hidden', tab !== 'orders');
    document.getElementById('tab-settings').classList.toggle('hidden', tab !== 'settings');
  });
});

const tierValueSelect = document.getElementById('tier-value');
tierValueSelect.innerHTML = TIER_VALUES.map(v => `<option value="${v}">${v}</option>`).join('');

document.getElementById('tier-add-btn').addEventListener('click', () => {
  const mode = document.getElementById('tier-mode').value.trim();
  const value = document.getElementById('tier-value').value;
  if (!mode) { document.getElementById('tier-mode').focus(); return; }
  currentTiers.push({ mode, value });
  document.getElementById('tier-mode').value = '';
  renderTierList();
});

document.getElementById('tier-mode').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('tier-add-btn').click(); }
});

if (getAdminToken()) {
  showAdmin();
}
