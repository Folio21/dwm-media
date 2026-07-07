import express from 'express';
import { getLeadById, addSite, getSiteById } from '../db.js';
import { buildDemoPrompt } from '../services/demoPrompt.js';
import { generateDemoSiteHtml } from '../services/anthropic.js';
import { getDemoSiteImages } from '../services/unsplash.js';
import { buildChatWidgetHtml } from '../services/chatWidget.js';

const router = express.Router();

// POST /api/leads/:id/build-demo-site — generates a pitch demo for a lead
router.post('/leads/:id/build-demo-site', async (req, res) => {
  const { id } = req.params;
  const lead = getLeadById(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const images = await getDemoSiteImages(lead.category);
    const prompt = buildDemoPrompt(lead, images);
    let html = await generateDemoSiteHtml(prompt);

    // Inject a live AI chat widget powered by /api/chat
    const widget = buildChatWidgetHtml(lead.id);
    if (html.includes('</body>')) {
      html = html.replace('</body>', widget + '\n</body>');
    } else {
      html += widget;
    }

    const site = addSite({
      lead_id: lead.id,
      mode: 'demo',
      html_content: html,
      prompt_used: prompt,
    });

    const previewUrl = `${req.protocol}://${req.get('host')}/preview/${site.id}`;
    res.json({ site_id: site.id, html: site.html_content, preview_url: previewUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sites/:id — fetch a previously generated site's metadata + html
router.get('/sites/:id', (req, res) => {
  const site = getSiteById(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json({ site });
});

export default router;
