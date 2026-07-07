import { useState } from 'react';

const COMMON_CATEGORIES = [
  'HVAC',
  'Plumbing',
  'Roofing',
  'Garage door',
  'Landscaping',
  'Gym',
  'Med spa',
  'Barbershop',
  'Salon',
  'Local restaurant',
];

export default function SearchForm({ onSearch, loading }) {
  const [category, setCategory] = useState('HVAC');
  const [customCategory, setCustomCategory] = useState('');
  const [city, setCity] = useState('Orlando, FL');

  const effectiveCategory = category === '__custom__' ? customCategory : category;

  function handleSubmit(e) {
    e.preventDefault();
    if (!effectiveCategory.trim() || !city.trim()) return;
    onSearch(effectiveCategory.trim(), city.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-500 mb-1">Category</label>
        <select
          className="border rounded px-2 py-1.5 text-sm w-44"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {COMMON_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      </div>

      {category === '__custom__' && (
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 mb-1">Custom category</label>
          <input
            className="border rounded px-2 py-1.5 text-sm w-44"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="e.g. pressure washing"
          />
        </div>
      )}

      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-500 mb-1">City / region</label>
        <input
          className="border rounded px-2 py-1.5 text-sm w-56"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Orlando, FL"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}
