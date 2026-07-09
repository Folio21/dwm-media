import { useState, useEffect } from 'react';

const BASE = '/api';
function authHeaders() {
  const token = localStorage.getItem('dwm_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_STYLES = {
  active:   'bg-green-100 text-green-700',
  prospect: 'bg-purple-100 text-purple-700',
  pending:  'bg-yellow-100 text-yellow-700',
  churned:  'bg-red-100 text-red-600',
};

export default function ControlCenter() {
  const [stats,          setStats]          = useState(null);
  const [metrics,        setMetrics]        = useState({ total_revenue: 0, monthly_revenue: 0, total_spend: 0, monthly_spend: 0, clients: [] });
  const [editing,        setEditing]        = useState({});
  const [addingClient,   setAddingClient]   = useState(false);
  const [newClient,      setNewClient]      = useState({ name: '', service: '', mrr: '', status: 'active', since: '' });
  const [saving,         setSaving]         = useState(false);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/stats`, { headers: authHeaders() });
      const data = await res.json();
      setStats(data.stats || null);
      setMetrics(data.metrics || { total_revenue: 0, monthly_revenue: 0, total_spend: 0, monthly_spend: 0, clients: [] });
    } catch (err) {
      console.error('Stats fetch failed', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveMetrics(patch) {
    setSaving(true);
    try {
      const updated = { ...metrics, ...patch };
      const res  = await fetch(`${BASE}/stats/metrics`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify(updated),
      });
      const data = await res.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(field) {
    setEditing((prev) => ({ ...prev, [field]: String(metrics[field] || 0) }));
  }

  function handleBlur(field) {
    const val = editing[field];
    if (val === undefined) return;
    const num = parseFloat(val) || 0;
    setEditing((prev) => { const n = { ...prev }; delete n[field]; return n; });
    saveMetrics({ [field]: num });
  }

  function displayVal(field) {
    return editing[field] !== undefined ? editing[field] : String(metrics[field] || 0);
  }

  async function handleAddClient() {
    if (!newClient.name) return;
    const clients = [
      ...(metrics.clients || []),
      { ...newClient, id: Date.now(), mrr: parseFloat(newClient.mrr) || 0 },
    ];
    await saveMetrics({ clients });
    setNewClient({ name: '', service: '', mrr: '', status: 'active', since: '' });
    setAddingClient(false);
  }

  async function handleRemoveClient(id) {
    const clients = (metrics.clients || []).filter((c) => c.id !== id);
    await saveMetrics({ clients });
  }

  const clients    = metrics.clients || [];
  const totalMRR   = clients.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const activeCount = clients.filter((c) => c.status === 'active').length;

  const metricCards = [
    { key: 'total_revenue',   label: 'Total Revenue',   sub: 'All-time client revenue',        color: 'text-green-600' },
    { key: 'monthly_revenue', label: 'Monthly Revenue', sub: 'This month\'s recurring + new',  color: 'text-green-600' },
    { key: 'total_spend',     label: 'Total Spend',     sub: 'All-time API + infra costs',     color: 'text-red-500'   },
    { key: 'monthly_spend',   label: 'Monthly Spend',   sub: 'Estimated this month',           color: 'text-red-500'   },
  ];

  const activityStats = stats ? [
    { label: 'Total Leads',       value: stats.total_leads          },
    { label: 'Demos Built',       value: stats.demo_sites           },
    { label: 'Leads Called',      value: stats.leads_called         },
    { label: 'Leads Booked',      value: stats.leads_booked         },
    { label: 'Calls Received',    value: stats.total_calls          },
    { label: 'AI Receptionists',  value: stats.active_receptionists },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Control Center</h2>
          <p className="text-sm text-gray-500">Revenue, spend, and business activity at a glance</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
          <button onClick={fetchAll} className="text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
          <span className="text-xs text-gray-300">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-16">Loading…</div>
      ) : (
        <>
          {/* Revenue + Spend Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metricCards.map(({ key, label, sub, color }) => (
              <div key={key} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</p>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className={`text-lg font-bold ${color}`}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`text-2xl font-bold ${color} w-full bg-transparent border-b border-dashed border-gray-200 focus:border-purple-400 focus:outline-none leading-tight`}
                    value={displayVal(key)}
                    onFocus={() => startEdit(key)}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))}
                    onBlur={() => handleBlur(key)}
                    title="Click to edit"
                  />
                </div>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            ))}
          </div>

          {/* P&L summary bar */}
          <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm mb-6 flex items-center gap-8">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Net Revenue (monthly)</p>
              <p className={`text-xl font-bold mt-0.5 ${(metrics.monthly_revenue - metrics.monthly_spend) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {fmt(metrics.monthly_revenue - metrics.monthly_spend)}
              </p>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">MRR from Clients</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(totalMRR)}</p>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Active Clients</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{activeCount}</p>
            </div>
          </div>

          {/* Activity Stats */}
          {activityStats.length > 0 && (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {activityStats.map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Client Pipeline Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Client Pipeline</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeCount} active · {fmt(totalMRR)}/mo MRR
                </p>
              </div>
              <button
                onClick={() => setAddingClient(true)}
                className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                + Add Client
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">MRR</th>
                  <th className="px-4 py-3">Since</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-xs text-gray-400">
                      No clients yet — click "+ Add Client" when you land your first deal.
                    </td>
                  </tr>
                )}
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-gray-900">{client.name}</td>
                    <td className="px-4 py-3 text-gray-500">{client.service || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[client.status] || 'bg-gray-100 text-gray-500'}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(client.mrr)}</td>
                    <td className="px-4 py-3 text-gray-400">{client.since || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveClient(client.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add client form */}
            {addingClient && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-700 mb-3">New Client</p>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="Business name *"
                    value={newClient.name}
                    onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="Service (e.g. Website)"
                    value={newClient.service}
                    onChange={(e) => setNewClient((p) => ({ ...p, service: e.target.value }))}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="Monthly ($)"
                    type="number"
                    min="0"
                    value={newClient.mrr}
                    onChange={(e) => setNewClient((p) => ({ ...p, mrr: e.target.value }))}
                  />
                  <select
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                    value={newClient.status}
                    onChange={(e) => setNewClient((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="pending">Pending</option>
                    <option value="churned">Churned</option>
                  </select>
                  <input
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="Start date (e.g. Jul 2026)"
                    value={newClient.since}
                    onChange={(e) => setNewClient((p) => ({ ...p, since: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddClient}
                    disabled={!newClient.name}
                    className="text-xs px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    Save Client
                  </button>
                  <button
                    onClick={() => { setAddingClient(false); setNewClient({ name: '', service: '', mrr: '', status: 'active', since: '' }); }}
                    className="text-xs px-4 py-2 border rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
