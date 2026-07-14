import { useState, useEffect, useCallback } from 'react';

function authHeaders() {
  const token = localStorage.getItem('dwm_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const TRADES = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping',
  'Pest Control', 'Pool Service', 'General Contractor', 'Cleaning', 'Home Organizing',
];

function StarRating({ rating }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3 h-3 ${i <= rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function LeadCard({ lead }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(lead.sms);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const initial = (lead.reviewer_name || '?').charAt(0).toUpperCase();
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{lead.reviewer_name}</p>
            <StarRating rating={lead.rating} />
            <span className="text-xs text-gray-400">{lead.time_ago}</span>
          </div>
          <p className="text-xs text-red-500 font-medium mt-0.5">At: {lead.competitor_name}</p>
        </div>
        <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full font-medium shrink-0">
          {lead.rating}★
        </span>
      </div>
      <div className="bg-gray-50 rounded-xl px-4 py-3">
        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Their complaint</p>
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">"{lead.review_text}"</p>
      </div>
      <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        <p className="text-xs text-green-700 mb-1.5 font-medium uppercase tracking-wide">Your ready-to-send text</p>
        <p className="text-sm text-gray-800 leading-relaxed">{lead.sms}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={copy} className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`}>
          {copied ? 'Copied!' : 'Copy SMS'}
        </button>
        <a href={lead.fb_search} target="_blank" rel="noreferrer" className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
          Find on Facebook
        </a>
      </div>
    </div>
  );
}

function SetupWizard({ onSaved }) {
  const [form, setForm] = useState({ location: '', trade: 'HVAC', radius_miles: '10', client_name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function handleChange(e) { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); }
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/review-poacher/watch', { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved(data.zone);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-7 text-white">
        <div className="text-3xl mb-3">&#127919;</div>
        <h2 className="text-xl font-bold mb-2">Review Poacher</h2>
        <p className="text-red-100 text-sm leading-relaxed">We monitor every competitor in the area 24/7. The moment someone leaves a 1-3 star review, we generate a personalized text and alert you.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-red-100">
          <span>Up to 60 competitors monitored</span>
          <span>Checks every 4 hours</span>
          <span>Email alert per new lead</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-5">One-Time Setup</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Client City or Zip Code *</label>
              <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Orlando, FL or 32707" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trade *</label>
              <select name="trade" value={form.trade} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                {TRADES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Radius *</label>
              <select name="radius_miles" value={form.radius_miles} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                {['5','10','15','20','25','30'].map((r) => <option key={r} value={r}>{r} miles</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client Business Name</label>
              <input name="client_name" value={form.client_name} onChange={handleChange} placeholder="e.g. Cool Breeze HVAC" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alert Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@email.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={saving} className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            {saving ? 'Setting up...' : 'Start Monitoring Competitors'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LiveFeed({ zone: initialZone, onReset }) {
  const [zone, setZone] = useState(initialZone);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/review-poacher/leads', { headers: authHeaders() });
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/review-poacher/status', { headers: authHeaders() });
      const data = await res.json();
      if (data.zone) setZone(data.zone);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLeads();
    const iv = setInterval(fetchLeads, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchLeads]);

  async function handleScanNow() {
    setScanning(true);
    setScanMsg('');
    try {
      const res = await fetch('/api/review-poacher/scan', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.stats) {
        const s = data.stats;
        setScanMsg('Scan complete: ' + (s.competitors_found||0) + ' competitors, ' + (s.bad_reviews_checked||0) + ' bad reviews checked, ' + (s.new_leads||0) + ' new leads.');
        await fetchLeads();
        await fetchStatus();
      }
    } catch (err) { setScanMsg('Scan failed: ' + err.message); }
    finally { setScanning(false); }
  }

  async function handleStop() {
    if (!confirm('Stop monitoring and clear the watch zone?')) return;
    await fetch('/api/review-poacher/watch', { method: 'DELETE', headers: authHeaders() });
    onReset();
  }

  const lastScan = zone.last_scan ? new Date(zone.last_scan).toLocaleString() : null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse inline-block"></span>
              <span className="text-sm font-bold">Monitoring Active</span>
            </div>
            <p className="text-red-100 text-xs">Watching <strong>{zone.trade}</strong> within <strong>{zone.radius_miles} miles</strong> of <strong>{zone.location}</strong>{zone.client_name ? ' for ' + zone.client_name : ''}</p>
            <p className="text-red-200 text-xs mt-1">Auto-checks every 4 hours{zone.email ? ' · Alerts to ' + zone.email : ''}</p>
            {lastScan && (
              <p className="text-red-200 text-xs mt-0.5">Last scan: {lastScan}{zone.competitors_found != null ? ' · ' + zone.competitors_found + ' competitors · ' + (zone.bad_reviews_checked||0) + ' bad reviews' : ''}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={handleScanNow} disabled={scanning} className="text-xs bg-white text-red-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-60 transition-colors">
              {scanning ? 'Scanning...' : 'Scan Now'}
            </button>
            <button onClick={handleStop} className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-lg transition-colors">Stop</button>
          </div>
        </div>
      </div>

      {scanMsg && <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">{scanMsg}</div>}

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-xs text-yellow-800 leading-relaxed">
        <strong>Note:</strong> Google returns only the 5 most relevant reviews per business, which tend to be positive. This tool is best at catching <strong>brand new</strong> bad reviews the moment they appear. Hit Scan Now to check immediately.
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500">Running first scan...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm font-medium text-gray-700">No leads captured yet</p>
          <p className="text-xs text-gray-400 mt-1">Leads appear when a competitor gets a new 1-3 star review. Hit Scan Now to check.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-800">{leads.length} lead{leads.length !== 1 ? 's' : ''} captured</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewPoacher() {
  const [zone, setZone] = useState(undefined);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/review-poacher/status', { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setZone(d.zone || null))
      .catch(() => setZone(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>;
  if (!zone) return <SetupWizard onSaved={(z) => setZone(z)} />;
  return <LiveFeed zone={zone} onReset={() => setZone(null)} />;
}
