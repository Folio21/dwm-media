import { Router } from 'express';
import { addMeeting, getAllMeetings, updateMeeting } from '../db.js';

const router = Router();

// GET /api/meetings — list all sales meetings
router.get('/meetings', (req, res) => {
  try {
    res.json({ meetings: getAllMeetings() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meetings — log a new booked meeting
router.post('/meetings', (req, res) => {
  try {
    const { lead_name, owner_name, phone, date, time, type, booked_by, notes } = req.body;
    if (!lead_name || !date) {
      return res.status(400).json({ error: 'lead_name and date are required' });
    }
    const meeting = addMeeting({ lead_name, owner_name, phone, date, time, type, booked_by, notes });
    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/meetings/:id — update status or notes
router.patch('/meetings/:id', (req, res) => {
  try {
    const meeting = updateMeeting(req.params.id, req.body);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
