import express from 'express';
import { scrapeUrl } from '../services/scraper.js';
import { buildSocialPrompt } from '../services/socialPrompt.js';
import { generateDemoSiteHtml } from '../services/anthropic.js';
import { addSite } from '../db.js';
import { buildChatWidgetHtml } from '../services/chatWidget.js';

const router = express.Router();

function detectPlatform(url) {
  if (/instagram\.com/i.test(url)) return 'Instagram';
  if (/facebook\.com|fb\.com/i.test(url)) return 'Facebook';
  if (/twitter\.com|x\.com/i.test(url)) return 'Twitter/X';
  return 'social media';
}

// POST /api/social-to-site
// Body: { url, businessName?, phone?, email?, location?, services?, bio? }
router.post('/social-to-site', async (req, res) => {
  const { url, ...extras } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  const platform = detectPlatform(normalizedUrl);

  try {
    // Scrape what we can from the public page (og: tags, images, any visible text)
    // Social platforms block most scraping but og: meta tags often come through
    let scraped;
    try {
      scraped = await scrapeUrl(normalizedUrl);
    } catch {
      // If scrape fails entirely (login wall, etc.), continue with just user-supplied info
      scraped = { url: normalizedUrl, title: '', description: '', h1s: [], h2s: [], h3s: [], bodyText: '', phones: [], emails: [], images: [] };
    }

    // Merge scraped phone/email with user-supplied if not already provided
    if (!extras.phone && scraped.phones.length) extras.phone = scraped.phones[0];
    if (!extras.email && scraped.emails.length) extras.email = scraped.emails[0];

    const prompt = buildSocialPrompt({ scraped, platform, extras });
    let html = await generateDemoSiteHtml(prompt);

    // Extract business context for the chatbot
    const bizName  = (extras.businessName || scraped.title || scraped.h1s?.[0] || '').split(/[|–—\-]/)[0].trim();
    const bizPhone = extras.phone || scraped.phones?.[0] || '';
    const contentText = [scraped.title, scraped.description, ...(scraped.h1s || []), scraped.bodyText, extras.bio || ''].join(' ').toLowerCase();
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

    const site = addSite({
      lead_id: null,
      mode: 'social',
      source_url: normalizedUrl,
      html_content: html,
      prompt_used: prompt,
    });

    const previewUrl = `${req.protocol}://${req.get('host')}/preview/${site.id}`;
    res.json({ site_id: site.id, html: site.html_content, preview_url: previewUrl, platform, scraped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
