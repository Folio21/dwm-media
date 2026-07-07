import { useState } from 'react';

export default function DemoPreviewModal({ demo, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!demo) return null;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(demo.preview_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can fail without permissions; not critical
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{demo.leadName} — Demo preview</h2>
            <p className="text-xs text-gray-500">
              Live demo — chatbot and appointment booking are fully functional.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={demo.preview_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              Open in new tab
            </a>
            <button
              onClick={handleCopyLink}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              {copied ? 'Copied!' : 'Copy shareable link'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <iframe
          title="Demo site preview"
          src={demo.preview_url}
          className="flex-1 w-full rounded-b-lg"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
