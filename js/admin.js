import {
  adminLogin, getAdminToken, setAdminToken,
  adminGetStore, adminSaveAccount, adminDeleteAccount, adminSaveSettings
} from './api.js';

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const accountsTable = document.getElementById('accounts-table');
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
    fillSettings();
  } catch {
    showLogin();
  }
}

function renderAccounts() {
  accountsTable.innerHTML = store.accounts.map(acc => `
    <tr>
      <td><strong>${acc.username}</strong></td>
      <td style="color:var(--accent);font-weight:700">${acc.price.toFixed(2)} €</td>
      <td>${acc.certified ? '✅' : '—'}</td>
      <td>${acc.sold ? '<span style="color:#ff4757">Vendu</span>' : '<span style="color:var(--accent)">Disponible</span>'}</td>
      <td class="action-btns">
        <button class="btn btn-sm btn-outline edit-btn" data-id="${acc.id}">Modifier</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${acc.id}">Supprimer</button>
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

function fillSettings() {
  const me = store.settings.paypalMe || store.settings.paypalEmail || 'NovaShop1733';
  document.getElementById('paypal-email').value = me;
  document.getElementById('site-name').value = store.settings.siteName || 'Nova Shop';
  const preview = document.getElementById('paypal-preview');
  if (preview) preview.textContent = me;
}

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Ajouter un compte';
  document.getElementById('account-form').reset();
  document.getElementById('acc-id').value = '';
  document.getElementById('acc-certified').checked = true;
  accountModal.classList.add('active');
}

function openEditModal(id) {
  const acc = store.accounts.find(a => a.id === id);
  if (!acc) return;
  document.getElementById('modal-title').textContent = 'Modifier le compte';
  document.getElementById('acc-id').value = acc.id;
  document.getElementById('acc-username').value = acc.username;
  document.getElementById('acc-price').value = acc.price;
  document.getElementById('acc-email').value = acc.email;
  document.getElementById('acc-password').value = acc.password;
  document.getElementById('acc-description').value = acc.description || '';
  document.getElementById('acc-certified').checked = acc.certified;
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
    errorEl.textContent = 'Mot de passe incorrect ou serveur en démarrage — attends 30 sec et réessaie';
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

document.getElementById('account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('acc-id').value;
  const account = {
    id: id || undefined,
    username: document.getElementById('acc-username').value.trim(),
    price: parseFloat(document.getElementById('acc-price').value),
    email: document.getElementById('acc-email').value.trim(),
    password: document.getElementById('acc-password').value,
    description: document.getElementById('acc-description').value.trim(),
    certified: document.getElementById('acc-certified').checked,
    sold: false
  };
  await adminSaveAccount(account);
  accountModal.classList.remove('active');
  await loadStore();
});

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await adminSaveSettings({
    paypalEmail: document.getElementById('paypal-email').value.trim(),
    paypalMe: document.getElementById('paypal-email').value.trim(),
    siteName: document.getElementById('site-name').value.trim()
  });
  alert('Paramètres sauvegardés !');
  await loadStore();
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-accounts').classList.toggle('hidden', btn.dataset.tab !== 'accounts');
    document.getElementById('tab-settings').classList.toggle('hidden', btn.dataset.tab !== 'settings');
  });
});

if (getAdminToken()) {
  showAdmin();
}
