import { SITE_NAME } from './config.js?v=18';

export function normalizeSiteName(name) {
  const n = String(name || SITE_NAME).trim();
  if (!n || /nova\s*shop/i.test(n)) return SITE_NAME;
  return n;
}

function logoInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function applySiteBranding(siteName, { admin = false } = {}) {
  const name = normalizeSiteName(siteName);
  const initials = logoInitials(name);
  const displayName = admin ? `${name} Admin` : name;

  document.querySelectorAll('.logo').forEach(logo => {
    const icon = logo.querySelector('.logo-icon');
    if (icon) icon.textContent = initials;
    const textNodes = [...logo.childNodes].filter(
      n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
    );
    if (textNodes.length) {
      textNodes.forEach(n => { n.textContent = ` ${displayName}`; });
    } else {
      logo.append(document.createTextNode(` ${displayName}`));
    }
    if (logo.textContent.includes('Nova Shop')) {
      logo.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) n.textContent = ` ${displayName}`;
      });
    }
  });

  const loginTitle = document.querySelector('#login-view h1');
  if (loginTitle) loginTitle.textContent = `Admin ${name}`;

  document.querySelectorAll('footer p, .footer p').forEach(el => {
    if (el.innerHTML.includes('Nova Shop')) {
      el.innerHTML = el.innerHTML.replace(/Nova Shop/g, name);
    }
  });

  if (document.title.includes('Nova Shop')) {
    document.title = document.title.replace(/Nova Shop/g, name);
  }
}
