import { getCredentials } from './api.js?v=16';

const params = new URLSearchParams(window.location.search);
const accountId = params.get('accountId') || params.get('id');
const token = params.get('token');

const loading = document.getElementById('loading');
const content = document.getElementById('delivery-content');
const errorState = document.getElementById('error-state');

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => alert('Copié !'));
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function renderCredentials(data) {
  content.innerHTML = `
    <div class="delivery-success-icon" style="font-size:2.5rem;color:var(--blue-600);font-weight:800">OK</div>
    <h1>Paiement confirmé</h1>
    <p style="color:var(--text-muted);margin-bottom:1rem">
      Voici les identifiants de votre compte <strong>${esc(data.username)}</strong>
    </p>
    <div class="credential-box">
      <div class="credential-row">
        <div>
          <div class="credential-label">Pseudo Minecraft</div>
          <div class="credential-value">${esc(data.username)}</div>
        </div>
        <button type="button" class="copy-btn" data-copy="${esc(data.username)}">📋</button>
      </div>
      <div class="credential-row">
        <div>
          <div class="credential-label">Email du compte</div>
          <div class="credential-value">${esc(data.email)}</div>
        </div>
        <button type="button" class="copy-btn" data-copy="${esc(data.email)}">📋</button>
      </div>
      <div class="credential-row">
        <div>
          <div class="credential-label">Mot de passe</div>
          <div class="credential-value">${esc(data.password)}</div>
        </div>
        <button type="button" class="copy-btn" data-copy="${esc(data.password)}">📋</button>
      </div>
    </div>
    <p style="font-size:0.85rem;color:var(--text-muted)">
      Conservez ces informations en lieu sûr. Changez le mot de passe après connexion.
    </p>
    <a href="shop.html" class="btn btn-outline" style="margin-top:1.5rem">Retour à la boutique</a>
  `;

  content.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.copy));
  });
}

async function init() {
  if (!accountId || !token) {
    showError('Lien de livraison invalide. Effectuez d\'abord le paiement PayPal.');
    return;
  }

  try {
    const credentials = await getCredentials(accountId, token);
    loading.classList.add('hidden');
    content.classList.remove('hidden');
    renderCredentials(credentials);
  } catch (err) {
    showError(err.message || 'Impossible de récupérer les identifiants.');
  }
}

function showError(msg) {
  loading.classList.add('hidden');
  errorState.classList.remove('hidden');
  const el = document.getElementById('error-message');
  if (el) el.textContent = msg;
}

init();
