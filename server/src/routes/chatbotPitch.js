import express from 'express';
import { getLeadById, addSite } from '../db.js';
import { buildChatbotPitchHtml } from '../services/chatbotPitch.js';

const router = express.Router();

// POST /api/leads/:id/build-chatbot-pitch
// Generates a standalone chatbot pitch page (no AI generation needed — it IS the AI)
router.post('/leads/:id/build-chatbot-pitch', (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const html = buildChatbotPitchHtml(lead);

    const site = addSite({
      lead_id: lead.id,
      mode: 'chatbot_pitch',
      html_content: html,
    });

    const previewUrl = `${req.protocol}://${req.get('host')}/preview/${site.id}`;
    res.json({ site_id: site.id, html: site.html_content, preview_url: previewUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
