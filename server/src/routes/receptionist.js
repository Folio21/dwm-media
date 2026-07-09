import { Router } from 'express';
import {
  getLeadById, addAppointment,
  upsertReceptionist, getReceptionistByLeadId, getAllReceptionists, deleteReceptionist,
  addCallLog, getCallLogsByLeadId, getAllCallLogs,
} from '../db.js';
import {
  createAssistant, provisionPhoneNumber,
  deleteAssistant, releasePhoneNumber, getRecentCalls,
} from '../services/vapiService.js';

const router = Router();

function webhookBase() {
  return process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.PUBLIC_URL || 'http://localhost:4000';
}

// POST /api/leads/:id/setup-receptionist
// Creates a Vapi assistant + phone number for this lead
router.post('/leads/:id/setup-receptionist', async (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (!process.env.VAPI_API_KEY) {
    return res.status(500).json({ error: 'VAPI_API_KEY not set' });
  }

  // Check if already set up
  const existing = getReceptionistByLeadId(lead.id);
  if (existing) return res.json({ receptionist: existing });

  try {
    const assistant   = await createAssistant(lead, webhookBase());
    const phoneNumber = await provisionPhoneNumber(assistant.id);

    const receptionist = upsertReceptionist({
      lead_id:         lead.id,
      lead_name:       lead.name,
      vapi_assistant_id:  assistant.id,
      vapi_phone_number_id: phoneNumber.id,
      phone_number:    phoneNumber.number,
      status:          'active',
    });

    res.json({ receptionist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id/receptionist
router.get('/leads/:id/receptionist', async (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const receptionist = getReceptionistByLeadId(lead.id);
  if (!receptionist) return res.json({ receptionist: null });

  // Pull fresh call logs from Vapi
  let recentCalls = [];
  if (process.env.VAPI_API_KEY && receptionist.vapi_assistant_id) {
    recentCalls = await getRecentCalls(receptionist.vapi_assistant_id, 10);
  }

  // Persist new call logs
  const storedLogs = getCallLogsByLeadId(lead.id);
  const storedIds  = new Set(storedLogs.map((c) => c.vapi_call_id));

  for (const call of recentCalls) {
    if (!storedIds.has(call.id)) {
      addCallLog({
        lead_id:       lead.id,
        lead_name:     lead.name,
        vapi_call_id:  call.id,
        caller_number: call.customer?.number || 'Unknown',
        duration_s:    call.endedAt && call.startedAt
          ? Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000)
          : null,
        ended_reason:  call.endedReason || null,
        transcript:    call.transcript || null,
        recording_url: call.recordingUrl || null,
        started_at:    call.startedAt || null,
      });
    }
  }

  const callLogs = getCallLogsByLeadId(lead.id);
  res.json({ receptionist, callLogs });
});

// GET /api/receptionists — all active receptionists
router.get('/receptionists', async (req, res) => {
  const receptionists = getAllReceptionists();
  const callLogs      = getAllCallLogs();
  res.json({ receptionists, callLogs });
});

// DELETE /api/leads/:id/receptionist — deactivate
router.delete('/leads/:id/receptionist', async (req, res) => {
  const lead = getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const receptionist = getReceptionistByLeadId(lead.id);
  if (!receptionist) return res.json({ ok: true });

  if (process.env.VAPI_API_KEY) {
    await deleteAssistant(receptionist.vapi_assistant_id);
    await releasePhoneNumber(receptionist.vapi_phone_number_id);
  }

  deleteReceptionist(lead.id);
  res.json({ ok: true });
});

// ── Vapi Tool Webhook: book-appointment ────────────────────────────────────
// Called by Vapi when the AI decides to book an appointment during a call
router.post('/vapi/tool/:leadId/book-appointment', (req, res) => {
  const lead = getLeadById(req.params.leadId);
  const args = req.body?.toolCallList?.[0]?.function?.arguments || req.body || {};

  const name  = args.caller_name  || 'Phone Caller';
  const phone = args.caller_phone || '';
  const date  = args.date         || 'TBD';
  const time  = args.time         || '';
  const notes = args.notes        || '';

  addAppointment({
    lead_id:       lead?.id || null,
    lead_name:     lead?.name || 'Phone Caller',
    customer_name: name,
    customer_phone: phone,
    date,
    date_iso:      '',
    time,
    notes: `[Phone booking via AI Receptionist] ${notes}`,
    source: 'phone',
  });

  // Vapi expects a result back to continue the conversation
  res.json({
    results: [
      {
        toolCallId: req.body?.toolCallList?.[0]?.id || 'unknown',
        result: `Appointment booked for ${name} on ${date}${time ? ' at ' + time : ''}. I'll let the team know.`,
      },
    ],
  });
});

// ── Vapi Event Webhook: call ended ────────────────────────────────────────
// Receives general call lifecycle events from Vapi
router.post('/vapi/webhook', (req, res) => {
  const { message } = req.body || {};
  // We handle call data in the GET /receptionist endpoint via polling.
  // This webhook is here so Vapi has somewhere to POST without errors.
  // Future: handle real-time transcript streaming here.
  res.json({ received: true });
});

export default router;
