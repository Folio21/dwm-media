import fetch from 'node-fetch';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

/**
 * Sends a prompt to Claude and returns the raw HTML it generates.
 * Strips a ```html fenced block if Claude wraps its output in one.
 */
export async function generateDemoSiteHtml(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to server/.env');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 24000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (data.stop_reason === 'max_tokens') {
    throw new Error(
      'Demo site generation was cut off (hit the token limit) before finishing. Try again — if it keeps happening, the prompt may need to ask for a simpler page.'
    );
  }

  const text = (data.content || []).map((block) => block.text || '').join('');
  const html = extractHtml(text);

  if (!/<\/html>\s*$/i.test(html)) {
    throw new Error('Demo site generation produced incomplete HTML (missing closing </html> tag). Try again.');
  }

  return html;
}

function extractHtml(text) {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return text.trim();
}
