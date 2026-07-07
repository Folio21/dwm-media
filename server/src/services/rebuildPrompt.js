/**
 * Detects business industry from scraped content and returns an appropriate
 * fallback color palette when brand colors can't be extracted from the CSS.
 */
function detectFallbackPalette(scraped) {
  const text = [scraped.title, scraped.description, ...(scraped.h1s || []), scraped.bodyText]
    .join(' ')
    .toLowerCase();

  if (/\b(law|attorney|legal|counsel|litigation|lawyer|esquire|llp|pllc)\b/.test(text)) {
    return { dark: '#1a2340', accent: '#c9a84c', bg: '#f5f3ee', label: 'law firm: dark navy, gold, cream' };
  }
  if (/\b(dental|dentist|orthodont|tooth|teeth|smile|oral)\b/.test(text)) {
    return { dark: '#0d3b6e', accent: '#00a8e8', bg: '#f0f8ff', label: 'dental: deep blue, sky blue, alice blue' };
  }
  if (/\b(medical|clinic|doctor|physician|health|urgent care|hospital|chiropractic)\b/.test(text)) {
    return { dark: '#1a4b6e', accent: '#2ecc71', bg: '#f0f9f4', label: 'medical: teal-blue, green, light' };
  }
  if (/\b(restaurant|food|cafe|diner|bistro|pizza|sushi|barbecue|grill|kitchen)\b/.test(text)) {
    return { dark: '#2c1810', accent: '#e05c1e', bg: '#fff8f0', label: 'restaurant: dark brown, warm orange, cream' };
  }
  if (/\b(plumb|hvac|electric|roofing|contractor|construction|remodel|handyman)\b/.test(text)) {
    return { dark: '#1c2b3a', accent: '#f5a623', bg: '#ffffff', label: 'trades: dark slate, orange-gold, white' };
  }
  if (/\b(salon|spa|beauty|hair|nail|massage|wellness)\b/.test(text)) {
    return { dark: '#2d1f3d', accent: '#c77dff', bg: '#faf5ff', label: 'beauty: deep purple, lavender, soft white' };
  }
  if (/\b(auto|car|vehicle|mechanic|tire|collision|dealership)\b/.test(text)) {
    return { dark: '#1a1a2e', accent: '#e63946', bg: '#ffffff', label: 'auto: dark, red, white' };
  }
  // Default professional
  return { dark: '#1a2340', accent: '#2563eb', bg: '#ffffff', label: 'default: navy, blue, white' };
}

/**
 * Builds the Claude prompt for the Rebuild Site feature.
 * Takes scraped content from an existing site and asks Claude to
 * rebuild it as a modern, SEO-optimized single-page site.
 */
export function buildRebuildPrompt(scraped) {
  const { url, title, description, h1s, h2s, h3s, bodyText, phones, emails, images = [], logo, brandColors = [] } = scraped;

  const logoBlock = logo
    ? `BRAND LOGO: Use this logo image in the navigation bar and footer: ${logo}\nDisplay it as an <img> with appropriate max-height (e.g. 40-50px in nav). Do not replace it with text.`
    : null;

  // For professional services (law, medical, etc.), always force an industry-appropriate
  // palette — extracted CSS colors are often from widgets/sliders and look unprofessional.
  const palette = detectFallbackPalette(scraped);
  const forceIndustryPalette = /\b(law|attorney|legal|counsel|litigation|lawyer|dental|dentist|medical|clinic|doctor|physician)\b/i
    .test([title, description, ...(h1s || []), bodyText].join(' '));

  const colorBlock = (!forceIndustryPalette && brandColors?.confident && brandColors?.all?.length)
    ? `BRAND COLORS — extracted with high confidence from the real site's CSS. Use these exactly and do not introduce any other colors:\n${brandColors.dark ? `- Dark/background: ${brandColors.dark} → nav, footer, dark section backgrounds` : ''}\n${brandColors.accent ? `- Accent/CTA: ${brandColors.accent} → buttons, badges, highlights, links` : ''}\n${brandColors.mid ? `- Secondary: ${brandColors.mid} → section backgrounds, borders, secondary UI elements` : ''}`
    : `BRAND COLORS — use ONLY these three colors and no others (${palette.label}):\n- Dark/nav/footer: ${palette.dark}\n- Accent/buttons/CTA: ${palette.accent}\n- Content background: ${palette.bg}\nDo NOT introduce any other colors. Do not add red, orange, bright green, or any color not listed above.`;

  const imageBlock = images.length
    ? `IMAGES FROM THE ORIGINAL SITE:\nUse these real image URLs directly as <img src="..."> in the rebuilt page. Place them where they make sense (hero, gallery, about, services). Do not invent image URLs or use placeholder services — only use the ones listed here:\n${images.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
    : `No content images were found on the original site — rely on color, typography, and layout instead.`;

  const contentBlock = [
    title       ? `Page title: ${title}` : null,
    description ? `Meta description: ${description}` : null,
    h1s.length  ? `Main headings (H1): ${h1s.join(' | ')}` : null,
    h2s.length  ? `Section headings (H2): ${h2s.join(' | ')}` : null,
    h3s.length  ? `Sub-headings (H3): ${h3s.join(' | ')}` : null,
    phones.length ? `Phone numbers found: ${phones.join(', ')}` : null,
    emails.length ? `Emails found: ${emails.join(', ')}` : null,
    bodyText    ? `Body text content (use this for services, about, and copy):\n${bodyText}` : null,
    logoBlock,
    colorBlock,
    imageBlock,
  ].filter(Boolean).join('\n\n');

  return `You are rebuilding an existing business website to make it modern, fast, and conversion-optimized.

Original site URL: ${url}

Here is the content extracted from their current site — use this as your source of truth for the business name, services, contact info, and copy. Do not invent details that aren't present:

${contentBlock}

Rebuild this as a complete, modern, single-page website with the following requirements:

DESIGN:
- Mobile-first, fully responsive layout
- Use the brand colors above — do NOT substitute a generic palette
- If a logo was provided, always show it in the nav and footer
- Strong visual hierarchy — headline, subheadline, CTA above the fold
- No emoji anywhere on the page — use inline SVGs or CSS shapes for icons

SECTIONS to include (using only real content from above):
1. Navigation bar with business name and phone number / CTA button
2. Hero section — powerful headline, subheadline, primary CTA (call now or contact)
3. Services section — use any services mentioned in the content
4. Why choose us / trust signals section
5. About section — use any real info found; if none, keep it brief with just name and location
6. Contact section — use real phone, email, address if found
7. Footer

SEO:
- Proper <title> tag using business name and primary service + city if known
- Meta description tag (compelling, under 160 chars)
- Correct semantic HTML: <header>, <main>, <section>, <footer>, <nav>, <article> where appropriate
- One clear <h1>, logical <h2> hierarchy
- All images have descriptive alt text
- Schema.org LocalBusiness JSON-LD in a <script type="application/ld+json"> block using real business data

TECHNICAL:
- All CSS inline in a <style> tag — no external stylesheets
- No external dependencies of any kind (no CDN links, no Google Fonts, no icon libraries)
- Use system font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- No JavaScript required for core content — page must render without JS
- Any contact forms are visual mockups only (no action attribute, no real submission)

Keep the CSS efficient — prioritize completing all sections over decorative polish. Do not add demo notices, watermarks, or disclaimers anywhere on the page.

Return ONLY the complete HTML document — no explanation before or after. Start with <!DOCTYPE html>.`;
}
