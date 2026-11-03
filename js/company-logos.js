/* Shared Company Logo Directory & Triple-Row Marquee Renderer
 * Used by:
 *  - Get Referred™ Portal (/getreferred) — renders only companies in the Referral Database (with 89-company fallback)
 *  - Leadership Page (/leadership) — renders all Leadership + Referral companies (100 base + any new companies added to the Referral Database)
 */

export const REFERRAL_DEFAULT_COMPANIES = [
  { name: 'Accenture', logo: '/assets/alumni/accenture.png' },
  { name: 'Adani Group', logo: '/assets/alumni/adani.png' },
  { name: 'Amazon', logo: '/assets/alumni/amazon.png' },
  { name: 'American Express', logo: '/assets/alumni/amex.png' },
  { name: 'Amway', logo: '/assets/alumni/amway.svg' },
  { name: 'Angel One', logo: '/assets/alumni/angelone.png' },
  { name: 'Asian Paints', logo: '/assets/alumni/asianpaints.png' },
  { name: 'AU Bank', logo: '/assets/alumni/aubank.png' },
  { name: 'Axis Bank', logo: '/assets/alumni/axis.png' },
  { name: 'Axis Capital', logo: '/assets/alumni/axis.png' },
  { name: 'Axis Finance', logo: '/assets/alumni/axis.png' },
  { name: 'Bajaj Auto', logo: '/assets/alumni/bajajauto.png' },
  { name: 'Bajaj Finance', logo: '/assets/alumni/bajajfinance.png' },
  { name: 'Bandhan Bank', logo: '/assets/alumni/bandhan.png' },
  { name: 'Bank Of America', logo: '/assets/alumni/bofa.png' },
  { name: 'Barclays', logo: '/assets/alumni/barclays.png' },
  { name: 'BCG', logo: '/assets/alumni/bcg.png' },
  { name: 'Blinkit', logo: '/assets/alumni/blinkit.png' },
  { name: "BYJU's", logo: '/assets/alumni/byjus.png' },
  { name: 'Capgemini', logo: '/assets/alumni/capgemini.png' },
  { name: 'CLSA', logo: '/assets/alumni/clsa.png' },
  { name: 'Concentrix', logo: '/assets/alumni/concentrix.png' },
  { name: 'CRISIL', logo: '/assets/alumni/crisil.svg' },
  { name: 'Delhivery', logo: '/assets/alumni/delhivery.png' },
  { name: 'Deloitte', logo: '/assets/alumni/deloitte.png' },
  { name: 'Deloitte USI', logo: '/assets/alumni/deloitte.png' },
  { name: 'Deutsche Bank', logo: '/assets/alumni/db.png' },
  { name: 'District', logo: '/assets/alumni/district.png' },
  { name: 'Everest Consulting', logo: '/assets/alumni/everest.png' },
  { name: 'EY', logo: '/assets/alumni/ey.png' },
  { name: 'Flipkart', logo: '/assets/alumni/flipkart.png' },
  { name: 'GAIL', logo: '/assets/alumni/gail.svg' },
  { name: 'GEP', logo: '/assets/alumni/gep.png' },
  { name: 'Google', logo: '/assets/alumni/google.png' },
  { name: 'HDFC Bank', logo: '/assets/alumni/hdfc.png' },
  { name: 'House of Abhinandan Lodha', logo: '/assets/alumni/hoabl.png' },
  { name: 'HP', logo: '/assets/alumni/hp.png' },
  { name: 'HSBC', logo: '/assets/alumni/hsbc.png' },
  { name: 'IBM', logo: '/assets/alumni/ibm.png' },
  { name: 'Icertis', logo: '/assets/alumni/icertis.png' },
  { name: 'ICICI Bank', logo: '/assets/alumni/icici.png' },
  { name: 'ICICI Securities', logo: '/assets/alumni/icicisecurities.png' },
  { name: 'IDFC First Bank', logo: '/assets/alumni/idfcfirst.png' },
  { name: 'IndiaMart', logo: '/assets/alumni/indiamart.png' },
  { name: 'IndusInd Bank', logo: '/assets/alumni/indusind.png' },
  { name: 'IOCL', logo: '/assets/alumni/iocl.png' },
  { name: 'IQVIA', logo: '/assets/alumni/iqvia.png' },
  { name: 'ITC', logo: '/assets/alumni/itc.png' },
  { name: 'JP Morgan', logo: '/assets/alumni/jpmorgan.png' },
  { name: 'KONE', logo: '/assets/alumni/kone.png' },
  { name: 'Kotak', logo: '/assets/alumni/kotak.png' },
  { name: 'KPMG', logo: '/assets/alumni/kpmg.svg' },
  { name: "L'Oréal", logo: '/assets/alumni/loreal.png' },
  { name: 'Lenovo', logo: '/assets/alumni/lenovo.png' },
  { name: 'Microsoft', logo: '/assets/alumni/microsoft.png' },
  { name: 'Morgan Stanley', logo: '/assets/alumni/morganstanley.png' },
  { name: 'Motilal Oswal', logo: '/assets/alumni/motilal.png' },
  { name: 'Nomura', logo: '/assets/alumni/nomura.png' },
  { name: 'Northern Arc', logo: '/assets/alumni/northernarc.png' },
  { name: 'Nothing', logo: '/assets/alumni/nothing.png' },
  { name: 'Optum', logo: '/assets/alumni/optum.png' },
  { name: 'P&G', logo: '/assets/alumni/pg.png' },
  { name: 'Paytm', logo: '/assets/alumni/paytm.png' },
  { name: 'Pharmeasy', logo: '/assets/alumni/pharmeasy.png' },
  { name: 'Phillips', logo: '/assets/alumni/philips.png' },
  { name: 'Pine Labs', logo: '/assets/alumni/pinelabs.png' },
  { name: 'Polestar Analytics', logo: '/assets/alumni/polestar.png?v=2' },
  { name: 'PwC', logo: '/assets/alumni/pwc.png' },
  { name: 'Quantiphi', logo: '/assets/alumni/quantiphi.svg' },
  { name: 'RBL Bank', logo: '/assets/alumni/rbl.png' },
  { name: 'REC', logo: '/assets/alumni/rec.png' },
  { name: 'Salesforce', logo: '/assets/alumni/salesforce.png' },
  { name: 'Samsung', logo: '/assets/alumni/samsung.png' },
  { name: 'Schneider Electric', logo: '/assets/alumni/schneider.png' },
  { name: 'StockX', logo: '/assets/alumni/stockx.png' },
  { name: 'Synergy Consulting', logo: '/assets/alumni/synergy.png' },
  { name: 'Tata Steel', logo: '/assets/alumni/tatasteel.png' },
  { name: 'UBS', logo: '/assets/alumni/ubs.png' },
  { name: 'Unilever', logo: '/assets/alumni/unilever.png' },
  { name: 'United Phosphorus Ltd', logo: '/assets/alumni/upl.png' },
  { name: 'Vector Consulting', logo: '/assets/alumni/vector.png' },
  { name: 'Vivo', logo: '/assets/alumni/vivo.png' },
  { name: 'Wells Fargo', logo: '/assets/alumni/wellsfargo.png' },
  { name: 'Wipro', logo: '/assets/alumni/wipro.png' },
  { name: 'Yes Bank', logo: '/assets/alumni/yesbank.png' },
  { name: 'Zomato', logo: '/assets/alumni/zomato.png' },
  { name: 'ZS Associates', logo: '/assets/alumni/zs.svg' },
  { name: 'AGCO Corporation', logo: '/assets/alumni/agco.png' },
  { name: 'Zeotap', logo: '/assets/alumni/zeotap.png' },
];

export const LEADERSHIP_EXTRA_COMPANIES = [
  { name: 'McKinsey & Co', logo: '/assets/alumni/mckinsey.png' },
  { name: 'Goldman Sachs', logo: '/assets/alumni/goldman.png' },
  { name: 'Diageo', logo: '/assets/alumni/diageo.png' },
  { name: 'AB InBev', logo: '/assets/alumni/abinbev.png' },
  { name: 'Zepto', logo: '/assets/alumni/zepto.png' },
  { name: 'PhonePe', logo: '/assets/alumni/phonepe.png' },
  { name: 'Meesho', logo: '/assets/alumni/meesho.png' },
  { name: 'ICRA', logo: '/assets/alumni/icra.png' },
  { name: 'Tomorrow Capital', logo: '/assets/alumni/tomorrow.png' },
  { name: 'Thoucentric', logo: '/assets/alumni/thoucentric.png' },
  { name: 'VGL Ltd', logo: '/assets/alumni/vgl.png' },
];

export function normalizeCompanyKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

const KNOWN_LOGO_MAP = new Map();
[...REFERRAL_DEFAULT_COMPANIES, ...LEADERSHIP_EXTRA_COMPANIES].forEach((c) => {
  KNOWN_LOGO_MAP.set(normalizeCompanyKey(c.name), c.logo);
});

// Common aliases so slight spelling variations in Excel sheets resolve to the exact crisp asset
const ALIAS_LOGOS = {
  polestar: '/assets/alumni/polestar.png?v=2',
  polestaranalytics: '/assets/alumni/polestar.png?v=2',
  philips: '/assets/alumni/philips.png',
  phillips: '/assets/alumni/philips.png',
  loreal: '/assets/alumni/loreal.png',
  pg: '/assets/alumni/pg.png',
  pandg: '/assets/alumni/pg.png',
  procterandgamble: '/assets/alumni/pg.png',
  pwc: '/assets/alumni/pwc.png',
  pricewaterhousecoopers: '/assets/alumni/pwc.png',
  ey: '/assets/alumni/ey.png',
  ernstandyoung: '/assets/alumni/ey.png',
  bcg: '/assets/alumni/bcg.png',
  bostonconsultinggroup: '/assets/alumni/bcg.png',
  mckinsey: '/assets/alumni/mckinsey.png',
  mckinseyandcompany: '/assets/alumni/mckinsey.png',
  mckinseyandco: '/assets/alumni/mckinsey.png',
  jpmorgan: '/assets/alumni/jpmorgan.png',
  jpmorganchase: '/assets/alumni/jpmorgan.png',
  bofa: '/assets/alumni/bofa.png',
  bankofamerica: '/assets/alumni/bofa.png',
  amex: '/assets/alumni/amex.png',
  americanexpress: '/assets/alumni/amex.png',
  db: '/assets/alumni/db.png',
  deutschebank: '/assets/alumni/db.png',
  hoabl: '/assets/alumni/hoabl.png',
  thehouseofabhinandanlodha: '/assets/alumni/hoabl.png',
  houseofabhinandanlodha: '/assets/alumni/hoabl.png',
  upl: '/assets/alumni/upl.png',
  unitedphosphorus: '/assets/alumni/upl.png',
  unitedphosphorusltd: '/assets/alumni/upl.png',
  unitedphosphoruslimited: '/assets/alumni/upl.png',
  zs: '/assets/alumni/zs.svg',
  zsassociates: '/assets/alumni/zs.svg',
  agco: '/assets/alumni/agco.png',
  agcocorp: '/assets/alumni/agco.png',
  agcocorporation: '/assets/alumni/agco.png',
  kotakmahindrabank: '/assets/alumni/kotak.png',
  kotakbank: '/assets/alumni/kotak.png',
  ausmallfinancebank: '/assets/alumni/aubank.png',
  rec: '/assets/alumni/rec.png',
  reclimited: '/assets/alumni/rec.png',
  recltd: '/assets/alumni/rec.png',
  iocl: '/assets/alumni/iocl.png',
  indianoil: '/assets/alumni/iocl.png',
  gail: '/assets/alumni/gail.svg',
  gailindia: '/assets/alumni/gail.svg',
  adani: '/assets/alumni/adani.png',
  adanigroup: '/assets/alumni/adani.png',
  byjus: '/assets/alumni/byjus.png',
  deloitteindia: '/assets/alumni/deloitte.png',
  deloitteusi: '/assets/alumni/deloitte.png',
  axis: '/assets/alumni/axis.png',
  axisbank: '/assets/alumni/axis.png',
  axiscapital: '/assets/alumni/axis.png',
  axisfinance: '/assets/alumni/axis.png',
  icici: '/assets/alumni/icici.png',
  icicibank: '/assets/alumni/icici.png',
  icicisecurities: '/assets/alumni/icicisecurities.png',
  hdfc: '/assets/alumni/hdfc.png',
  hdfcbank: '/assets/alumni/hdfc.png',
};

Object.entries(ALIAS_LOGOS).forEach(([k, v]) => KNOWN_LOGO_MAP.set(k, v));

const ATS_HOSTS = [
  'myworkdayjobs.com', 'workday.com', 'greenhouse.io', 'lever.co', 'smartrecruiters.com',
  'icims.com', 'taleo.net', 'successfactors.com', 'successfactors.eu', 'naukri.com',
  'linkedin.com', 'indeed.com', 'darwinbox.in', 'peoplestrong.com', 'eightfold.ai',
  'phenom.com', ' oraclecloud.com', 'ultipro.com', 'bamboohr.com', 'ashbyhq.com',
];

export function makeMonogramDataUri(name) {
  const words = String(name || 'Company').trim().split(/[\s&+\-]+/).filter(Boolean);
  const initials = (words.length >= 2
    ? (words[0][0] + words[1][0])
    : (words[0] || 'CO').slice(0, 2)
  ).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="#073D32"/><text x="32" y="40" font-family="Montserrat,Arial,sans-serif" font-size="24" font-weight="800" fill="#D4AF7C" text-anchor="middle">${initials}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function resolveCompanyLogo(name, portalUrl = '') {
  const key = normalizeCompanyKey(name);
  if (KNOWN_LOGO_MAP.has(key)) {
    return KNOWN_LOGO_MAP.get(key);
  }
  // Check if a prefix/root matches known map
  for (const [k, v] of KNOWN_LOGO_MAP.entries()) {
    if (key.length >= 4 && k.length >= 4 && (key.startsWith(k) || k.startsWith(key))) {
      return v;
    }
  }
  // If portalUrl is provided and not a generic ATS domain, extract root domain
  if (portalUrl && /^https?:\/\//i.test(portalUrl)) {
    try {
      const u = new URL(portalUrl);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      const isAts = ATS_HOSTS.some((ats) => host.includes(ats.trim()));
      if (!isAts && host.includes('.')) {
        const parts = host.split('.');
        const rootDomain = parts.length > 2 && parts[parts.length - 1].length > 2
          ? parts.slice(-2).join('.')
          : host;
        return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${rootDomain}&size=128`;
      }
    } catch (_) {}
  }
  // Derive domain from company name for any newly added company
  const cleanSlug = String(name || '')
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|inc|corporation|corp|group|india|consulting|analytics|solutions|technologies|services|global|holdings|international)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (cleanSlug.length >= 2) {
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanSlug}.com&size=128`;
  }
  return makeMonogramDataUri(name);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Deduplicates a list of companies (strings or {name, portalUrl, logo}) and renders
 * a 3-row infinite scrolling marquee inside containerEl.
 */
export function renderTripleMarquee(containerEl, rawCompanies) {
  if (!containerEl) return;
  const seen = new Set();
  const list = [];

  for (const item of rawCompanies || []) {
    const name = typeof item === 'string' ? item.trim() : String((item && item.name) || '').trim();
    if (!name) continue;
    let key = normalizeCompanyKey(name);
    // Normalize Polestar -> Polestar Analytics
    const displayName = key === 'polestar' ? 'Polestar Analytics' : name;
    key = normalizeCompanyKey(displayName);
    if (seen.has(key)) continue;
    seen.add(key);
    const portalUrl = (item && item.portalUrl) || '';
    const logo = (item && item.logo) || resolveCompanyLogo(displayName, portalUrl);
    list.push({ name: displayName, logo, fallback: makeMonogramDataUri(displayName) });
  }

  if (!list.length) return;

  // Split evenly into 3 rows
  const rowCount = 3;
  const rows = [[], [], []];
  const perRow = Math.ceil(list.length / rowCount);
  list.forEach((company, idx) => {
    const r = Math.min(rowCount - 1, Math.floor(idx / perRow));
    rows[r].push(company);
  });

  // Ensure every row has enough items for a smooth wide track
  for (let r = 0; r < rowCount; r++) {
    if (rows[r].length === 0) rows[r] = [...list];
    while (rows[r].length < 12) {
      rows[r] = rows[r].concat(rows[r]);
    }
  }

  const buildCardsHtml = (items) =>
    items
      .map(
        (c) =>
          `<div class="alumni-company-card"><img src="${escapeHtml(c.logo)}" alt="${escapeHtml(c.name)}" class="alumni-logo-img" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(c.fallback)}';"><span class="alumni-company-name">${escapeHtml(c.name)}</span></div>`
      )
      .join('');

  containerEl.innerHTML = rows
    .map((rowItems, idx) => {
      const reverseClass = idx === 1 ? ' reverse' : '';
      const cards = buildCardsHtml(rowItems);
      return `
        <div class="alumni-marquee-row">
          <div class="alumni-marquee-track${reverseClass}">${cards}</div>
          <div class="alumni-marquee-track${reverseClass}" aria-hidden="true">${cards}</div>
        </div>
      `;
    })
    .join('');
}
