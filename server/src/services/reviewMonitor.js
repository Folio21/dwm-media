/**
 * reviewMonitor.js — Background service that automatically monitors all
 * competitors within a radius for new 1-3 star reviews, generates SMS
 * outreach for each, and sends email notifications.
 *
 * Runs every 4 hours. Zero manual input required.
 */

import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import { getWatchZone, addPoachedLead, hasSeenReview, markReviewSeen, updateWatchZoneStats } from '../db.js';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const POLL_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

// Google Places trade keyword map
const TRADE_KEYWORDS = {
  'HVAC':               'HVAC air conditioning heating',
  'Plumbing':           'plumber plumbing',
  'Electrical':         'electrician electrical',
  'Roofing':            'roofing contractor',
  'Landscaping':        'landscaping lawn care',
  'Pest Control':       'pest control exterminator',
  'Pool Service':       'pool service pool cleaning',
  'General Contractor': 'general contractor remodeling',
  'Cleaning':           'cleaning service house cleaning maid',
  'Home Organizing':    'home organizer professional organizer',
};

// Geocode a text address to lat/lng
async function geocode(address, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error(`Could not geocode: ${address}`);
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}

// Find all competitors within radius using Nearby Search (paginated)
async function findCompetitors(lat, lng, radiusMiles, trade, apiKey) {
  const radiusMeters = Math.round(radiusMiles * 1609.34);
  const keyword = TRADE_KEYWORDS[trade] || trade;
  const competitors = [];
  let pageToken = null;

  for (let page = 0; page < 3; page++) { // up to 3 pages = 60 results
    let url = `${PLACES_BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;
    if (pageToken) url += `&pagetoken=${pageToken}`;

    if (pageToken) await new Promise(r => setTimeout(r, 2000)); // required delay for next_page_token

    const res = await fetch(url);
    const data = await res.json();
    if (!data.results) break;

    competitors.push(...data.results.map(p => ({
      placeId: p.place_id,
      name: p.name,
      address: p.vicinity,
      rating: p.rating,
    })));

    pageToken = data.next_page_token || null;
    if (!pageToken) break;
  }

  return competitors;
}

// Get reviews for a single place
async function getReviews(placeId, apiKey) {
  const url = `${PLACES_BASE}/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.result?.reviews || []).filter(r => r.rating <= 3 && r.text && r.text.length > 20);
}

// Build a stable dedup ID for a review
function reviewId(placeId, review) {
  const raw = `${placeId}|${review.author_name}|${review.text.slice(0, 60)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `rev_${Math.abs(hash).toString(36)}`;
}

// Generate SMS outreach via Claude
async function generateSMS(review, competitorName, clientName, clientTrade, anthropicKey) {
  const prompt = `You are writing a text message on behalf of ${clientName}, a local ${clientTrade} company.

A homeowner left this ${review.rating}-star Google review for a competitor called ${competitorName}:
"${review.text}"

Write a short, genuine SMS (under 160 characters) that:
- Briefly acknowledges their bad experience (don't name the competitor)
- Introduces ${clientName} as a better local option
- Has a clear, easy call to action
- Sounds human and friendly, NOT salesy or spammy

Return ONLY the SMS text, nothing else.`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

// Send email notification
async function sendEmail(lead, zone) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || !zone.email) return;

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });

  const stars = '⭐'.repeat(lead.rating);
  await transporter.sendMail({
    from: `"LeadSavior.ai" <${user}>`,
    to: zone.email,
    subject: `New Poached Lead -- ${lead.reviewer_name} left a ${lead.rating}-star review on ${lead.competitor_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#ef4444">New Lead Found Automatically</h2>
        <p><strong>${lead.reviewer_name}</strong> left a ${stars} review on <strong>${lead.competitor_name}</strong>:</p>
        <blockquote style="border-left:4px solid #ef4444;margin:12px 0;padding:8px 16px;color:#555;background:#fef2f2">
          "${lead.review_text}"
        </blockquote>
        <p><strong>Your ready-to-send text message:</strong></p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;font-size:15px">
          ${lead.sms}
        </div>
        <p style="margin-top:20px">
          <a href="https://www.facebook.com/search/people?q=${encodeURIComponent(lead.reviewer_name)}"
             style="background:#1877f2;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
            Find ${lead.reviewer_name} on Facebook
          </a>
        </p>
        <p style="color:#999;font-size:12px;margin-top:24px">
          LeadSavior.ai Review Poacher | Monitoring ${zone.trade} competitors within ${zone.radius_miles} miles of ${zone.location}
        </p>
      </div>
    `,
  });
}

// Main polling function -- runs once per interval
async function runPoll() {
  const zone = getWatchZone();
  if (!zone) return;

  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!placesKey || !anthropicKey) return;

  console.log(`[ReviewMonitor] Polling ${zone.trade} competitors within ${zone.radius_miles} miles of ${zone.location}`);

  try {
    let { lat, lng } = zone;
    if (!lat || !lng) {
      const coords = await geocode(zone.location, placesKey);
      lat = coords.lat;
      lng = coords.lng;
    }

    const competitors = await findCompetitors(lat, lng, zone.radius_miles, zone.trade, placesKey);
    console.log(`[ReviewMonitor] Found ${competitors.length} competitors`);

    let newLeadsCount = 0;
    let reviewsChecked = 0;

    for (const competitor of competitors) {
      await new Promise(r => setTimeout(r, 300));

      const badReviews = await getReviews(competitor.placeId, placesKey);
      reviewsChecked += badReviews.length;

      for (const review of badReviews) {
        const rid = reviewId(competitor.placeId, review);
        if (hasSeenReview(rid)) continue;

        markReviewSeen(rid);

        const sms = await generateSMS(
          review,
          competitor.name,
          zone.client_name || 'our company',
          zone.trade,
          anthropicKey
        );
        if (!sms) continue;

        const lead = addPoachedLead({
          competitor_name: competitor.name,
          competitor_place_id: competitor.placeId,
          reviewer_name: review.author_name,
          reviewer_photo: review.profile_photo_url || null,
          rating: review.rating,
          review_text: review.text,
          time_ago: review.relative_time_description,
          sms,
          fb_search: `https://www.facebook.com/search/people?q=${encodeURIComponent(review.author_name)}`,
        });

        await sendEmail(lead, zone);
        newLeadsCount++;
      }
    }

    const stats = {
      competitors_found: competitors.length,
      bad_reviews_checked: reviewsChecked,
      new_leads: newLeadsCount,
      last_scan: new Date().toISOString(),
    };

    updateWatchZoneStats(stats);

    console.log(`[ReviewMonitor] Done -- ${competitors.length} competitors, ${reviewsChecked} bad reviews checked, ${newLeadsCount} new leads`);
    return stats;
  } catch (err) {
    console.error('[ReviewMonitor] Error:', err.message);
    return null;
  }
}

// Start the background monitor
export function startReviewMonitor() {
  console.log('[ReviewMonitor] Started -- polling every 4 hours');
  runPoll();
  setInterval(runPoll, POLL_INTERVAL_MS);
}

export { runPoll };
