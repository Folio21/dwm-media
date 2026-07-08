import express from 'express';
import fetch from 'node-fetch';
import { getLeadById } from '../db.js';

const router = express.Router();
const API_URL = 'https://api.anthropic.com/v1/messages';
// Use Haiku for fast, cheap chat responses
const CHAT_MODEL = 'claude-haiku-4-5-20251001';

function buildGenericSystemPrompt({ bizName, bizType, bizPhone } = {}) {
  const name = bizName || 'this business';
  const type = bizType || 'local business';
  return [
    `You are a helpful, friendly AI assistant for ${name}, a ${type}.`,
    'Your job is to help customers — answer questions about services, pricing, hours, and how to book an appointment.',
    '',
    'Guidelines:',
    '  - Keep replies concise — 1 to 3 sentences unless the customer needs detail.',
    '  - For pricing questions: say it depends on the job and offer a free consultation or quote.',
    '  - For scheduling: tell them they can book an appointment RIGHT NOW using the Book Appointment button in this chat. Never say someone will call them back. The whole point is they self-book instantly.',
    '  - Never invent specific prices, employee names, or availability.',
    '  - Always be warm and professional.',
    '  - IMPORTANT: Write in plain conversational text only. Never use markdown formatting like **bold**, *italics*, bullet points, or headers.',
    bizPhone ? `  - If someone wants to call right now, give them the phone number: ${bizPhone}.` : null,
  ].filter(Boolean).join('\n');
}

function buildSystemPrompt(lead, ctx = {}) {
  if (!lead) return buildGenericSystemPrompt(ctx);

  const hours = Array.isArray(lead.opening_hours)
    ? lead.opening_hours.join('; ')
    : lead.opening_hours || null;

  const lines = [
    `You are a helpful, friendly AI assistant for ${lead.name}, a ${lead.category || 'local business'}${lead.city ? ` in ${lead.city}` : ''}.`,
    `Your job is to help customers on the website — answer questions about services, pricing, hours, and how to book an appointment.`,
    ``,
    `Business details:`,
    lead.phone      ? `  Phone: ${lead.phone}`                          : null,
    lead.address    ? `  Address: ${lead.address}`                      : null,
    hours           ? `  Hours: ${hours}`                               : null,
    lead.rating     ? `  Rating: ${lead.rating}★ (${lead.review_count || 0} reviews)` : null,
    lead.owner_name ? `  Owner: ${lead.owner_name}`                    : null,
    ``,
    `Guidelines:`,
    `  - Keep replies concise — 1 to 3 sentences unless the customer needs detail.`,
    `  - For pricing questions: say it depends on the specific situation and offer a free consultation.`,
    `  - For scheduling: tell the customer they can book an appointment RIGHT NOW using the Book Appointment button in this chat. Never say someone will call them back or be in touch. They can self-book instantly.`,
    `  - For emergencies (pipe burst, AC out in summer heat, etc.): acknowledge the urgency and give the phone number immediately.`,
    `  - Never invent specific prices, employee names, or availability.`,
    `  - IMPORTANT: Write in plain conversational text only. Never use markdown formatting like **bold**, *italics*, bullet points, or headers.`,
    `  - Always be warm and professional — you represent a local small business.`,
    `  - If someone wants to call right now, give them the phone number: ${lead.phone || 'the number listed on this page'}.`,
  ].filter(Boolean);

  return lines.join('\n');
}

// POST /api/chat
// Body: { lead_id: number, messages: [{role: 'user'|'assistant', content: string}] }
router.post('/chat', async (req, res) => {
  const { lead_id, messages, biz_name, biz_type, biz_phone } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // lead_id 0 or missing = rebuild/social site with no lead record — use generic prompt
  const lead = lead_id ? getLeadById(lead_id) : null;
  const bizCtx = { bizName: biz_name, bizType: biz_type, bizPhone: biz_phone };

  // Anthropic requires messages to alternate and start with 'user'.
  // Clean the array to guarantee that.
  const cleanMessages = [];
  for (const m of messages) {
    if (!m.role || !m.content) continue;
    if (cleanMessages.length === 0 && m.role !== 'user') continue; // skip leading assistant
    const last = cleanMessages[cleanMessages.length - 1];
    if (last && last.role === m.role) {
      last.content += '\n' + m.content; // merge consecutive same-role
    } else {
      cleanMessages.push({ role: m.role, content: String(m.content) });
    }
  }

  if (!cleanMessages.length || cleanMessages[0].role !== 'user') {
    return res.status(400).json({ error: 'First message must be from user' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: 400,
        system: buildSystemPrompt(lead, bizCtx),
        messages: cleanMessages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[chat] API error:', response.status, text);
      return res.status(500).json({ error: `API error (${response.status})` });
    }

    const data = await response.json();
    const content = (data.content || []).map((b) => b.text || '').join('').trim();

    res.json({ role: 'assistant', content });
   } catch (err) {
    console.error('[chat]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
