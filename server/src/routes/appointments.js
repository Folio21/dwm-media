import express from 'express';
import {
  getLeadById,
  addAppointment,
  getAppointmentsByLeadId,
  getAllAppointments,
  updateAppointment,
  addChatContact,
  getAllChatContacts,
} from '../db.js';

const router = express.Router();

// POST /api/leads/:id/appointments — book an appointment
router.post('/leads/:id/appointments', (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { name, phone, date, date_iso, time, notes } = req.body || {};
  if (!name || !date || !time) {
    return res.status(400).json({ error: 'name, date, and time are required' });
  }

  const appointment = addAppointment({
    lead_id: lead.id,
    lead_name: lead.name,
    customer_name: name,
    customer_phone: phone || '',
    date,          // human readable: "Thursday, July 10, 2026"
    date_iso,      // ISO string for sorting: "2026-07-10"
    time,          // "10:00 AM"
    notes: notes || '',
  });

  res.json({ appointment });
});

// GET /api/leads/:id/appointments
router.get('/leads/:id/appointments', (req, res) => {
  res.json({ appointments: getAppointmentsByLeadId(req.params.id) });
});

// GET /api/appointments — all appointments (for the dashboard panel)
router.get('/appointments', (req, res) => {
  res.json({ appointments: getAllAppointments() });
});

// POST /api/appointments — general booking (used by rebuild/social demo sites with no lead record)
router.post('/appointments', (req, res) => {
  const { name, phone, date, date_iso, time, notes } = req.body || {};
  if (!name || !date || !time) {
    return res.status(400).json({ error: 'name, date, and time are required' });
  }

  const appointment = addAppointment({
    lead_id: null,
    lead_name: 'Demo Site',
    customer_name: name,
    customer_phone: phone || '',
    date,
    date_iso,
    time,
    notes: notes || '',
  });

  res.json({ appointment });
});

// PATCH /api/appointments/:id — update status (confirm / cancel)
router.patch('/appointments/:id', (req, res) => {
  const appt = updateAppointment(req.params.id, req.body);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ appointment: appt });
});

// POST /api/chat-contacts — log a first contact from the chatbot widget (public)
router.post('/chat-contacts', (req, res) => {
  const { lead_id, lead_name, customer_name, customer_phone } = req.body || {};
  if (!customer_name) return res.status(400).json({ error: 'customer_name required' });
  const contact = addChatContact({ lead_id: lead_id || null, lead_name: lead_name || 'Demo Site', customer_name, customer_phone: customer_phone || '' });
  res.json({ contact });
});

// GET /api/chat-contacts — all first contacts (dashboard, requires auth — handled by middleware in index.js)
router.get('/chat-contacts', (req, res) => {
  res.json({ contacts: getAllChatContacts() });
});

export default router;
