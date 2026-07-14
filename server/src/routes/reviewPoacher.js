import { Router } from 'express';
import { saveWatchZone, getWatchZone, deleteWatchZone, getPoachedLeads, updateWatchZoneStats } from '../db.js';
import { runPoll } from '../services/reviewMonitor.js';

const router = Router();

router.post('/review-poacher/watch', async (req, res) => {
  const { location, trade, radius_miles, client_name, email } = req.body;
  if (!location || !trade || !radius_miles) {
    return res.status(400).json({ error: 'location, trade, and radius_miles are required' });
  }
  const zone = saveWatchZone({
    location, trade,
    radius_miles: Number(radius_miles),
    client_name: client_name || '',
    email: email || '',
    lat: null, lng: null,
  });
  runPoll().catch(err => console.error('[ReviewPoacher] poll error:', err.message));
  res.json({ ok: true, zone });
});

router.get('/review-poacher/status', (req, res) => {
  const zone = getWatchZone();
  res.json({ zone: zone || null });
});

router.delete('/review-poacher/watch', (req, res) => {
  deleteWatchZone();
  res.json({ ok: true });
});

router.get('/review-poacher/leads', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const leads = getPoachedLeads(limit);
  res.json({ leads });
});

router.post('/review-poacher/scan', async (req, res) => {
  const zone = getWatchZone();
  if (!zone) return res.status(400).json({ error: 'No watch zone configured' });
  try {
    const stats = await runPoll();
    res.json({ ok: true, stats: stats || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
