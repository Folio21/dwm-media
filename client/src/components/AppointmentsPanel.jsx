import { useState, useEffect } from 'react';
import { getAllMeetings, addMeeting, updateMeeting } from '../api.js';

const STATUS_META = {
  upcoming:  { label: 'Upcoming',  cls: 'bg-blue-100 text-blue-700' },
  done:      { label: 'Done',      cls: 'bg-green-100 text-green-700' },
  'no-show': { label: 'No-Show',   cls: 'bg-gray-100 text-gray-500' },
  closed:    { label: '🎉 Closed', cls: 'bg-yellow-100 text-yellow-700' },
};

const TYPE_OPTIONS = ['Zoom', 'Phone', 'In-Person'];
const WHO_OPTIONS  = ['David', 'Partner'];

const EMPTY_FORM = {
  lead_name: '', owner_name: '', phone: '',
  date: '', time: '', type: 'Zoom', booked_by: 'David', notes: '',
};

export default function AppointmentsPanel() {
  const [meetings, setMeetings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState('');

  async function load() {
    try {
      const { meetings } = await getAllMeetings();
      setMeetings(meetings);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleFormChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.lead_name.trim() || !form.date) {
      setFormErr('Business name and date are required.');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      const { meeting } = await addMeeting(form);
      setMeetings((prev) => [meeting, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id, status) {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
    try {
      await updateMeeting(id, { status });
    } catch {
      load();
    }
  }

  async function handleNotes(id, notes) {
    try {
      await updateMeeting(id, { notes });
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, notes } : m)));
    } catch {
      // ignore
    }
  }

  const upcomingCount = meetings.filter((m) => m.status === 'upcoming').length;

  return (
    <div className="mt-8 border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">📞 Booked Meetings</span>
          {upcomingCount > 0 && (
            <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 font-medium">
              {upcomingCount} upcoming
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲ hide' : '▼ show'}</span>
      </button>

      {open && (
        <div>
          {/* Log a meeting button */}
          <div className="px-5 pt-3 pb-2 border-t flex items-center justify-between">
            <p className="text-xs text-gray-400">Your Zoom &amp; sales calls with business owners.</p>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              {showForm ? '✕ Cancel' : '+ Log Meeting'}
            </button>
          </div>

          {/* Inline form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mx-5 mb-4 p-4 border rounded-lg bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Business Name *</label>
                  <input
                    name="lead_name" value={form.lead_name} onChange={handleFormChange}
                    placeholder="Smith Law Firm"
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner / Contact</label>
                  <input
                    name="owner_name" value={form.owner_name} onChange={handleFormChange}
                    placeholder="John Smith"
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    name="phone" value={form.phone} onChange={handleFormChange}
                    placeholder="555-123-4567"
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                  <input
                    type="date" name="date" value={form.date} onChange={handleFormChange}
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                  <input
                    type="time" name="time" value={form.time} onChange={handleFormChange}
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Type</label>
                  <select
                    name="type" value={form.type} onChange={handleFormChange}
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Booked By</label>
                  <select
                    name="booked_by" value={form.booked_by} onChange={handleFormChange}
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {WHO_OPTIONS.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input
                    name="notes" value={form.notes} onChange={handleFormChange}
                    placeholder="e.g. wants website + chatbot"
                    className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              {formErr && <p className="text-xs text-red-600">{formErr}</p>}
              <div className="flex justify-end">
                <button
                  type="submit" disabled={saving}
                  className="text-sm px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving…' : 'Save Meeting'}
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          {loading ? (
            <p className="text-sm text-gray-400 px-5 py-4">Loading…</p>
          ) : meetings.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-4">
              No meetings yet — click "+ Log Meeting" to add your first booked call.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-t">
                  <tr>
                    <th className="px-4 py-2 text-left">Business</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Booked By</th>
                    <th className="px-4 py-2 text-left">Notes</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {meetings.map((m) => (
                    <tr key={m.id} className={`align-top ${m.status === 'no-show' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{m.lead_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{m.owner_name || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {m.phone
                          ? <a href={`tel:${m.phone}`} className="text-blue-600 hover:underline">{m.phone}</a>
                          : '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{m.date || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{m.time || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{m.type || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.booked_by === 'David' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                          {m.booked_by || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 max-w-[180px]">
                        <input
                          key={m.id}
                          defaultValue={m.notes || ''}
                          onBlur={(e) => {
                            if (e.target.value !== (m.notes || '')) handleNotes(m.id, e.target.value);
                          }}
                          placeholder="add notes…"
                          className="w-full text-xs border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent py-0.5"
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${(STATUS_META[m.status] || STATUS_META.upcoming).cls}`}>
                          {(STATUS_META[m.status] || STATUS_META.upcoming).label}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <select
                          value={m.status}
                          onChange={(e) => handleStatus(m.id, e.target.value)}
                          className="text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="done">Done</option>
                          <option value="no-show">No-Show</option>
                          <option value="closed">🎉 Closed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-2 border-t bg-gray-50 flex justify-end">
            <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
          </div>
        </div>
      )}
    </div>
  );
}
