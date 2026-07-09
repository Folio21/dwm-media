import express from 'express';
import { getStats, getBusinessMetrics, updateBusinessMetrics } from '../db.js';

const router = express.Router();

// GET /api/stats — aggregate DB counts + manual business metrics
router.get('/stats', (req, res) => {
  res.json({
    stats:   getStats(),
    metrics: getBusinessMetrics(),
  });
});

// POST /api/stats/metrics — save manually entered revenue/spend + client list
router.post('/stats/metrics', (req, res) => {
  const updated = updateBusinessMetrics(req.body);
  res.json({ metrics: updated });
});

export default router;
