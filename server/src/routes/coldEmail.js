import { Router } from 'express';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { getLeadById } from '../db.js';
import { scrapeEmailsFromSite } from '../services/emailScraper.js';

const router = Router();
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-haiku-4-5-20251001';

function makeTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// POST /api/leads/:id/cold-email — generate email copy
router.post('/leads/:id/cold-email', async (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const owner = lead.owner_name ? `the owner (${lead.owner_name})` : 'the owner';
  const pitch = lead.has_website
    ? 'an AI chatbot that books appointments and captures leads 24/7 directly on their existing website'
    : 'a professional website plus an AI chatbot that books appointments and captures leads 24/7';

  const prompt = `Write a short, genuine cold follow-up email from David at DWM Media to ${owner} of ${lead.name}, a ${lead.category || 'local business'} in ${lead.city || 'the area'}.

Context: David called but got no answer. This email is the follow-up. He is pitching ${pitch}.

Requirements:
- 3–4 short paragraphs max, under 120 words total
- Casual and direct — not salesy or corporate
- Reference their specific business type naturally (${lead.category || 'local business'})
- One clear call to action: reply or schedule a quick call
- Sign off as David, DWM Media
- Return ONLY a JSON object with two fields: "subject" (the email subject line) and "body" (the full email body, plain text with newlines)
- No markdown, no code fences, just raw JSON`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: `API error: ${response.status} ${text.slice(0, 100)}` });
    }

    const data    = await response.json();
    const content = (data.content || []).map((b) => b.text || '').join('').trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Model did not return valid JSON', raw: content });

    const email = JSON.parse(jsonMatch[0]);
    res.json({ subject: email.subject, body: email.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id/find-email — scrape business website for email addresses
router.get('/leads/:id/find-email', async (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (!lead.website) {
    return res.json({ found: [], guessed: [], message: 'No website on file for this lead' });
  }

  try {
    const result = await scrapeEmailsFromSite(lead.website);
    res.json(result); // { found: [], guessed: [] }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/send-cold-email — send via Gmail
router.post('/leads/:id/send-cold-email', async (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  const transporter = makeTransporter();
  if (!transporter) {
    return res.status(500).json({ error: 'GMAIL_USER or GMAIL_APP_PASSWORD not set in environment' });
  }

  try {
    await transporter.sendMail({
      from: `"David @ DWM Media" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: body,
    });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/send-text — send SMS via Twilio
router.post('/leads/:id/send-text', async (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { to, body } = req.body || {};
  const phone = to || lead.phone;
  if (!phone) return res.status(400).json({ error: 'No phone number available for this lead' });
  if (!body)  return res.status(400).json({ error: 'body is required' });

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return res.status(500).json({ error: 'Twilio env vars not set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)' });
  }

  try {
    const client  = twilio(sid, token);
    const message = await client.messages.create({ from, to: phone, body });
    res.json({ sent: true, sid: message.sid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
