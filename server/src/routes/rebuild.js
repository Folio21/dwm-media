import express from 'express';
import { scrapeUrl } from '../services/scraper.js';
import { buildRebuildPrompt } from '../services/rebuildPrompt.js';
import { generateDemoSiteHtml } from '../services/anthropic.js';
import { addSite } from '../db.js';
import { buildChatWidgetHtml } from '../services/chatWidget.js';

const router = express.Router();

// POST /api/rebuild-site { url }
// Scrapes the given URL, rebuilds it as a modern SEO-optimized site via Claude,
// stores it in the sites collection, and returns the HTML + preview URL.
router.post('/rebuild-site', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  // Normalise — add https:// if the user forgot
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    // 1. Scrape existing site
    const scraped = await scrapeUrl(normalizedUrl);

    // 2. Build prompt and generate rebuilt site
    const prompt = buildRebuildPrompt(scraped);
    let html = await generateDemoSiteHtml(prompt);

    // 3. Extract business context from scraped data for the chatbot
    const bizName  = (scraped.title || scraped.h1s[0] || '').split(/[|–—\-]/)[0].trim();
    const bizPhone = scraped.phones[0] || '';
    const contentText = [scraped.title, scraped.description, ...(scraped.h1s || []), scraped.bodyText].join(' ').toLowerCase();
    let bizType = 'local business';
    if (/\b(law|attorney|legal|counsel|litigation|lawyer)\b/.test(contentText)) bizType = 'law firm';
    else if (/\b(dental|dentist|orthodont)\b/.test(contentText)) bizType = 'dental office';
    else if (/\b(medical|clinic|doctor|physician)\b/.test(contentText)) bizType = 'medical clinic';
    else if (/\b(restaurant|cafe|diner|bistro|pizza|sushi)\b/.test(contentText)) bizType = 'restaurant';
    else if (/\b(plumb|hvac|electric|roofing|contractor)\b/.test(contentText)) bizType = 'home services company';
    else if (/\b(salon|spa|beauty|hair|nail|massage)\b/.test(contentText)) bizType = 'salon & spa';
    else if (/\b(auto|car|mechanic|collision|dealership)\b/.test(contentText)) bizType = 'auto service shop';

    // Inject chat widget with business context
    const widget = buildChatWidgetHtml(0, { name: bizName, type: bizType, phone: bizPhone });
    if (html.includes('</body>')) {
      html = html.replace('</body>', widget + '\n</body>');
    } else {
      html += widget;
    }

    // 4. Store as a site record (mode: 'rebuild')
    const site = addSite({
      lead_id: null,
      mode: 'rebuild',
      source_url: normalizedUrl,
      html_content: html,
      prompt_used: prompt,
    });

    const previewUrl = `${req.protocol}://${req.get('host')}/preview/${site.id}`;
    res.json({ site_id: site.id, html: site.html_content, preview_url: previewUrl, scraped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
