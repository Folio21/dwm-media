import { useState } from 'react';

const CALL_STATUSES = [
  'Not called',
  'No answer',
  'Voicemail',
  'Sent pricing',
  'Callback',
  'Not interested',
  'Booked',
];

function PitchBadge({ hasWebsite }) {
  return hasWebsite ? (
    <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Has website</span>
  ) : (
    <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">No website</span>
  );
}

export default function LeadsTable({ leads, onUpdateLead, onBuildDemo, buildingDemoId, onBuildChatbotPitch, buildingChatbotPitchId, onDemoChat }) {
  const [editingNotes, setEditingNotes] = useState({});
  const [editingOwner, setEditingOwner] = useState({});

  function handleNotesChange(id, value) {
    setEditingNotes((prev) => ({ ...prev, [id]: value }));
  }

  function handleNotesBlur(id) {
    if (editingNotes[id] !== undefined) {
      onUpdateLead(id, { notes: editingNotes[id] });
    }
  }

  function handleOwnerChange(id, value) {
    setEditingOwner((prev) => ({ ...prev, [id]: value }));
  }

  function handleOwnerBlur(id, currentName) {
    const val = editingOwner[id];
    if (val !== undefined) {
      onUpdateLead(id, { owner_name: val });
      setEditingOwner((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  if (!leads.length) {
    return <p className="text-sm text-gray-500 mt-6">No leads yet — run a search above.</p>;
  }

  return (
    <div className="overflow-x-auto mt-4 border rounded-lg bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Website</th>
            <th className="px-3 py-2">Rating</th>
            <th className="px-3 py-2">Phone / Owner</th>
            <th className="px-3 py-2">Address</th>
            <th className="px-3 py-2">Open</th>
            <th className="px-3 py-2">Call status</th>
            <th className="px-3 py-2">Notes</th>
            <th className="px-3 py-2">Demo site</th>
            <th className="px-3 py-2">Chatbot pitch</th>
            <th className="px-3 py-2">Live chat</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {leads.map((lead) => {
            const isEditingOwner = editingOwner[lead.id] !== undefined;

            return (
              <tr key={lead.id} className="align-top">
                <td className="px-3 py-2 font-medium text-gray-900">{lead.name}</td>
                <td className="px-3 py-2">
                  <PitchBadge hasWebsite={!!lead.has_website} />
                  {lead.website_url && (
                    <a
                      href={lead.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-blue-600 truncate max-w-[160px] mt-0.5"
                    >
                      {lead.website_url}
                    </a>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {lead.rating ? `${lead.rating}★ (${lead.review_count ?? 0})` : '—'}
                </td>

                {/* Phone / Owner */}
                <td className="px-3 py-2">
                  <div className="whitespace-nowrap font-medium">{lead.phone || '—'}</div>

                  {/* Owner name — auto-populated, click to edit */}
                  {lead.owner_name && !isEditingOwner ? (
                    <div
                      className="text-xs text-gray-700 mt-1 cursor-pointer hover:underline hover:text-blue-600"
                      title="Click to edit"
                      onClick={() =>
                        setEditingOwner((prev) => ({ ...prev, [lead.id]: lead.owner_name }))
                      }
                    >
                      {lead.owner_name}
                    </div>
                  ) : (
                    <input
                      className="border rounded px-1.5 py-0.5 text-xs w-32 mt-1"
                      placeholder="Owner name"
                      value={isEditingOwner ? editingOwner[lead.id] : ''}
                      onChange={(e) => handleOwnerChange(lead.id, e.target.value)}
                      onBlur={() => handleOwnerBlur(lead.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') {
                          setEditingOwner((prev) => {
                            const next = { ...prev };
                            delete next[lead.id];
                            return next;
                          });
                        }
                      }}
                    />
                  )}
                </td>

                <td className="px-3 py-2 max-w-[220px]">{lead.address || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {lead.open_now === 1 ? (
                    <span className="text-green-600">Open</span>
                  ) : lead.open_now === 0 ? (
                    <span className="text-gray-400">Closed</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-1.5 py-1 text-xs"
                    value={lead.call_status}
                    onChange={(e) => onUpdateLead(lead.id, { call_status: e.target.value })}
                  >
                    {CALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <textarea
                    className="border rounded px-1.5 py-1 text-xs w-44 h-14"
                    value={editingNotes[lead.id] !== undefined ? editingNotes[lead.id] : lead.notes || ''}
                    onChange={(e) => handleNotesChange(lead.id, e.target.value)}
                    onBlur={() => handleNotesBlur(lead.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onBuildDemo(lead)}
                    disabled={buildingDemoId === lead.id}
                    className="text-xs px-2.5 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {buildingDemoId === lead.id ? 'Building…' : 'Build Demo Website'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onBuildChatbotPitch(lead)}
                    disabled={buildingChatbotPitchId === lead.id}
                    className="text-xs px-2.5 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {buildingChatbotPitchId === lead.id ? 'Building…' : '🤖 Build Chatbot Pitch'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onDemoChat(lead)}
                    className="text-xs px-2.5 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                  >
                    💬 Demo Chat
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
