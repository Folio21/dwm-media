import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Plain JSON-file storage. We started with better-sqlite3, but it requires a
// native C++ build step that isn't worth forcing onto a single-user local
// tool. This file is the entire "database layer" — load/save the whole
// store on each call. Fine at this scale (hundreds of leads, one user).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR env var lets Railway (or any host) point to a persistent volume.
// Falls back to server/data/ for local dev.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dataFile = path.join(dataDir, 'leadfinder.json');

function emptyStore() {
  return {
    leads: [], clients: [], sites: [], appointments: [], meetings: [],
    nextLeadId: 1, nextClientId: 1, nextSiteId: 1, nextAppointmentId: 1, nextMeetingId: 1,
  };
}

function load() {
  if (!fs.existsSync(dataFile)) return emptyStore();
  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    return { ...emptyStore(), ...raw };
  } catch {
    return emptyStore();
  }
}

function save(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// --- Leads -----------------------------------------------------------------

export function upsertLead(lead) {
  const data = load();
  const now = new Date().toISOString();
  const existing = data.leads.find((l) => l.place_id === lead.place_id);

  if (existing) {
    Object.assign(existing, lead, { updated_at: now });
  } else {
    data.leads.push({
      id: data.nextLeadId++,
      call_status: 'Not called',
      notes: '',
      created_at: now,
      updated_at: now,
      ...lead,
    });
  }

  save(data);
  return data.leads.find((l) => l.place_id === lead.place_id);
}

export function getLeadsByPlaceIds(placeIds) {
  const data = load();
  return data.leads.filter((l) => placeIds.includes(l.place_id));
}

// Franchise / large chain keywords — any business whose name contains one of
// these (case-insensitive) is almost certainly not a small local operation.
const CHAIN_KEYWORDS = [
  'one hour', 'cool today', 'frank gay', 'ars rescue', 'service experts',
  'home depot', 'lowes', 'sears', 'american home shield', 'homeserve',
  'always comfortable', 'mister sparky', 'mister rogers',
  'petro home', 'atlas copco', 'carrier', 'lennox', 'trane',
  'comfort systems', 'service master', 'servicemaster',
  'del-air', 'rainaldi', 'mills air',  // large regional FL chains
];

function isChainOrLarge(lead) {
  const nameLower = (lead.name || '').toLowerCase();
  if (CHAIN_KEYWORDS.some((kw) => nameLower.includes(kw))) return true;
  // Businesses with 200+ reviews are almost certainly not small-local
  if ((lead.review_count || 0) >= 200) return true;
  return false;
}

export function queryLeads({ city, category, filter, sort } = {}) {
  const data = load();
  let leads = data.leads;

  if (city) leads = leads.filter((l) => l.city === city);
  if (category) leads = leads.filter((l) => l.category === category);
  if (filter === 'no_website') leads = leads.filter((l) => !l.has_website);
  if (filter === 'has_website') leads = leads.filter((l) => l.has_website);
  if (filter === 'called') leads = leads.filter((l) => l.call_status !== 'Not called');
  if (filter === 'not_called') leads = leads.filter((l) => l.call_status === 'Not called');
  if (filter === 'local_only') leads = leads.filter((l) => !isChainOrLarge(l));
  // "pitch_ready" = local small biz with no website — the core pitch target
  if (filter === 'pitch_ready') leads = leads.filter((l) => !l.has_website && !isChainOrLarge(l));
  // "chatbot_pitch" = local small biz that already has a website
  if (filter === 'chatbot_pitch') leads = leads.filter((l) => l.has_website && !isChainOrLarge(l));

  leads = [...leads];
  if (sort === 'rating') leads.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === 'reviews') leads.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
  else leads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return leads;
}

export function getLeadById(id) {
  const data = load();
  return data.leads.find((l) => l.id === Number(id));
}

export function updateLead(id, patch) {
  const data = load();
  const lead = data.leads.find((l) => l.id === Number(id));
  if (!lead) return null;

  if (patch.call_status !== undefined && patch.call_status !== null) lead.call_status = patch.call_status;
  if (patch.notes !== undefined && patch.notes !== null) lead.notes = patch.notes;
  if (patch.owner_name !== undefined) lead.owner_name = patch.owner_name;
  lead.updated_at = new Date().toISOString();

  save(data);
  return lead;
}

// --- Sites (Phase 2: demo sites; client_id stays null until Phase 4) -------

export function addSite(site) {
  const data = load();
  const now = new Date().toISOString();
  const record = { id: data.nextSiteId++, created_at: now, client_id: null, ...site };
  data.sites.push(record);
  save(data);
  return record;
}

export function getSiteById(id) {
  const data = load();
  return data.sites.find((s) => s.id === Number(id));
}

export function listSites() {
  return load().sites;
}

// --- Clients (Phase 3 — empty for now) ------------------------------------

export function listClients() {
  return load().clients;
}

// --- Appointments ----------------------------------------------------------

export function addAppointment(appt) {
  const data = load();
  if (!data.appointments) data.appointments = [];
  if (!data.nextAppointmentId) data.nextAppointmentId = 1;
  const now = new Date().toISOString();
  const record = { id: data.nextAppointmentId++, created_at: now, status: 'pending', ...appt };
  data.appointments.push(record);
  save(data);
  return record;
}

export function getAppointmentsByLeadId(leadId) {
  const data = load();
  return (data.appointments || []).filter((a) => a.lead_id === Number(leadId));
}

export function getAllAppointments() {
  const data = load();
  const appts = data.appointments || [];
  // Sort: soonest first
  return [...appts].sort((a, b) => {
    const da = new Date(a.date_iso || a.created_at);
    const db2 = new Date(b.date_iso || b.created_at);
    return da - db2;
  });
}

export function updateAppointment(id, patch) {
  const data = load();
  const appt = (data.appointments || []).find((a) => a.id === Number(id));
  if (!appt) return null;
  Object.assign(appt, patch, { updated_at: new Date().toISOString() });
  save(data);
  return appt;
}

// --- Sales Meetings (David + partner's Zoom/calls with business owners) -----

export function addMeeting(meeting) {
  const data = load();
  if (!data.meetings) data.meetings = [];
  if (!data.nextMeetingId) data.nextMeetingId = 1;
  const now = new Date().toISOString();
  const record = { id: data.nextMeetingId++, created_at: now, status: 'upcoming', ...meeting };
  data.meetings.push(record);
  save(data);
  return record;
}

export function getAllMeetings() {
  const data = load();
  const meetings = data.meetings || [];
  // Sort: upcoming first, then by date desc for past ones
  return [...meetings].sort((a, b) => {
    // Put upcoming at top
    const order = { upcoming: 0, done: 1, 'no-show': 2, closed: 3 };
    const aO = order[a.status] ?? 4;
    const bO = order[b.status] ?? 4;
    if (aO !== bO) return aO - bO;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

export function updateMeeting(id, patch) {
  const data = load();
  const meeting = (data.meetings || []).find((m) => m.id === Number(id));
  if (!meeting) return null;
  Object.assign(meeting, patch, { updated_at: new Date().toISOString() });
  save(data);
  return meeting;
}
