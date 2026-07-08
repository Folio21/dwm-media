import { useState, useEffect } from 'react';
import { getAllChatbotAppointments, getAllChatContacts } from '../api.js';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PhoneBadge({ phone }) {
  if (!phone) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <a href={`tel:${phone}`} className="text-blue-600 hover:underline text-xs font-mono">
      {phone}
    </a>
  );
}

export default function ChatbotActivityPanel() {
  const [tab, setTab] = useState('bookings');
  const [appointments, setAppointments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [apptRes, ctcRes] = await Promise.all([
          getAllChatbotAppointments(),
          getAllChatContacts(),
        ]);
        setAppointments(apptRes.appointments || []);
        setContacts(ctcRes.contacts || []);
      } catch (err) {
        console.error('ChatbotActivityPanel load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter out contacts who also have a booking (same name+phone+lead) to avoid double-showing
  const contactsOnly = contacts.filter((c) =>
    !appointments.some(
      (a) =>
        a.customer_name === c.customer_name &&
        a.customer_phone === c.customer_phone &&
        a.lead_id === c.lead_id
    )
  );

  return (
    <div className="mt-10 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Chatbot Activity</h2>
          <p className="text-xs text-gray-400 mt-0.5">Bookings and first contacts through your clients' chatbots</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
            {appointments.length} booked
          </span>
          <span className="bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">
            {contactsOnly.length} contacts
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'bookings', label: `Bookings (${appointments.length})` },
          { id: 'contacts', label: `First Contacts (${contactsOnly.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-50">
        {loading && (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        )}

        {/* BOOKINGS TAB */}
        {!loading && tab === 'bookings' && (
          appointments.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No chatbot bookings yet — they'll show up here as demo appointments come in.
            </div>
          ) : (
            appointments.map((appt) => (
              <div key={appt.id} className="px-5 py-3 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                {/* Date block */}
                <div className="w-14 text-center shrink-0">
                  <div className="text-xs text-gray-400 uppercase tracking-wide leading-none">
                    {appt.date_iso
                      ? new Date(appt.date_iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })
                      : '—'}
                  </div>
                  <div className="text-xl font-bold text-gray-800 leading-tight">
                    {appt.date_iso
                      ? new Date(appt.date_iso + 'T12:00:00').getDate()
                      : '—'}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">{appt.time}</div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{appt.customer_name}</span>
                    <PhoneBadge phone={appt.customer_phone} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Booked via <span className="font-medium text-gray-700">{appt.lead_name || 'Demo Site'}</span>
                    {appt.notes && <> · <span className="italic">{appt.notes}</span></>}
                  </div>
                </div>

                {/* Status + timestamp */}
                <div className="text-right shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    appt.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {appt.status || 'pending'}
                  </span>
                  <div className="text-xs text-gray-300 mt-1">{timeAgo(appt.created_at)}</div>
                </div>
              </div>
            ))
          )
        )}

        {/* CONTACTS TAB */}
        {!loading && tab === 'contacts' && (
          contactsOnly.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No first contacts yet — people who chat but don't book will appear here.
            </div>
          ) : (
            contactsOnly.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                {/* Icon */}
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <span className="text-purple-600 text-sm font-bold">
                    {(c.customer_name || '?')[0].toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{c.customer_name}</span>
                    <PhoneBadge phone={c.customer_phone} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Chatted on <span className="font-medium text-gray-700">{c.lead_name || 'Demo Site'}</span>
                    {' · '}did not complete booking
                  </div>
                </div>

                <div className="text-xs text-gray-300 shrink-0">{timeAgo(c.created_at)}</div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
