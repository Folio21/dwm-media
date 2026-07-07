import { useState } from 'react';
import { socialToSite } from '../api.js';

const PLATFORMS = ['Instagram', 'Facebook', 'Twitter / X'];

export default function SocialToSiteSection({ onPreview }) {
  const [url, setUrl]               = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [location, setLocation]     = useState('');
  const [services, setServices]     = useState('');
  const [bio, setBio]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [showExtras, setShowExtras] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await socialToSite({
        url: url.trim(),
        businessName: businessName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        services: services.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      const label = businessName || result.scraped?.title || url.trim();
      onPreview({ leadName: label, html: result.html, preview_url: result.preview_url });
      // reset
      setUrl(''); setBusinessName(''); setPhone(''); setEmail('');
      setLocation(''); setServices(''); setBio(''); setShowExtras(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 bg-white border rounded-lg shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Social Media → Website</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Paste an Instagram, Facebook, or Twitter/X page URL. We'll pull what we can automatically —
          add any extra details below to make the site more complete.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL row */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col flex-1 min-w-[260px]">
            <label className="text-xs font-medium text-gray-500 mb-1">
              Instagram / Facebook / Twitter URL
            </label>
            <input
              type="text"
              className="border rounded px-3 py-2 text-sm w-full"
              placeholder="https://www.instagram.com/yourbusiness"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <button
            type="button"
            className="text-xs text-indigo-600 hover:underline whitespace-nowrap pb-2"
            onClick={() => setShowExtras((v) => !v)}
          >
            {showExtras ? 'Hide extra details ▲' : '+ Add extra details (recommended)'}
          </button>
        </div>

        {/* Extra details */}
        {showExtras && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 border rounded-lg p-4">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500 mb-1">Business name</label>
              <input className="border rounded px-2 py-1.5 text-sm" value={businessName}
                onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Mike's Plumbing" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500 mb-1">Phone number</label>
              <input className="border rounded px-2 py-1.5 text-sm" value={phone}
                onChange={(e) => setPhone(e.target.value)} placeholder="(407) 555-1234" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500 mb-1">Email</label>
              <input className="border rounded px-2 py-1.5 text-sm" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="hello@business.com" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500 mb-1">City / location</label>
              <input className="border rounded px-2 py-1.5 text-sm" value={location}
                onChange={(e) => setLocation(e.target.value)} placeholder="Orlando, FL" />
            </div>
            <div className="flex flex-col sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1">Services / what they offer</label>
              <textarea className="border rounded px-2 py-1.5 text-sm h-20 resize-none" value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="e.g. AC repair, installation, maintenance, emergency service" />
            </div>
            <div className="flex flex-col sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1">Bio / about (paste from profile)</label>
              <textarea className="border rounded px-2 py-1.5 text-sm h-20 resize-none" value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Paste their Instagram bio or Facebook About section here" />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="bg-pink-600 text-white text-sm font-semibold px-5 py-2 rounded hover:bg-pink-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Building…
            </>
          ) : (
            'Build Website from Profile'
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
          Pulling profile data and generating the site — usually 20–40 seconds.
        </p>
      )}
    </div>
  );
}
