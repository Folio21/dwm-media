// Prompt templates from the build spec, Section 4 ("Build Demo Website").
// These are pitch artifacts, not deliverables — forms/booking/chat widgets
// must stay visual-only. The honesty constraint (never delivered as a real
// site) is enforced by the app, not the prompt: only Phase 4's "Build Real
// Website" button — gated to client records — produces anything functional.

export function buildDemoPrompt(lead, images = {}) {
  const { name, category, city, phone, address, rating, has_website,
          owner_name, description, opening_hours, review_snippet, review_count } = lead;
  const ratingLine = rating ? rating : '4.5';
  const phoneLine = phone || 'phone number on file';
  const addressLine = address || 'address on file';
  const { hero, secondary } = images;

  // Build the About section facts — only include lines where real data exists
  const aboutFacts = [
    owner_name   ? `Owner: ${owner_name}` : null,
    description  ? `Business description: ${description}` : null,
    opening_hours?.length ? `Opening hours:\n${opening_hours.join('\n')}` : null,
    rating && review_count ? `Rating: ${rating} stars based on ${review_count} reviews` : null,
    review_snippet ? `Customer review snippet: "${review_snippet}"` : null,
  ].filter(Boolean);
  const aboutSection = aboutFacts.length
    ? `Include a real About section using ONLY these verified facts (do not invent anything else):\n${aboutFacts.join('\n')}`
    : `Include an About section placeholder with just the heading "About" and the business name and location — do not invent any details.`;

  const base = !has_website
    ? `Build a modern, mobile-first landing page for "${name}", a ${category} business in ${city}. This business currently has no website — this is a pitch-ready demo to show them what they're missing. Make it look premium, trustworthy, and conversion-focused. Include: hero section with a clear headline and CTA (call now / book now), services list, why-choose-us section, star rating badge if rating is ${ratingLine}+, contact info (${phoneLine}, ${addressLine}), and a contact/booking form. Use a color palette appropriate for ${category} businesses. Keep it to a single page.`
    : `Build a modern landing page mockup for "${name}", a ${category} business in ${city}, to demonstrate what an upgraded site + AI chatbot could look like. Include a hero section, an embedded-style chat widget mockup in the corner, services list, and contact info (${phoneLine}, ${addressLine}). Make it look like a clear upgrade over a typical small-business website.`;

  const imageInstructions = hero || secondary
    ? `\n\nUse these real photo URLs as <img> sources (do not invent your own image URLs, do not use placeholder.com or similar):\n${hero ? `- Hero/banner image: ${hero}` : ''}\n${secondary ? `- Secondary supporting image (e.g. in the why-us or services section): ${secondary}` : ''}\nGive images proper alt text, object-fit: cover, and rounded corners/styling consistent with the rest of the page.`
    : `\n\nNo real photos are available for this build — do not invent fake image URLs or use placeholder services; rely on color, typography, and layout instead.`;

  return `${base}${imageInstructions}

${aboutSection}

Do not use any emoji anywhere in the page (not in headings, icons, badges, buttons, nav, or footer). For icons, use simple inline SVGs, CSS shapes, or plain text/symbols (e.g. typographic characters like ★ for ratings) instead — keep the look clean and professional, not decorative.

Keep the CSS efficient and to the point — avoid excessive decorative flourishes, redundant rules, or elaborate animations. Prioritize finishing the full page (all sections, full body content) over polishing every visual detail.

Any forms, booking widgets, or chat widgets you include must be visual mockups that do not submit or send anything anywhere real. Do NOT add any demo notice, watermark, disclaimer, or badge anywhere on the page — not in the footer, not in a banner, nowhere. The page should look exactly like a real live website with no indication it is a demo.

Return ONLY the complete HTML document — inline <style>, no external dependencies, no explanation or commentary before or after. The response should start with <!DOCTYPE html> and contain nothing else.`;
}
