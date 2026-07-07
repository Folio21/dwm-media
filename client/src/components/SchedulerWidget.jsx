import { useState, useMemo } from 'react';
import { bookAppointment } from '../api.js';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const TIME_SLOTS = [
  '8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '1:00 PM','2:00 PM','3:00 PM','4:00 PM',
];

function getAvailableDates() {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cur = new Date(today);
  cur.setDate(cur.getDate() + 1); // start tomorrow
  const end = new Date(today);
  end.setDate(end.getDate() + 21); // 3 weeks out

  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(cur)); // Mon–Fri
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function friendlyDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SchedulerWidget({ lead, onScheduled }) {
  const [step, setStep] = useState('date'); // date | time | details | confirmed
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableDates = useMemo(getAvailableDates, []);

  // Group dates by month for display
  const byMonth = useMemo(() => {
    const map = {};
    for (const d of availableDates) {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map[key]) map[key] = { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, days: [] };
      map[key].days.push(d);
    }
    return Object.values(map);
  }, [availableDates]);

  async function handleConfirm() {
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    setSaving(true);
    setError('');
    try {
      await bookAppointment(lead.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        date: friendlyDate(selectedDate),
        date_iso: isoDate(selectedDate),
        time: selectedTime,
        notes: form.notes.trim(),
      });
      setStep('confirmed');
      onScheduled?.({
        date: friendlyDate(selectedDate),
        time: selectedTime,
        name: form.name.trim(),
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── CONFIRMED ───────────────────────────────────────────────────────────────
  if (step === 'confirmed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-1">
        <div className="text-green-700 font-semibold text-base">✅ You're booked!</div>
        <div className="text-green-800">
          <strong>{form.name.trim()}</strong> —{' '}
          {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedTime}
        </div>
        {form.notes.trim() && (
          <div className="text-green-700 text-xs">📋 {form.notes.trim()}</div>
        )}
        <div className="text-green-600 text-xs pt-1">
          {form.phone.trim()
            ? `We'll call ${form.phone.trim()} to confirm.`
            : "We'll be in touch to confirm your appointment."}
        </div>
      </div>
    );
  }

  // ── STEP HEADER ─────────────────────────────────────────────────────────────
  const steps = ['date', 'time', 'details'];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm text-sm w-full">

      {/* Progress bar */}
      <div className="flex">
        {steps.map((s, i) => {
          const active = s === step;
          const done = steps.indexOf(step) > i;
          return (
            <div
              key={s}
              className={`flex-1 py-1.5 text-center text-xs font-medium border-b-2 ${
                active ? 'border-blue-600 text-blue-700 bg-blue-50' :
                done   ? 'border-blue-300 text-blue-500 bg-blue-50/50' :
                         'border-gray-100 text-gray-400'
              }`}
            >
              {i + 1}. {s === 'date' ? 'Date' : s === 'time' ? 'Time' : 'Your Info'}
            </div>
          );
        })}
      </div>

      <div className="p-3">

        {/* ── DATE PICKER ──────────────────────────────────────────────── */}
        {step === 'date' && (
          <div>
            <p className="text-gray-500 text-xs mb-3">Choose an available date (Mon – Fri):</p>
            {byMonth.map(({ label, days }) => (
              <div key={label} className="mb-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
                <div className="grid grid-cols-5 gap-1">
                  {days.map((d) => (
                    <button
                      key={d.toISOString()}
                      onClick={() => { setSelectedDate(d); setStep('time'); }}
                      className="flex flex-col items-center py-2 rounded-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-600 hover:text-white transition-all group"
                    >
                      <span className="text-xs text-gray-400 group-hover:text-blue-100">{DAY_SHORT[d.getDay()]}</span>
                      <span className="font-semibold text-sm leading-tight">{d.getDate()}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TIME PICKER ──────────────────────────────────────────────── */}
        {step === 'time' && (
          <div>
            <button onClick={() => setStep('date')} className="text-xs text-blue-600 hover:underline mb-2 block">
              ← Change date
            </button>
            <p className="text-gray-700 font-medium mb-1">
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-gray-400 text-xs mb-3">Select a time:</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setSelectedTime(t); setStep('details'); }}
                  className="py-2.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── DETAILS FORM ─────────────────────────────────────────────── */}
        {step === 'details' && (
          <div>
            <button onClick={() => setStep('time')} className="text-xs text-blue-600 hover:underline mb-2 block">
              ← Change time
            </button>
            <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 text-xs text-blue-700 font-medium">
              📅 {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {selectedTime}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Your name *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Phone number</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">What do you need help with?</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="e.g. AC not cooling, need annual tune-up, new unit installation…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button
                onClick={handleConfirm}
                disabled={saving || !form.name.trim()}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Booking…' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
