/**
 * API Vercel — publie le catalogue sur GitHub (GITHUB_PAT dans les variables Vercel).
 */
const https = require('https');

const GITHUB_OWNER = 'Ghost5122-boy';
const GITHUB_REPO = 'NovaShop';
const GITHUB_BRANCH = 'main';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NovaShop1733';

function publicAccount(acc) {
  const { email, password, ...pub } = acc;
  return pub;
}

function toBase64Utf8(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function githubRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'NexusMarket-Publish',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(raw ? JSON.parse(raw) : {});
        } else {
          let msg = `GitHub ${res.statusCode}`;
          try { msg = JSON.parse(raw).message || msg; } catch { /* ignore */ }
          reject(new Error(msg));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function putFile(token, filePath, content, message) {
  const apiPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
  let sha = null;
  try {
    const existing = await githubRequest('GET', apiPath, null, token);
    sha = existing.sha;
  } catch { /* nouveau fichier */ }

  const body = {
    message,
    content: toBase64Utf8(content),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;
  return githubRequest('PUT', apiPath, body, token);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return res.status(503).json({
      error: 'GITHUB_PAT manquant sur Vercel. Ajoute-le dans Vercel → Settings → Environment Variables.'
    });
  }

  const { password, store } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  if (!store || !Array.isArray(store.accounts)) {
    return res.status(400).json({ error: 'Catalogue invalide' });
  }

  try {
    const settings = { ...(store.settings || {}) };
    delete settings.githubToken;

    const storeJson = JSON.stringify({ settings, accounts: store.accounts, orders: store.orders || [] }, null, 2) + '\n';
    const publicJson = JSON.stringify({ accounts: store.accounts.map(publicAccount) }, null, 2) + '\n';

    await putFile(pat, 'data/store.json', storeJson, 'Catalogue Nexus Market (sync auto)');
    await putFile(pat, 'data/accounts-public.json', publicJson, 'Catalogue public Nexus Market (sync auto)');

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur publication' });
  }
};
