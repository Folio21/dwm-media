/**
 * ownerFinder.js
 *
 * Tries to find a business owner's name using two reliable strategies:
 *   1. Business-name heuristic — instant, zero network
 *      Detects when the business is named after its owner ("Bob Heinmiller Air…" → Bob Heinmiller)
 *      Uses a whitelist of real first names so "High Tech" and "Our Place" don't match.
 *   2. Website scraping — JSON-LD, text patterns, About page
 *      Works for businesses that mention the owner on their site.
 *
 * Sunbiz (403 blocked), Yelp (403 blocked), and DuckDuckGo (connection reset) have all been
 * removed — they were wasting 7+ seconds per business with zero results.
 *
 * Call: findOwnerName(lead)
 * Returns: name string or null
 */

import fetch from 'node-fetch';

const FETCH_TIMEOUT_MS = 7000;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ─── Public API ───────────────────────────────────────────────────────────────

export async function findOwnerName(lead) {
  if (!lead) return null;
  const { website_url, name } = lead;

  // Strategy 1 — business named after owner ("Bob Heinmiller", "Gary Munson", "Frank Gay")
  if (name) {
    const r = extractNameFromBusinessName(name);
    if (r) { console.log(`[ownerFinder] biz-name → ${r} (${name})`); return r; }
  }

  // Strategy 2 — scrape their website for owner info
  if (website_url) {
    const r = await tryWebsite(website_url);
    if (r) { console.log(`[ownerFinder] website → ${r} (${name})`); return r; }
  }

  // No result found
  return null;
}

// ─── Strategy 1: Name-in-business-name ───────────────────────────────────────

// Whitelist of common first names that legitimately appear at the start of a business name.
// Using a whitelist avoids false positives like "High Tech" or "Our Place".
const FIRST_NAMES = new Set([
  // Men
  'Aaron','Adam','Alan','Albert','Alex','Alfred','Allen','Andrew','Anthony','Arthur',
  'Austin','Barry','Ben','Benjamin','Bill','Billy','Bob','Bobby','Brad','Brandon',
  'Brian','Bruce','Bryan','Carl','Carlos','Chad','Charles','Chris','Christopher',
  'Chuck','Clayton','Clifford','Craig','Curtis','Dale','Dan','Daniel','Danny',
  'Darren','Dave','David','Dean','Dennis','Derek','Don','Donald','Doug','Douglas',
  'Dylan','Earl','Ed','Eddie','Edgar','Edward','Eric','Eugene','Frank','Fred',
  'Frederick','Gary','Gene','George','Gerald','Glen','Glenn','Greg','Gregory',
  'Harold','Harry','Harvey','Henry','Herman','Howard','Jack','Jackson','James',
  'Jason','Jay','Jeff','Jeffrey','Jeremy','Jerry','Jim','Jimmy','Joe','Joel',
  'John','Johnny','Jonathan','Jose','Joseph','Josh','Joshua','Juan','Keith',
  'Ken','Kenneth','Kevin','Kyle','Larry','Lee','Leonard','Lewis','Louis','Luke',
  'Manuel','Mario','Mark','Matt','Matthew','Michael','Miguel','Mike','Nathan',
  'Nicholas','Nick','Patrick','Paul','Pete','Peter','Philip','Randy','Raymond',
  'Richard','Rick','Rob','Robert','Roger','Ronald','Roy','Russell','Ryan','Sam',
  'Samuel','Scott','Sean','Seth','Shane','Stanley','Stephen','Steve','Steven',
  'Terry','Thomas','Tim','Timothy','Todd','Tom','Tony','Travis','Troy','Tyler',
  'Victor','Vincent','Walter','Warren','Wayne','Wesley','William','Willie','Zachary',
  // Women
  'Alice','Amanda','Amy','Angela','Anna','Barbara','Betty','Beverly','Brenda',
  'Carol','Caroline','Catherine','Christine','Clara','Connie','Dana','Deborah',
  'Debra','Diana','Donna','Dorothy','Elizabeth','Emily','Gloria','Helen','Janet',
  'Jean','Jennifer','Jessica','Joan','Joyce','Judith','Karen','Katherine','Kathleen',
  'Laura','Linda','Lisa','Maria','Marie','Martha','Mary','Melissa','Michelle',
  'Nancy','Patricia','Rachel','Rebecca','Ruth','Sandra','Sara','Sarah','Sharon',
  'Shirley','Susan','Teresa','Virginia',
]);

// Words that look title-case but are NOT surnames — stop scanning when we hit one.
const NOT_SURNAME = new Set([
  'Air','Heating','Cooling','Heat','Cool','Hvac','Ac',
  'Service','Services','Solutions','Repair','Repairs',
  'Plumbing','Electrical','Electric','Mechanical',
  'Home','House','Commercial','Industrial','Residential',
  'Central','North','South','East','West',
  'Florida','Orlando','Tampa','Miami','National','American',
  'First','Best','Pro','Total','Complete','Quality',
  'Comfort','Precision','Advanced','Expert','Top',
  'Supreme','Premium','Elite','Prime','Infinity',
  'Star','Gold','Blue','Green','Red',
  'Local','Downtown','Bay','Lake','City','State',
  'Energy','Fuel','Systems','Technology','Group',
  'Associates','Brothers','Sons','Company','Inc','Llc',
  'Corp','Contractors','Contractor','Construction',
  'General','Master','Tech','Place','One','Two',
  'High','Low','New','Old','Big','Little',
]);

function extractNameFromBusinessName(bizName) {
  // Split on spaces, &, commas, dashes, pipes
  const words = bizName.split(/[\s&,\-|+\/\\]+/).filter(Boolean);
  if (words.length < 2) return null;

  const first = words[0];

  // First word must be a recognized common first name (exact match, title-case)
  if (!FIRST_NAMES.has(first)) return null;

  const second = words[1];

  // Second word must be:
  // - Title-case with at least 3 chars (excludes "AC", "AV", etc.)
  // - Not a common business/descriptor word
  if (!/^[A-Z][a-z]{2,}$/.test(second)) return null;
  if (NOT_SURNAME.has(second)) return null;

  return `${first} ${second}`;
}

// ─── Strategy 2: Website scraping ────────────────────────────────────────────

async function tryWebsite(url) {
  try {
    const html = await fetchPage(url);
    if (!html) return null;

    const r = extractFromJsonLd(html) || extractFromText(html);
    if (r) return r;

    // Try About/Team page
    const aboutUrl = findAboutUrl(html, url);
    if (aboutUrl && aboutUrl !== url) {
      const aboutHtml = await fetchPage(aboutUrl);
      if (aboutHtml) return extractFromJsonLd(aboutHtml) || extractFromText(aboutHtml) || null;
    }
    return null;
  } catch { return null; }
}

// ─── JSON-LD extractor ────────────────────────────────────────────────────────

const OWNER_TITLES = [
  'owner','founder','co-founder','president','proprietor','ceo','managing director','principal','operator',
];

function extractFromJsonLd(html) {
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const r = walkSchema(item);
        if (r) return r;
      }
    } catch { /* bad JSON */ }
  }
  return null;
}

function walkSchema(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) { const r = walkSchema(item); if (r) return r; }
    return null;
  }
  if (obj['@type'] === 'Person' && obj.name) {
    const title = (obj.jobTitle || '').toLowerCase();
    if (OWNER_TITLES.some((t) => title.includes(t))) return formatName(obj.name);
  }
  if (obj.founder) {
    const f = obj.founder;
    if (typeof f === 'string') return formatName(f);
    if (f?.name) return formatName(f.name);
  }
  if (Array.isArray(obj.employee)) {
    for (const emp of obj.employee) {
      if (emp?.name) {
        const title = (emp.jobTitle || '').toLowerCase();
        if (OWNER_TITLES.some((t) => title.includes(t))) return formatName(emp.name);
      }
    }
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') { const r = walkSchema(val); if (r) return r; }
  }
  return null;
}

// ─── Text pattern extractor ───────────────────────────────────────────────────

const NAME_PAT = '([A-Z][a-z]{1,20}(?:\\s+[A-Z][a-z]{1,20}){1,2})';

const TEXT_PATTERNS = [
  new RegExp(`[Oo]wner[:\\s\\-]+${NAME_PAT}`),
  new RegExp(`${NAME_PAT}[,\\s\\-]+(?:is\\s+(?:the\\s+))?[Oo]wner`),
  new RegExp(`[Ff]ounded by\\s+${NAME_PAT}`),
  new RegExp(`[Pp]resident[:\\s]+${NAME_PAT}`),
  new RegExp(`[Pp]roprietor[:\\s]+${NAME_PAT}`),
  new RegExp(`Hi[,!]?\\s+I'?m\\s+${NAME_PAT}`),
  new RegExp(`[Mm]eet\\s+${NAME_PAT}[,\\s]+(?:your\\s+)?(?:owner|founder)`),
  /[Oo]wned and operated by\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})/,
  /[Mm]y name is\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})/,
];

function extractFromText(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  for (const pattern of TEXT_PATTERNS) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const name = formatName(m[1]);
      if (isLikelyName(name)) return name;
    }
  }
  return null;
}

// ─── About page finder ────────────────────────────────────────────────────────

const ABOUT_KEYWORDS = /\/about|\/team|\/staff|\/our-story|\/who-we-are|\/meet-us|\/people/i;

function findAboutUrl(html, baseUrl) {
  const pattern = /href=["']([^"'#?]+)["']/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (ABOUT_KEYWORDS.test(match[1])) {
      try { return new URL(match[1], baseUrl).href; } catch { /* ignore */ }
    }
  }
  return null;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, { headers: HEADERS, signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.text();
  } catch { return null; }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function isLikelyName(str) {
  if (!str || str.length < 4 || str.length > 55) return false;
  const words = str.split(' ').filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((w) => /^[A-Z][a-z]*$|^[A-Z]\.?$/.test(w));
}
