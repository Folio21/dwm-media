// Vapi.ai integration — voice AI receptionist
// Docs: https://docs.vapi.ai
//
// Required env vars:
//   VAPI_API_KEY  — from app.vapi.ai → Account → API Keys
//
// Each client gets:
//   1. A Vapi assistant (trained on their business)
//   2. A Vapi phone number (provisioned by Vapi, ~$2/mo)
//      → client forwards their business line to this number

const VAPI_BASE = 'https://api.vapi.ai';

function headers() {
  return {
    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function vapiRequest(method, path, body) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Build the system prompt for this business — voice-optimized (no markdown)
function buildSystemPrompt(lead) {
  const name     = lead.name || 'this business';
  const cat      = lead.category || 'service business';
  const city     = lead.city || 'the local area';
  const phone    = lead.phone || null;
  const owner    = lead.owner_name || null;
  const services = lead.services || null; // optional array

  return `You are the AI receptionist for ${name}, a ${cat} in ${city}. You answer calls when the owner is unavailable — out on a job, with a customer, or after hours. Your job is to make sure no caller gets ignored and every lead gets captured.

Speak naturally and conversationally — this is a voice call, so keep your sentences short and clear. Never use bullet points, asterisks, or lists when speaking.

About ${name}:
${owner ? `- Owner: ${owner}` : ''}
- Type of business: ${cat} in ${city}
${phone ? `- Main number: ${phone}` : ''}
${services ? `- Services: ${services}` : ''}

Your responsibilities:
1. Greet the caller warmly and ask how you can help
2. Answer common questions about services, availability, and pricing (say pricing varies by job and they can get a free estimate)
3. Book appointments — collect their name, phone number, preferred date and time, and what they need help with
4. If someone has an emergency (burst pipe, no AC in summer, etc.), acknowledge urgency and let them know the team will call back as soon as possible
5. If you cannot answer something, take their name and number and let them know someone will call them back

When booking an appointment, always confirm: caller name, callback number, date, time, and what the job is.

Be friendly, professional, and brief. Most callers just want a quick answer or to book a job — get them there fast.`.trim();
}

// ── Create a Vapi assistant for a lead ──────────────────────────────────────
export async function createAssistant(lead, webhookUrl) {
  const assistant = await vapiRequest('POST', '/assistant', {
    name: `${lead.name} Receptionist`,
    model: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      messages: [{ role: 'system', content: buildSystemPrompt(lead) }],
      temperature: 0.6,
      tools: [
        {
          type: 'function',
          function: {
            name: 'book_appointment',
            description: 'Book an appointment for the caller. Call this when a caller wants to schedule a job or service.',
            parameters: {
              type: 'object',
              properties: {
                caller_name:  { type: 'string', description: 'Full name of the caller' },
                caller_phone: { type: 'string', description: 'Callback phone number' },
                date:         { type: 'string', description: 'Preferred date (e.g. "Monday July 14th")' },
                time:         { type: 'string', description: 'Preferred time (e.g. "10am")' },
                notes:        { type: 'string', description: 'What the job is about' },
              },
              required: ['caller_name', 'caller_phone', 'date', 'notes'],
            },
          },
          server: { url: `${webhookUrl}/api/vapi/tool/${lead.id}/book-appointment` },
        },
      ],
    },
    voice: {
      provider: 'openai',
      voiceId: 'nova',   // natural-sounding female voice, no extra credentials needed
    },
    firstMessage: `Hey, thanks for calling ${lead.name || 'us'} — you've reached our answering service. The team is currently unavailable but I can help you schedule something or take a message. What can I do for you?`,
    endCallMessage: 'Thanks for calling. Have a great day!',
    serverUrl: `${webhookUrl}/api/vapi/webhook`,
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || '',
    recordingEnabled: true,
    hipaaEnabled: false,
  });

  return assistant;
}

// ── Provision a phone number and link it to an assistant ────────────────────
export async function provisionPhoneNumber(assistantId) {
  // Try several area codes — availability changes; Vapi will reject unavailable ones
  const candidates = ['435', '316', '603', '512', '754', '561', '321', '813', '904'];
  for (const areaCode of candidates) {
    try {
      return await vapiRequest('POST', '/phone-number', {
        provider: 'vapi',
        assistantId,
        numberDesiredAreaCode: areaCode,
      });
    } catch (err) {
      if (err.message.includes('not available') || err.message.includes('area code')) continue;
      throw err; // unexpected error — stop immediately
    }
  }
  throw new Error('No phone numbers available right now — try again in a few minutes');
}

// ── Delete assistant and release phone number ────────────────────────────────
export async function deleteAssistant(assistantId) {
  try { await vapiRequest('DELETE', `/assistant/${assistantId}`); } catch {}
}

export async function releasePhoneNumber(phoneNumberId) {
  try { await vapiRequest('DELETE', `/phone-number/${phoneNumberId}`); } catch {}
}

// ── Fetch recent calls for an assistant ─────────────────────────────────────
export async function getRecentCalls(assistantId, limit = 20) {
  try {
    const calls = await vapiRequest('GET', `/call?assistantId=${assistantId}&limit=${limit}`);
    return Array.isArray(calls) ? calls : (calls.results || []);
  } catch {
    return [];
  }
}
