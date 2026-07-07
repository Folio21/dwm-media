import fetch from 'node-fetch';

/**
 * Fetches a URL and extracts key content for the rebuild prompt.
 * No external HTML parser — uses regex and string ops to stay dependency-free.
 */
export async function scrapeUrl(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteRebuilder/1.0)' },
    timeout: 12000,
  });

  if (!res.ok) throw new Error(`Could not fetch that URL (${res.status}). Check it's publicly accessible.`);

  const html = await res.text();
  return extractContent(html, url);
}

async function extractContent(html, url) {
  // Strip scripts and styles first so they don't pollute text extraction
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const title       = getTag(stripped, 'title');
  const metaDesc    = getMeta(stripped, 'description');
  const ogTitle     = getOg(stripped, 'og:title');
  const ogDesc      = getOg(stripped, 'og:description');
  const ogImage     = getOg(html, 'og:image');
  const h1s         = getAllTags(stripped, 'h1').slice(0, 3);
  const h2s         = getAllTags(stripped, 'h2').slice(0, 6);
  const h3s         = getAllTags(stripped, 'h3').slice(0, 6);
  const bodyText    = extractBodyText(stripped);
  const phones      = extractPhones(html);
  const emails      = extractEmails(html);
  const images      = extractImages(html, url, ogImage);
  const logo        = extractLogo(html, url);

  // Fetch external stylesheets so we actually see the real CSS
  const externalCss = await fetchExternalCss(html, url);
  const allCss      = extractInlineCss(html) + '\n' + externalCss;
  const brandColors = extractBrandColors(allCss);

  return {
    url,
    title:       clean(title || ogTitle || ''),
    description: clean(metaDesc || ogDesc || ''),
    h1s:         h1s.map(clean).filter(Boolean),
    h2s:         h2s.map(clean).filter(Boolean),
    h3s:         h3s.map(clean).filter(Boolean),
    bodyText:    bodyText.slice(0, 3000),
    phones:      [...new Set(phones)].slice(0, 3),
    emails:      [...new Set(emails)].slice(0, 3),
    images,
    logo,
    brandColors,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1] : '';
}

function getAllTags(html, tag) {
  const matches = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m;
  while ((m = re.exec(html)) !== null) matches.push(m[1]);
  return matches;
}

function getMeta(html, name) {
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
         || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
  return m ? m[1] : '';
}

function getOg(html, property) {
  const m = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
         || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
  return m ? m[1] : '';
}

function extractBodyText(html) {
  // Remove nav/header/footer blocks to focus on main content
  const noNav = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // Strip remaining tags and collapse whitespace
  return noNav
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImages(html, pageUrl, ogImage) {
  const base = new URL(pageUrl);
  const seen = new Set();
  const results = [];

  // og:image first — usually the best hero image
  if (ogImage) {
    const abs = toAbsolute(ogImage, base);
    if (abs) { seen.add(abs); results.push(abs); }
  }

  // Pull all <img src> and <source srcset> values
  const srcMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const m of srcMatches) {
    const abs = toAbsolute(m[1], base);
    if (abs && !seen.has(abs) && isLikelyPhoto(abs)) {
      seen.add(abs);
      results.push(abs);
    }
  }

  // Also check srcset for high-res variants
  const srcsetMatches = html.matchAll(/srcset=["']([^"']+)["']/gi);
  for (const m of srcsetMatches) {
    // srcset entries are comma-separated "url width" pairs
    const entries = m[1].split(',').map((e) => e.trim().split(/\s+/)[0]);
    for (const src of entries) {
      const abs = toAbsolute(src, base);
      if (abs && !seen.has(abs) && isLikelyPhoto(abs)) {
        seen.add(abs);
        results.push(abs);
      }
    }
  }

  // Return up to 8 images — enough to cover hero + gallery + sections
  return results.slice(0, 8);
}

function toAbsolute(src, base) {
  if (!src || src.startsWith('data:')) return null;
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

function isLikelyPhoto(url) {
  const lower = url.toLowerCase();
  // Skip tiny icons, tracking pixels, and SVG logos
  if (/\.(svg|ico|gif|webp)(\?|$)/.test(lower)) return false;
  if (/[_-](icon|logo|pixel|tracker|spacer|blank)\b/i.test(lower)) return false;
  if (/\/(icon|logo|pixel|tracker|favicon)\b/i.test(lower)) return false;
  return /\.(jpg|jpeg|png|webp)(\?|$)/.test(lower) || lower.includes('/image') || lower.includes('/photo') || lower.includes('/img');
}

function extractLogo(html, pageUrl) {
  const base = new URL(pageUrl);

  // 1. <img> tags with "logo" in src, alt, class, or id — strongest signal
  const logoTagRe = /<img([^>]+)>/gi;
  let m;
  while ((m = logoTagRe.exec(html)) !== null) {
    const attrs = m[1];
    const isLogoAttr = /(?:alt|class|id|src)=["'][^"']*logo[^"']*["']/i.test(attrs);
    if (isLogoAttr) {
      const srcM = attrs.match(/src=["']([^"']+)["']/i);
      if (srcM) {
        const abs = toAbsolute(srcM[1], base);
        if (abs) return abs;
      }
    }
  }

  // 2. First <img> inside a <nav> or <header> — often the logo
  const navContent = html.match(/<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/i)?.[1] || '';
  const navImg = navContent.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (navImg) {
    const abs = toAbsolute(navImg[1], base);
    if (abs) return abs;
  }

  // 3. Apple touch icon — usually a clean square logo
  const touchIcon = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
                 || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i);
  if (touchIcon) {
    const abs = toAbsolute(touchIcon[1], base);
    if (abs) return abs;
  }

  // 4. Favicon as last resort
  const favicon = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
               || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
  if (favicon) {
    const abs = toAbsolute(favicon[1], base);
    if (abs && !/\.ico$/i.test(abs)) return abs; // skip .ico — browsers render, HTML img tags don't always
  }

  return null;
}

function extractInlineCss(html) {
  const chunks = [];
  const styleTagRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleTagRe.exec(html)) !== null) chunks.push(m[1]);
  const inlineRe = /style=["']([^"']+)["']/gi;
  while ((m = inlineRe.exec(html)) !== null) chunks.push(m[1]);
  return chunks.join('\n');
}

async function fetchExternalCss(html, pageUrl) {
  const base = new URL(pageUrl);
  const sheetUrls = [];

  // Find all <link rel="stylesheet" href="...">
  const linkRe = /<link[^>]+rel=["'][^"']*stylesheet[^"']*["'][^>]+href=["']([^"']+)["']/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    try { sheetUrls.push(new URL(m[1], base).href); } catch {}
  }
  // Also reversed attribute order
  const linkRe2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*stylesheet[^"']*["']/gi;
  while ((m = linkRe2.exec(html)) !== null) {
    try { sheetUrls.push(new URL(m[1], base).href); } catch {}
  }

  // Fetch up to 3 stylesheets in parallel, ignore failures
  const fetches = sheetUrls.slice(0, 3).map(async (sheetUrl) => {
    try {
      const res = await fetch(sheetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteRebuilder/1.0)' },
        timeout: 8000,
      });
      if (res.ok) return await res.text();
    } catch {}
    return '';
  });

  const results = await Promise.all(fetches);
  return results.join('\n');
}

function extractBrandColors(css) {
  // ── Step 1: Collect all color mentions with weighted scores ──
  const counts = {};

  const addColor = (hex, weight) => {
    if (hex && !isNeutral(hex)) counts[hex] = (counts[hex] || 0) + weight;
  };

  const toHexFromMatch = (str) => {
    const h = str.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
    if (h) return normalizeHex(h[0]);
    const r = str.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (r) return rgbToHex(+r[1], +r[2], +r[3]);
    return null;
  };

  // Named brand CSS vars — strongest signal (weight 200)
  const varRe = /--(?:primary|brand|accent|main|color|theme|highlight|key|cta|button)[^:]*:\s*([^;]+);/gi;
  let m;
  while ((m = varRe.exec(css)) !== null) { const h = toHexFromMatch(m[1]); addColor(h, 200); }

  // :root block vars — very strong (weight 80)
  const rootBlocks = css.match(/:root\s*\{([^}]+)\}/gi) || [];
  for (const block of rootBlocks) {
    const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    while ((m = hexRe.exec(block)) !== null) addColor(normalizeHex(m[0]), 80);
    const rgbRe = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi;
    while ((m = rgbRe.exec(block)) !== null) addColor(rgbToHex(+m[1], +m[2], +m[3]), 80);
  }

  // Colors on background-color of header/nav/button selectors (weight 40)
  const selectorRe = /(?:header|nav|\.header|\.nav|\.navbar|button|\.btn|\.cta|h1|h2)[^{]*\{([^}]+)\}/gi;
  while ((m = selectorRe.exec(css)) !== null) {
    const block = m[1];
    const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    while ((m = hexRe.exec(block)) !== null) addColor(normalizeHex(m[0]), 40);
  }

  // General frequency (weight 1)
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  while ((m = hexRe.exec(css)) !== null) addColor(normalizeHex(m[0]), 1);
  const rgbRe = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi;
  while ((m = rgbRe.exec(css)) !== null) addColor(rgbToHex(+m[1], +m[2], +m[3]), 1);

  // ── Step 2: Only trust colors with a meaningful confidence score ──
  // Colors only found via general frequency (score < 20) are noise — skip them.
  // A color must appear in CSS vars or named brand selectors to be trusted.
  const CONFIDENCE_THRESHOLD = 20;
  const trusted = Object.entries(counts)
    .filter(([, score]) => score >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  if (!trusted.length) return { dark: null, accent: null, mid: null, all: [], confident: false };

  const unique = deduplicateSimilarColors(trusted).slice(0, 3);

  // ── Step 3: Assign roles based on luminance ──
  const withLuminance = unique.map((hex) => ({ hex, lum: luminance(hex) }));
  withLuminance.sort((a, b) => a.lum - b.lum);

  const dark   = withLuminance[0]?.hex || null;
  const accent = withLuminance[withLuminance.length - 1]?.hex || null;
  const mid    = withLuminance.length > 2 ? withLuminance[1]?.hex : null;

  return { dark, accent, mid, all: unique, confident: true };
}

/** Remove colors that are too visually similar to one already in the list */
function deduplicateSimilarColors(hexList) {
  const result = [];
  for (const hex of hexList) {
    const tooClose = result.some((existing) => colorDistance(hex, existing) < 40);
    if (!tooClose) result.push(hex);
  }
  return result;
}

function colorDistance(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function normalizeHex(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return '#' + hex.toLowerCase();
}

function isNeutral(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Skip near-black
  if (r < 30 && g < 30 && b < 30) return true;
  // Skip near-white
  if (r > 230 && g > 230 && b > 230) return true;
  // Skip grays (R≈G≈B within 20 points)
  const avg = (r + g + b) / 3;
  if (Math.abs(r - avg) < 20 && Math.abs(g - avg) < 20 && Math.abs(b - avg) < 20) return true;
  return false;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

function extractPhones(html) {
  const m = html.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/g) || [];
  return m.map((p) => p.trim());
}

function extractEmails(html) {
  const m = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return m.filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg'));
}

function clean(str) {
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
