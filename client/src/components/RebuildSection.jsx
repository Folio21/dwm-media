import { useState } from 'react';
import { rebuildSite } from '../api.js';

export default function RebuildSection({ onPreview }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleRebuild(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { html, preview_url, scraped } = await rebuildSite(url.trim());
      const label = scraped?.title || url.trim();
      onPreview({ leadName: label, html, preview_url });
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 bg-white border rounded-lg shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Rebuild Any Website</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Drop any URL below — we'll scrape it, strip out the old design, and rebuild it
          as a modern, SEO-optimized site in about 30 seconds.
        </p>
      </div>

      <form onSubmit={handleRebuild} className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col flex-1 min-w-[260px]">
          <label className="text-xs font-medium text-gray-500 mb-1">Website URL</label>
          <input
            type="text"
            className="border rounded px-3 py-2 text-sm w-full"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Rebuilding…
            </span>
          ) : (
            'Rebuild Site'
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {loading && (
        <p className="mt-3 text-xs text-gray-400">
          Scraping the existing site and generating the rebuild — this usually takes 20–40 seconds.
        </p>
      )}
    </div>
  );
}
