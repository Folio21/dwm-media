import { useState, useRef, useEffect } from 'react';
import { findLeadEmail, sendColdEmail, sendLeadText } from '../api.js';

// Generate a short SMS follow-up text from lead data
function buildTextMessage(lead) {
  const biz  = lead.name || 'your business';
  const cat  = lead.category || 'local business';
  const what = lead.has_website
    ? 'an AI that books jobs and captures leads 24/7 right on your site'
    : 'a professional site + AI chatbot that books jobs and captures leads 24/7';
  return `Hey, this is David from DWM Media — tried calling ${biz} but missed you. I help ${cat} owners get more booked jobs with ${what}. Worth a 5-min call? — David`;
}

// Generate likely email addresses from a website URL (runs in browser, no server needed)
function guessFromWebsite(website) {
  if (!website) return [];
  try {
    let url = website.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const host = new URL(url).hostname.replace(/^www\./, '');
    return ['info', 'contact', 'hello', 'office'].map((p) => `${p}@${host}`);
  } catch {
    return [];
  }
}

export default function ColdEmailModal({ lead, email, loading, error, onClose }) {
  const [copied, setCopied]           = useState(false);
  const [finding, setFinding]         = useState(false);
  const [foundReal, setFoundReal]     = useState([]);    // confirmed from scrape
  const [selectedEmail, setSelectedEmail] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [sendError, setSendError]     = useState('');
  const [textCopied, setTextCopied]   = useState(false);
  const [textSending, setTextSending] = useState(false);
  const [textSent, setTextSent]       = useState(false);
  const [textError, setTextError]     = useState('');
  const bodyRef = useRef(null);
  const textRef = useRef(null);

  const textMessage = buildTextMessage(lead);

  // Domain-pattern suggestions — generated immediately from lead.website
  const suggestions = guessFromWebsite(lead.website);

  // Auto-select first suggestion on open
  useEffect(() => {
    if (suggestions.length > 0 && !selectedEmail) {
      setSelectedEmail(suggestions[0]);
    }
  }, []);

  const toAddress = selectedEmail || customEmail;

  async function handleFindEmail() {
    setFinding(true);
    setSendError('');
    try {
      const result = await findLeadEmail(lead.id);
      const found = result.found || [];
      setFoundReal(found);
      if (found.length > 0) setSelectedEmail(found[0]);
    } catch (e) {
      setSendError('Scrape failed: ' + e.message);
    } finally {
      setFinding(false);
    }
  }

  async function handleSend() {
    if (!toAddress) { setSendError('Select or enter an email address.'); return; }
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
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyText() {
    const msg = textRef.current ? textRef.current.value : textMessage;
    navigator.clipboard.writeText(msg).then(() => {
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    });
  }

  async function handleSendText() {
    const msg = textRef.current ? textRef.current.value : textMessage;
    setTextSending(true);
    setTextError('');
    try {
      await sendLeadText(lead.id, { body: msg });
      setTextSent(true);
    } catch (e) {
      setTextError(e.message);
    } finally {
      setTextSending(false);
    }
  }

  function selectChip(e) {
    setSelectedEmail(e);
    setCustomEmail('');
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

              <hr className="border-gray-100"/>

              {/* Text Message Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">📱 Follow-Up Text</label>
                  <span className="text-xs text-gray-400">{lead.phone || 'No phone on file'}</span>
                </div>
                <textarea
                  ref={textRef}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  defaultValue={textMessage}
                />
                <div className="flex gap-2 mt-2 items-center">
                  <button onClick={copyText}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    {textCopied ? '✓ Copied' : 'Copy Text'}
                  </button>
                  <button onClick={handleSendText}
                    disabled={textSending || textSent || !lead.phone}
                    title={!lead.phone ? 'No phone number on file for this lead' : ''}
                    className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                    {textSending
                      ? <><svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending…</>
                      : textSent ? '✓ Text Sent!' : '📲 Send Text'}
                  </button>
                  {textError && <p className="text-xs text-red-600 flex-1">{textError}</p>}
                  {textSent  && <p className="text-xs text-green-600">Sent to {lead.phone}</p>}
                </div>
              </div>

              <hr className="border-gray-100"/>

              {/* Send To */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Send To</label>

                {/* Confirmed real emails (from scrape) */}
                {foundReal.length > 0 && (
                  <div>
                    <p className="text-xs text-green-600 font-medium mb-1.5">✓ Found on their website:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {foundReal.map((e) => (
                        <button key={e} onClick={() => selectChip(e)}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            selectedEmail === e
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-green-50 text-green-700 border-green-200 hover:border-green-500'
                          }`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domain-pattern suggestions — always visible */}
                {suggestions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">
                      {foundReal.length > 0 ? 'Or try a common pattern:' : 'Common patterns for their domain — pick one to try:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((e) => (
                        <button key={e} onClick={() => selectChip(e)}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            selectedEmail === e && foundReal.length === 0
                              ? 'bg-blue-600 text-white border-blue-600'
                              : selectedEmail === e
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                          }`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!lead.website && (
                  <p className="text-xs text-gray-400">No website on file — enter an email below.</p>
                )}

                {/* Manual override */}
                <input
                  type="email"
                  placeholder="Or type email manually…"
                  value={customEmail}
                  onChange={(e) => { setCustomEmail(e.target.value); setSelectedEmail(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {toAddress && !sent && (
                  <p className="text-xs text-gray-500">Sending to: <span className="font-medium text-gray-700">{toAddress}</span></p>
                )}

                {sendError && <p className="text-xs text-red-600">{sendError}</p>}
                {sent && <p className="text-xs text-green-600 font-medium">✓ Sent to {toAddress}</p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && email && (
          <div className="px-5 py-3 border-t border-gray-100 flex gap-2 justify-between items-center">
            <div className="flex gap-2">
              {lead.website && (
                <button onClick={handleFindEmail} disabled={finding}
                  className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
                  {finding
                    ? <><svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Searching…</>
                    : foundReal.length > 0 ? '✓ Email Found' : '🔍 Search Website'}
                </button>
              )}
              <button onClick={copyAll}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Close
              </button>
              <button onClick={handleSend} disabled={sending || sent || !toAddress}
                className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-40 flex items-center gap-1">
                {sending
                  ? <><svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending…</>
                  : sent ? '✓ Sent!' : '📤 Send Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
