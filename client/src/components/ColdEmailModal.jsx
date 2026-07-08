import { useState } from 'react';

export default function ColdEmailModal({ lead, email, loading, error, onClose }) {
  const [copied, setCopied] = useState(false);

  function copyAll() {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

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
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={10}
                  defaultValue={email.body}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && email && (
          <div className="px-5 py-3 border-t border-gray-100 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={copyAll}
              className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              {copied ? '✓ Copied!' : 'Copy Subject + Body'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
