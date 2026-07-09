import express from 'express';
import { upsertLead, getLeadsByPlaceIds, queryLeads, getLeadById, updateLead } from '../db.js';
import { searchPlaces, checkWebsiteHealth } from '../services/googlePlaces.js';
import { findOwnerName } from '../services/ownerFinder.js';

const router = express.Router();

const VALID_STATUSES = [
  'Not called',
  'No answer',
  'Voicemail',
  'Sent pricing',
  'Callback',
  'Not interested',
  'Booked',
];

// POST /api/search-leads  { category, city }
router.post('/search-leads', async (req, res) => {
  const { category, city } = req.body || {};
  if (!category || !city) {
    return res.status(400).json({ error: 'category and city are required' });
  }

  try {
    const places = await searchPlaces(category, city);

    for (const p of places) {
      upsertLead({
        place_id: p.place_id,
        name: p.name,
        category,
        city,
        phone: p.phone,
        address: p.address,
        rating: p.rating,
        review_count: p.review_count,
        website_url: p.website_url,
        has_website: !!p.has_website,
        open_now: p.open_now,
        description: p.description,
        opening_hours: p.opening_hours,
        review_snippet: p.review_snippet,
        // Owner name extracted from Google review text — don't overwrite existing
        ...(p.owner_name ? { owner_name: p.owner_name } : {}),
      });
    }

    const placeIds = places.map((p) => p.place_id);
    const leads = getLeadsByPlaceIds(placeIds);

    res.json({ count: leads.length, leads });

    // Background: look up owner names for ALL leads without one yet
    // (website scraping + Yelp + DuckDuckGo search)
    const needsLookup = leads.filter((l) => !l.owner_name);
    if (needsLookup.length) {
      Promise.allSettled(
        needsLookup.map(async (lead) => {
          try {
            const name = await findOwnerName(lead); // pass full lead object
            if (name) updateLead(lead.id, { owner_name: name });
          } catch {
            // ignore per-lead errors
          }
        })
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads  ?city=&category=&filter=no_website|has_website|called|not_called&sort=rating|reviews
router.get('/leads', (req, res) => {
  const { city, category, filter, sort } = req.query;
  const leads = queryLeads({ city, category, filter, sort });
  res.json({ count: leads.length, leads });
});

// POST /api/leads/:id/status  { call_status, notes }
router.post('/leads/:id/status', (req, res) => {
  const { id } = req.params;
  const { call_status, notes } = req.body || {};

  if (call_status && !VALID_STATUSES.includes(call_status)) {
    return res.status(400).json({ error: `call_status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const lead = getLeadById(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const updated = updateLead(id, { call_status, notes });
  res.json({ lead: updated });
});

// POST /api/leads/:id/find-owner — on-demand owner name lookup
router.post('/leads/:id/find-owner', async (req, res) => {
  const { id } = req.params;
  const lead = getLeadById(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const name = await findOwnerName(lead); // pass full lead object — tries website, Yelp, search
    if (name) {
      const updated = updateLead(id, { owner_name: name });
      return res.json({ owner_name: name, lead: updated });
    }
    res.json({ owner_name: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/check-website — best-effort liveness/parked check
router.post('/leads/:id/check-website', async (req, res) => {
  const { id } = req.params;
  const lead = getLeadById(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (!lead.website_url) return res.json({ reachable: false, looksParked: false });

  const health = await checkWebsiteHealth(lead.website_url);
  res.json(health);
});

export default router;
