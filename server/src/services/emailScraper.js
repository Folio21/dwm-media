import fetch from 'node-fetch';

const EMAIL_RE = /[\w.+%-]+@[\w.-]+\.[a-z]{2,}/gi;

// Emails to ignore — system/noreply/platform addresses
const JUNK = /noreply|no-reply|donotreply|example|sentry|wix|wordpress|squarespace|godaddy|weebly|webflow|shopify|support@sentry|@2x\.|\.png|\.jpg|\.gif|\.svg|schema\.org|w3\.org/i;

// ── Cloudflare email protection decoder ────────────────────────────────────
// CF encodes emails as hex XOR strings in data-cfemail attributes and
// /cdn-cgi/l/email-protection# hrefs. This decodes them.
function decodeCfEmail(encoded) {
  try {
    const key = parseInt(encoded.substring(0, 2), 16);
    let email = '';
    for (let i = 2; i < encoded.length; i += 2) {
      email += String.fromCharCode(parseInt(encoded.substring(i, i + 2), 16) ^ key);
    }
    return email;
  } catch {
    return null;
  }
}

function extractCfEmails(html) {
  const results = [];
  // data-cfemail="..."
  const dataRe = /data-cfemail="([0-9a-f]+)"/gi;
  let m;
  while ((m = dataRe.exec(html)) !== null) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded) results.push(decoded);
  }
  // href="/cdn-cgi/l/email-protection#..."
  const hrefRe = /email-protection#([0-9a-f]+)/gi;
  while ((m = hrefRe.exec(html)) !== null) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded) results.push(decoded);
  }
  return results;
}

// ── Plain-text email extraction ─────────────────────────────────────────────
function extractPlainEmails(html) {
  return html.match(EMAIL_RE) || [];
}

// ── mailto: href extraction ─────────────────────────────────────────────────
function extractMailtoEmails(html) {
  const results = [];
  const re = /mailto:([^"'?>\s]+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push(decodeURIComponent(m[1]).toLowerCase().trim());
  }
  return results;
}

function isJunk(email) {
  return JUNK.test(email.toLowerCase());
}

// ── HTTP fetch helper ───────────────────────────────────────────────────────
async function fetchPage(url, timeoutMs = 7000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function normalizeUrl(base, path) {
  try { return new URL(path, base).href; } catch { return null; }
}

// ── Common email pattern guesser ────────────────────────────────────────────
// Returns likely addresses based on the site's domain. Labeled guessed in UI.
export function guessEmailsFromDomain(siteUrl) {
  try {
    let url = siteUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const host = new URL(url).hostname.replace(/^www\./, '');
    const prefixes = ['info', 'contact', 'hello', 'office', 'admin'];
    return prefixes.map((p) => ({ email: `${p}@${host}`, guessed: true }));
  } catch {
    return [];
  }
}

// ── Main export ─────────────────────────────────────────────────────────────
// Returns: { found: string[], guessed: Array<{email, guessed: true}> }
export async function scrapeEmailsFromSite(siteUrl) {
  if (!siteUrl) return { found: [], guessed: [] };

  let base = siteUrl.trim();
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;

  const subPaths = ['', '/contact', '/contact-us', '/about', '/about-us', '/reach-us', '/get-in-touch'];
  const urls = subPaths.map((p) => normalizeUrl(base, p)).filter(Boolean);

  const emailSet = new Set();

  await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPage(url);
      if (!html) return;

      // 1. Plain text emails
      for (const e of extractPlainEmails(html)) {
        const lower = e.toLowerCase();
        if (!isJunk(lower)) emailSet.add(lower);
      }
      // 2. mailto: hrefs
      for (const e of extractMailtoEmails(html)) {
        if (!isJunk(e)) emailSet.add(e);
      }
      // 3. Cloudflare-protected emails
      for (const e of extractCfEmails(html)) {
        const lower = e.toLowerCase();
        if (!isJunk(lower)) emailSet.add(lower);
      }
    })
  );

  const found = [...emailSet].slice(0, 5);

  // Only return guesses if we found nothing real
  const guessed = found.length === 0 ? guessEmailsFromDomain(base) : [];

  return { found, guessed };
}
