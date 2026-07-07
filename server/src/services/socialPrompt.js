/**
 * Detects a sensible fallback color palette from scraped + user-supplied content.
 * Mirrors the logic in rebuildPrompt.js so both features behave consistently.
 */
function detectFallbackPalette(text = '') {
  const t = text.toLowerCase();
  if (/\b(law|attorney|legal|counsel|litigation|lawyer|esquire|llp|pllc)\b/.test(t))
    return { dark: '#1a2340', accent: '#c9a84c', bg: '#f5f3ee', label: 'law firm: dark navy, gold, cream' };
  if (/\b(dental|dentist|orthodont|tooth|teeth|smile|oral)\b/.test(t))
    return { dark: '#0d3b6e', accent: '#00a8e8', bg: '#f0f8ff', label: 'dental: deep blue, sky blue' };
  if (/\b(medical|clinic|doctor|physician|health|urgent care|chiropractic)\b/.test(t))
    return { dark: '#1a4b6e', accent: '#2ecc71', bg: '#f0f9f4', label: 'medical: teal-blue, green' };
  if (/\b(restaurant|food|cafe|diner|bistro|pizza|sushi|barbecue|grill|kitchen)\b/.test(t))
    return { dark: '#2c1810', accent: '#e05c1e', bg: '#fff8f0', label: 'restaurant: dark brown, warm orange' };
  if (/\b(plumb|hvac|electric|roofing|contractor|construction|remodel|handyman)\b/.test(t))
    return { dark: '#1c2b3a', accent: '#f5a623', bg: '#ffffff', label: 'trades: dark slate, orange-gold' };
  if (/\b(salon|spa|beauty|hair|nail|massage|wellness)\b/.test(t))
    return { dark: '#2d1f3d', accent: '#c77dff', bg: '#faf5ff', label: 'beauty: deep purple, lavender' };
  if (/\b(auto|car|vehicle|mechanic|tire|collision|dealership)\b/.test(t))
    return { dark: '#1a1a2e', accent: '#e63946', bg: '#ffffff', label: 'auto: dark, red, white' };
  return { dark: '#1a2340', accent: '#2563eb', bg: '#ffffff', label: 'default: navy, blue, white' };
}

/**
 * Builds the Claude prompt for the Social Media → Website feature.
 * Combines scraped Open Graph data with user-supplied details.
 */
export function buildSocialPrompt({ scraped, platform, extras }) {
  const { title, description, images = [], logo, brandColors = [] } = scraped;
  const { businessName, phone, email, location, services, bio } = extras;

  // Resolve best name and description from scraped + user input
  const name    = businessName || title || 'the business';
  const about   = bio || description || '';

  const logoBlock = logo
    ? `BRAND LOGO: Place this in the navigation bar and footer: ${logo}\nDisplay as an <img> with max-height ~45px in the nav. Study the logo's colors and use them as your primary palette if no colors are specified below.`
    : null;

  // Social pages almost never have extractable CSS, so brandColors.confident is usually false.
  // Always use a strict palette so Claude can't invent pink, purple, or random accent colors.
  const contentText = [name, about, services, bio, title, description].filter(Boolean).join(' ');
  const palette = detectFallbackPalette(contentText);

  const colorBlock = brandColors?.confident && brandColors?.all?.length
    ? `BRAND COLORS — use ONLY these three colors and absolutely no others:\n${brandColors.dark ? `- Dark/nav/footer: ${brandColors.dark}` : ''}\n${brandColors.accent ? `- Accent/buttons/CTA: ${brandColors.accent}` : ''}\n${brandColors.mid ? `- Content background: ${brandColors.mid}` : ''}\nDo NOT add pink, purple, red, orange, or any color not listed above.`
    : `BRAND COLORS — use ONLY these three colors and absolutely no others (${palette.label}):\n- Dark/nav/footer: ${palette.dark}\n- Accent/buttons/CTA: ${palette.accent}\n- Content background: ${palette.bg}\nDo NOT add pink, purple, teal, or any color not listed above. No exceptions.`;

  const imageBlock = images.length
    ? `IMAGES FROM THE ${platform.toUpperCase()} PROFILE:\nUse these directly as <img src="..."> — place the first one as the hero image, others in gallery or about sections:\n${images.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
    : `No profile images were captured — rely on color, typography, and layout instead.`;

  const detailsBlock = [
    name        ? `Business name: ${name}` : null,
    about       ? `About / bio: ${about}` : null,
    location    ? `Location: ${location}` : null,
    phone       ? `Phone: ${phone}` : null,
    email       ? `Email: ${email}` : null,
    services    ? `Services / offerings:\n${services}` : null,
    logoBlock,
    colorBlock,
    imageBlock,
  ].filter(Boolean).join('\n\n');

  return `You are building a brand-new professional website for a business that currently only has a ${platform} page and no website.

Here is everything known about this business:

${detailsBlock}

Build a complete, modern, single-page website with:

DESIGN:
- Mobile-first, fully responsive
- If brand colors were provided above, use them as the primary palette — do not substitute generic colors
- If a logo was provided above, display it in the nav and footer
- Strong visual hierarchy — business name, what they do, and a CTA above the fold
- No emoji anywhere — use inline SVGs or CSS shapes for any icons needed

SECTIONS:
1. Navigation — business name + phone/CTA button if phone is known
2. Hero — compelling headline (written by you based on what they do), subheadline, call/contact CTA
3. Services/Offerings — based on the services list or bio; if not specified, infer from context and mark clearly
4. About — use the bio and any real details; keep it authentic, do not pad with fluff
5. Contact — phone, email, location if available; include a visual contact form mockup
6. Footer — business name, social link back to their ${platform} page (${scraped.url})

SEO:
- <title> tag: business name + primary service/category
- Meta description (compelling, under 160 chars)
- Semantic HTML: <header>, <main>, <section>, <footer>
- One <h1>, logical <h2> structure
- Schema.org LocalBusiness JSON-LD block with all known real data
- All images have descriptive alt text

TECHNICAL:
- All CSS in a single inline <style> tag
- No external dependencies — no CDN, no Google Fonts, no icon libraries
- System font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Contact forms are visual mockups only — no real form submission
- Do not add any demo notices, watermarks, or disclaimers anywhere

Keep CSS efficient. Finish all sections before polishing. Return ONLY the complete HTML document starting with <!DOCTYPE html>.`;
}
