const GAMEMODE_LABELS = {
  smp: 'SMP',
  crystal: 'Crystal',
  sword: 'Sword',
  uhc: 'UHC',
  axe: 'Axe',
  pot: 'Pot',
  neth_pot: 'Neth Pot',
  mace: 'Mace',
  cart: 'Cart',
  diamondPot: 'Dia Pot',
  diamondSmp: 'Dia SMP',
  netheritePot: 'Neth Pot',
  vanilla: 'Vanilla',
  bed: 'Bed',
  spear: 'Spear'
};

const tiersCache = new Map();
const CACHE_TTL = 30000;

export function formatTier(tier, pos) {
  if (tier == null) return '—';
  const prefix = pos === 0 ? 'HT' : 'LT';
  return `${prefix}${tier}`;
}

export function getTierClass(tier, pos) {
  const classes = [pos === 0 ? 'ht' : 'lt', `t${tier}`];
  return classes.join(' ');
}

export async function fetchPlayerTiers(username) {
  const key = username.toLowerCase();
  const cached = tiersCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const target = `https://pvptiers.com/api/search_profile/${encodeURIComponent(key)}`;
  // L'API PvPTiers n'autorise pas le CORS : on passe par un proxy pour
  // pouvoir l'appeler depuis le navigateur (GitHub Pages).
  const endpoints = [
    `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    target
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || (!data.rankings && !data.name)) continue;
      const result = parseTiersData(data);
      tiersCache.set(key, { data: result, time: Date.now() });
      return result;
    } catch {
      /* on essaie le proxy suivant */
    }
  }

  return { username, overall: null, points: 0, region: null, rankings: [], bestTier: null };
}

function parseTiersData(data) {
  const rankings = [];
  let bestTier = null;
  let bestScore = Infinity;

  if (data.rankings) {
    for (const [mode, info] of Object.entries(data.rankings)) {
      if (info.retired) continue;
      const tierStr = formatTier(info.tier, info.pos);
      rankings.push({
        mode,
        label: GAMEMODE_LABELS[mode] || mode,
        tier: info.tier,
        pos: info.pos,
        tierStr,
        peakTier: info.peak_tier != null ? formatTier(info.peak_tier, info.peak_pos ?? 0) : null
      });
      const score = info.tier * 2 + (info.pos === 0 ? 0 : 1);
      if (score < bestScore) {
        bestScore = score;
        bestTier = tierStr;
      }
    }
  }

  rankings.sort((a, b) => (a.tier * 2 + a.pos) - (b.tier * 2 + b.pos));

  return {
    username: data.name || data.username,
    uuid: data.uuid,
    overall: data.overall,
    points: data.points,
    region: data.region,
    rankings,
    bestTier
  };
}

export function getSkinUrl(username, type = 'body') {
  const encoded = encodeURIComponent(username);
  if (type === 'head') {
    return `https://mc-heads.net/avatar/${encoded}/128`;
  }
  return `https://mc-heads.net/body/${encoded}/200`;
}

export function startTierRefresh(username, callback, interval = 30000) {
  const update = async () => {
    tiersCache.delete(username.toLowerCase());
    const data = await fetchPlayerTiers(username);
    callback(data);
  };
  update();
  return setInterval(update, interval);
}
