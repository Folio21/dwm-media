import { useState, useEffect } from 'react';

const BASE = '/api';
function authHeaders() {
  const token = localStorage.getItem('dwm_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDuration(s) {
  if (!s && s !== 0) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function ReceptionistPanel({ refreshKey = 0 }) {
  const [receptionists, setReceptionists] = useState([]);
  const [callLogs, setCallLogs]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('calls'); // 'calls' | 'active'
  const [expandedLog, setExpandedLog]     = useState(null);

  useEffect(() => { fetchAll(); }, [refreshKey]);

  async function fetchAll() {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/receptionists`, { headers: authHeaders() });
      const data = await res.json();
      setReceptionists(data.receptionists || []);
      setCallLogs(data.callLogs || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleDeactivate(leadId, leadName) {
    if (!confirm(`Deactivate AI Receptionist for ${leadName}? This will release their phone number.`)) return;
    await fetch(`${BASE}/leads/${leadId}/receptionist`, { method: 'DELETE', headers: authHeaders() });
    fetchAll();
  }

  const tabs = [
    { id: 'calls',  label: `📞 Call Log (${callLogs.length})` },
    { id: 'active', label: `🤖 Active (${receptionists.length})` },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">📞 AI Receptionist</h2>
          <p className="text-xs text-gray-400 mt-0.5">{receptionists.length} active · {callLogs.length} calls logged</p>
        </div>
        <button onClick={fetchAll} className="text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-gray-400">Loading…</div>
      )}

      {/* Call Log Tab */}
      {!loading && activeTab === 'calls' && (
        <div className="divide-y divide-gray-50">
          {callLogs.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400">
              No calls yet. Set up a receptionist for a client to start receiving calls.
            </div>
          )}
          {callLogs.map((log) => (
            <div key={log.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{log.lead_name}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{log.caller_number}</span>
                    {log.source === 'phone' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-600 font-medium">booked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{fmtDuration(log.duration_s)}</span>
                    {log.ended_reason && (
                      <span className="text-xs text-gray-300">{log.ended_reason}</span>
                    )}
                    <span className="text-xs text-gray-300">{timeAgo(log.started_at || log.created_at)}</span>
                  </div>
                  {log.transcript && (
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="text-xs text-blue-500 hover:text-blue-700 mt-1">
                      {expandedLog === log.id ? 'Hide transcript ▲' : 'View transcript ▼'}
                    </button>
                  )}
                  {expandedLog === log.id && log.transcript && (
                    <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                      {log.transcript}
                    </pre>
                  )}
                </div>
                {log.recording_url && (
                  <a href={log.recording_url} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 shrink-0 mt-0.5">
                    🎙 Listen
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Receptionists Tab */}
      {!loading && activeTab === 'active' && (
        <div className="divide-y divide-gray-50">
          {receptionists.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400">
              No active receptionists. Click "📞 Activate Receptionist" on a lead to set one up.
            </div>
          )}
          {receptionists.map((rec) => (
            <div key={rec.id} className="px-5 py-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{rec.lead_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>
                    <span className="text-xs text-green-600 font-medium">Active</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">Set up {timeAgo(rec.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeactivate(rec.lead_id, rec.lead_name)}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                  Deactivate
                </button>
              </div>

              {/* Forwarding instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-800">📋 Setup instructions for {rec.lead_name}</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Tell the client to set up <strong>conditional call forwarding</strong> on their phone.
                  The AI will <em>only</em> answer if they don't pick up — their calls work exactly as normal otherwise.
                </p>

                <div className="bg-white rounded-lg border border-blue-100 px-3 py-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Forward to this number</p>
                    <p className="text-sm font-mono font-bold text-gray-900">
                      {rec.phone_number ? rec.phone_number.replace(/^\+1/, '') : 'Provisioning…'}
                    </p>
                    {rec.phone_number && (
                      <a href={`tel:${rec.phone_number}`} className="text-xs text-blue-500 hover:underline">Tap to call</a>
                    )}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(rec.phone_number ? rec.phone_number.replace(/^\+1/, '') : '')}
                    className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded">
                    Copy
                  </button>
                </div>

                <div className="space-y-1 pt-1">
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">How to set it up:</p>
                  <div className="grid grid-cols-1 gap-1 text-xs text-blue-700">
                    <p><strong>iPhone:</strong> Settings → Phone → Call Forwarding → toggle on → enter the number above. Or dial <code className="bg-blue-100 px-1 rounded">*61*{rec.phone_number}#</code> from their phone.</p>
                    <p><strong>Android:</strong> Phone app → ⋮ Menu → Settings → Call Forwarding → Forward when unanswered → enter the number above.</p>
                    <p><strong>Any carrier:</strong> Dial <code className="bg-blue-100 px-1 rounded">*61*{rec.phone_number}#</code> from their business phone. This is the universal "forward on no answer" code and works on AT&T, Verizon, T-Mobile, and most others.</p>
                  </div>
                </di