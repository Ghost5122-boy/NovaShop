/**
 * Injecte secrets.PUBLISH_TOKEN dans js/config.js au build GitHub Pages.
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'js', 'config.js');
const token = process.env.PUBLISH_TOKEN || '';
let src = fs.readFileSync(configPath, 'utf8');

src = src.replace(
  /export const GITHUB_PUBLISH_TOKEN = '[^']*';/,
  `export const GITHUB_PUBLISH_TOKEN = '${token.replace(/'/g, '')}';`
);

fs.writeFileSync(configPath, src, 'utf8');
console.log(token ? 'Token publish injecté dans config.js' : 'Pas de PUBLISH_TOKEN — sync via OAuth device flow');
