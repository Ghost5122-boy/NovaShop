/**
 * Génère data/accounts-public.json depuis data/store.json (sans email/mot de passe).
 * Usage: / npm run sync-catalog après avoir modifié le catalogue dans l'admin.
 */
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'data', 'store.json');
const outPath = path.join(__dirname, '..', 'data', 'accounts-public.json');

const store = JSON.parse(fs.readFileSync(storePath, 'utf8').replace(/^\uFEFF/, ''));
const publicAccounts = store.accounts.map(({ email, password, ...pub }) => pub);

fs.writeFileSync(outPath, JSON.stringify({ accounts: publicAccounts }, null, 2) + '\n', 'utf8');
console.log(`Catalogue public : ${publicAccounts.length} compte(s) → data/accounts-public.json`);
