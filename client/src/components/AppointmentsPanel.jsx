import { useState, useEffect } from 'react';
import { getAllAppointments, updateAppointmentStatus } from '../api.js';

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

export default function AppointmentsPanel() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  async function load() {
    try {
      const { appointments } = await getAllAppointments();
      setAppointments(appointments);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleStatus(id, status) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    try {
      await updateAppointmentStatus(id, status);
    } catch {
      load(); // re-sync on error
    }
  }

  const upcoming = appointments.filter((a) => a.status !== 'cancelled');
  const hasSome = appointments.length > 0;

  return (
    <div className="mt-8 border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">📅 Appointments</span>
          {upcoming.length > 0 && (
            <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 font-medium">
              {upcoming.length}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲ hide' : '▼ show'}</span>
      </button>

      {open && (
        <div>
          {loading ? (
            <p className="text-sm text-gray-400 px-5 py-4">Loading…</p>
          ) : !hasSome ? (
            <p className="text-sm text-gray-400 px-5 py-4">
              No appointments yet. When a customer books through the chatbot, it shows up here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-t">
                  <tr>
                    <th className="px-4 py-2 text-left">Business</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">What they need</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {appointments.map((a) => (
                    <tr key={a.id} className={`align-top ${a.status === 'cancelled' ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{a.lead_name || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{a.customer_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {a.customer_phone
                          ? <a href={`tel:${a.customer_phone}`} className="text-blue-600 hover:underline">{a.customer_phone}</a>
                          : '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{a.date}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{a.time}</td>
                      <td className="px-4 py-2 max-w-[200px]">
                        <span className="text-gray-600">{a.notes || <span className="text-gray-300 italic">none</span>}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-500'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex gap-1">
                          {a.status !== 'confirmed' && a.status !== 'cancelled' && (
                            <button
                              onClick={() => handleStatus(a.id, 'confirmed')}
                              className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              Confirm
                            </button>
                          )}
                          {a.status !== 'cancelled' && (
                            <button
                              onClick={() => handleStatus(a.id, 'cancelled')}
                              className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
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
