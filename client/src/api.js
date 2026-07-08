const BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('dwm_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (res.status === 401) {
    localStorage.removeItem('dwm_token');
    localStorage.removeItem('dwm_username');
    window.location.reload();
    return;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function searchLeads(category, city) {
  return fetch(`${BASE}/search-leads`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ category, city }),
  }).then(handle);
}

export function getLeads({ city, category, filter, sort } = {}) {
  const params = new URLSearchParams();
  if (city)     params.set('city', city);
  if (category) params.set('category', category);
  if (filter)   params.set('filter', filter);
  if (sort)     params.set('sort', sort);
  return fetch(`${BASE}/leads?${params.toString()}`, { headers: authHeaders() }).then(handle);
}

export function updateLeadStatus(id, patch) {
  return fetch(`${BASE}/leads/${id}/status`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify(patch),
  }).then(handle);
}

export function checkWebsite(id) {
  return fetch(`${BASE}/leads/${id}/check-website`, {
    method: 'POST', headers: authHeaders(),
  }).then(handle);
}

export function buildDemoSite(id) {
  return fetch(`${BASE}/leads/${id}/build-demo-site`, {
    method: 'POST', headers: authHeaders(),
  }).then(handle);
}

export function rebuildSite(url) {
  return fetch(`${BASE}/rebuild-site`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ url }),
  }).then(handle);
}

export function findOwner(id) {
  return fetch(`${BASE}/leads/${id}/find-owner`, {
    method: 'POST', headers: authHeaders(),
  }).then(handle);
}

export function socialToSite(payload) {
  return fetch(`${BASE}/social-to-site`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handle);
}

export function sendChatMessage(leadId, messages) {
  return fetch(`${BASE}/chat`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ lead_id: leadId, messages }),
  }).then(handle);
}

export function buildChatbotPitch(id) {
  return fetch(`${BASE}/leads/${id}/build-chatbot-pitch`, {
    method: 'POST', headers: authHeaders(),
  }).then(handle);
}

export function bookAppointment(leadId, data) {
  return fetch(`${BASE}/leads/${leadId}/appointments`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handle);
}

export function getAllAppointments() {
  return fetch(`${BASE}/appointments`, { headers: authHeaders() }).then(handle);
}

export function updateAppointmentStatus(id, status) {
  return fetch(`${BASE}/appointments/${id}`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ status }),
  }).then(handle);
}

// --- Cold Email --------------------------------------------------------------

export function buildColdEmail(id) {
  return fetch(`${BASE}/leads/${id}/cold-email`, {
    method: 'POST', headers: authHeaders(),
  }).then(handle);
}

export function findLeadEmail(id) {
  return fetch(`${BASE}/leads/${id}/find-email`, {
    headers: authHeaders(),
  }).then(handle);
}

export function sendColdEmail(id, { to, subject, body }) {
  return fetch(`${BASE}/leads/${id}/send-cold-email`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ to, subject, body }),
  }).then(handle);
}

// --- Chatbot Activity --------------------------------------------------------

export function getAllChatbotAppointments() {
  return fetch(`${BASE}/appointments`, { headers: authHeaders() }).then(handle);
}

export function addChatContact(data) {
  return fetch(`${BASE}/chat-contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle);
}

export function getAllChatContacts() {
  return fetch(`${BASE}/chat-contacts`, { headers: authHeaders() }).then(handle);
}

// --- Sales Meetings ----------------------------------------------------------

export function getAllMeetings() {
  return fetch(`${BASE}/meetings`, { headers: authHeaders() }).then(handle);
}

export function addMeeting(data) {
  return fetch(`${BASE}/meetings`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handle);
}

export function updateMeeting(id, patch) {
  return fetch(`${BASE}/meetings/${id}`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify(patch),
  }).then(handle);
}
