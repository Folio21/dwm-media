import fetch from 'node-fetch';

const EMAIL_RE = /[\w.+%-]+@[\w.-]+\.[a-z]{2,}/gi;

// Emails to ignore — system/noreply addresses
const JUNK = /noreply|no-reply|donotreply|example|sentry|wix|wordpress|squarespace|godaddy|support@|info@sentry|@2x\.|\.png|\.jpg|\.gif/i;

function extractEmails(html) {
  const raw = html.match(EMAIL_RE) || [];
  const seen = new Set();
  return raw.filter((e) => {
    const lower = e.toLowerCase();
    if (JUNK.test(lower)) return false;
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function normalizeUrl(base, path) {
  try {
    return new URL(path, base).href;
  } catch {
    return null;
  }
}

async function fetchPage(url, timeoutMs = 6000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DWMBot/1.0)' },
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

export async function scrapeEmailsFromSite(siteUrl) {
  if (!siteUrl) return [];

  // Normalize — add https:// if missing
  let base = siteUrl.trim();
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;

  // Pages most likely to have contact info
  const subPaths = ['', '/contact', '/contact-us', '/about', '/about-us', '/reach-us', '/get-in-touch'];
  const urls = subPaths.map((p) => normalizeUrl(base, p)).filter(Boolean);

  const emails = new Set();

  await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPage(url);
      if (html) {
        for (const e of extractEmails(html)) emails.add(e.toLowerCase());
      }
    })
  );

  // Also decode mailto: links specifically — sometimes emails are only in href
  const mainHtml = await fetchPage(base);
  if (mainHtml) {
    const mailtos = [...mainHtml.matchAll(/mailto:([^"'?>\s]+)/gi)];
    for (const m of mailtos) {
      const e = m[1].toLowerCase().trim();
      if (!JUNK.test(e)) emails.add(e);
    }
  }

  return [...emails].slice(0, 5); // cap at 5
}
