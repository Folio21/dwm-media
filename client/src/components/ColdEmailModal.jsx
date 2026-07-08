import { useState, useRef } from 'react';
import { findLeadEmail, sendColdEmail } from '../api.js';

export default function ColdEmailModal({ lead, email, loading, error, onClose }) {
  const [copied, setCopied]         = useState(false);
  const [finding, setFinding]       = useState(false);
  const [foundEmails, setFoundEmails] = useState(null); // null = not searched yet
  const [selectedEmail, setSelectedEmail] = useState('');
  const [customEmail, setCustomEmail]     = useState('');
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [sendError, setSendError]   = useState('');
  const bodyRef = useRef(null);

  const toAddress = selectedEmail || customEmail;

  async function handleFindEmail() {
    setFinding(true);
    setSendError('');
    try {
      const result = await findLeadEmail(lead.id);
      // result = { found: string[], guessed: {email, guessed}[] }
      const found   = result.found   || [];
      const guessed = result.guessed || [];
      const all = [
        ...found.map((e) => ({ email: e, guessed: false })),
        ...guessed,
      ];
      setFoundEmails(all);
      if (found.length > 0)        setSelectedEmail(found[0]);
      else if (guessed.length > 0) setSelectedEmail(guessed[0].email);
      else                         setSelectedEmail('');
    } catch (e) {
      setSendError('Could not scrape site: ' + e.message);
      setFoundEmails([]);
    } finally {
      setFinding(false);
    }
  }

  async function handleSend() {
    if (!toAddress) { setSendError('Enter or find an email address first.'); return; }
    if (!email?.subject || !email?.body) return;
    const body = bodyRef.current ? bodyRef.current.value : email.body;
    setSending(true);
    setSendError('');
    try {
      await sendColdEmail(lead.id, { to: toAddress, subject: email.subject, body });
      setSent(true);
    } catch (e) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  }

  function copyAll() {
    const body = bodyRef.current ? bodyRef.current.value : email.body;
    const text = `Subject: ${email.subject}\n\n${body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">✉️ Cold Email</h2>
            <p className="text-xs text-gray-400 mt-0.5">{lead.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Generating spinner */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Writing email…
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          )}

          {!loading && !error && email && (
            <>
              {/* Subject */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Subject</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
                  {email.subject}
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Body</label>
                <textarea
                  ref={bodyRef}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={9}
                  defaultValue={email.body}
                />
              </div>

              {/* Divider */}
              <hr className="border-gray-100"/>

              {/* Email destination section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Send To</label>

                {/* Found / guessed email chips */}
                {foundEmails !== null && foundEmails.length > 0 && (
                  <div className="space-y-2">
                    {/* Check if any are real finds vs all guessed */}
                    {foundEmails.some((e) => !e.guessed) && (
                      <div className="flex flex-wrap gap-1.5">
                        {foundEmails.filter((e) => !e.guessed).map(({ email: e }) => (
                          <button
                            key={e}
                            onClick={() => { setSelectedEmail(e); setCustomEmail(''); }}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                              selectedEmail === e
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                    {foundEmails.some((e) => e.guessed) && (
                      <div>
                        <p className="text-xs text-amber-600 mb-1">⚠️ No email found — these are common patterns for their domain (unverified):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {foundEmails.filter((e) => e.guessed).map(({ email: e }) => (
                            <button
                              key={e}
                              onClick={() => { setSelectedEmail(e); setCustomEmail(''); }}
                              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                selectedEmail === e
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
                              }`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {foundEmails !== null && foundEmails.length === 0 && (
                  <p className="text-xs text-gray-400">Nothing found — enter an email below or try calling first.</p>
                )}

                {/* Manual input */}
                <input
                  type="email"
                  placeholder={selectedEmail || 'Enter email manually…'}
                  value={customEmail}
                  onChange={(e) => { setCustomEmail(e.target.value); setSelectedEmail(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {sendError && (
                  <p className="text-xs text-red-600">{sendError}</p>
                )}

                {sent && (
                  <p className="text-xs text-green-600 font-medium">✓ Email sent to {toAddress}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && email && (
          <div className="px-5 py-3 border-t border-gray-100 flex gap-2 justify-between items-center">
            {/* Left: find + copy */}
            <div className="flex gap-2">
              <button
                onClick={handleFindEmail}
                disabled={finding || !lead.website}
                title={!lead.website ? 'No website on file for this lead' : ''}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {finding ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Searching…
                  </>
                ) : '🔍 Find Email'}
              </button>

              <button
                onClick={copyAll}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Right: send + close */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleSend}
                disabled={sending || sent || !toAddress}
                className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Sending…
                  </>
                ) : sent ? '✓ Sent!' : '📤 Send Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
