import { useState, useCallback, useEffect, useRef } from 'react';
import SearchForm from './components/SearchForm.jsx';
import LeadsTable from './components/LeadsTable.jsx';
import DemoPreviewModal from './components/DemoPreviewModal.jsx';
import RebuildSection from './components/RebuildSection.jsx';
import SocialToSiteSection from './components/SocialToSiteSection.jsx';
import ChatbotModal from './components/ChatbotModal.jsx';
import AppointmentsPanel from './components/AppointmentsPanel.jsx';
import ColdEmailModal from './components/ColdEmailModal.jsx';
import ChatbotActivityPanel from './components/ChatbotActivityPanel.jsx';
import ReceptionistPanel from './components/ReceptionistPanel.jsx';
import LoginPage from './components/LoginPage.jsx';
import { searchLeads, getLeads, updateLeadStatus, buildDemoSite, buildChatbotPitch, buildColdEmail } from './api.js';

// ── Main app (only rendered when logged in) ───────────────────────────────
function MainApp({ username, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);
  const [filter, setFilter] = useState('pitch_ready');
  const [sort, setSort] = useState('default');

  const filterRef = useRef(filter);
  const sortRef = useRef(sort);
  useEffect(() => { filterRef.current = filter; }, [filter]);
  useEffect(() => { sortRef.current = sort; }, [sort]);

  const [buildingDemoId, setBuildingDemoId] = useState(null);
  const [buildingChatbotPitchId, setBuildingChatbotPitchId] = useState(null);
  const [activeDemo, setActiveDemo] = useState(null);
  const [chatLead, setChatLead] = useState(null);
  const [coldEmailLead, setColdEmailLead] = useState(null);
  const [coldEmail, setColdEmail] = useState(null);
  const [coldEmailLoading, setColdEmailLoading] = useState(false);
  const [coldEmailError, setColdEmailError] = useState(null);
  const [receptionistLead, setReceptionistLead] = useState(null);
  const [receptionistLoading, setReceptionistLoading] = useState(false);

  const refresh = useCallback(async (query, currentFilter, currentSort) => {
    if (!query) return;
    try {
      const { leads } = await getLeads({
        category: query.category,
        city: query.city,
        filter: currentFilter === 'all' ? undefined : currentFilter,
        sort: currentSort === 'default' ? undefined : currentSort,
      });
      setLeads(leads);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  async function handleSearch(category, city) {
    setLoading(true);
    setError(null);
    try {
      await searchLeads(category, city);
      const query = { category, city };
      setLastQuery(query);
      await refresh(query, filter, sort);
      setTimeout(() => refresh(query, filterRef.current, sortRef.current), 6000);
      setTimeout(() => refresh(query, filterRef.current, sortRef.current), 18000);
      setTimeout(() => refresh(query, filterRef.current, sortRef.current), 35000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateLead(id, patch) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    try {
      await updateLeadStatus(id, patch);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBuildChatbotPitch(lead) {
    setBuildingChatbotPitchId(lead.id);
    setError(null);
    try {
      const { html, preview_url } = await buildChatbotPitch(lead.id);
      setActiveDemo({ leadName: lead.name + ' — Chatbot Pitch', html, preview_url });
    } catch (err) {
      setError(err.message);
    } finally {
      setBuildingChatbotPitchId(null);
    }
  }

  async function handleBuildDemo(lead) {
    setBuildingDemoId(lead.id);
    setError(null);
    try {
      const { html, preview_url } = await buildDemoSite(lead.id);
      setActiveDemo({ leadName: lead.name, html, preview_url });
    } catch (err) {
      setError(err.message);
    } finally {
      setBuildingDemoId(null);
    }
  }

  useEffect(() => {
    if (lastQuery) refresh(lastQuery, filter, sort);
  }, [filter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleColdEmail(lead) {
    setColdEmailLead(lead);
    setColdEmail(null);
    setColdEmailError(null);
    setColdEmailLoading(true);
    try {
      const result = await buildColdEmail(lead.id);
      setColdEmail(result);
    } catch (err) {
      setColdEmailError(err.message);
    } finally {
      setColdEmailLoading(false);
    }
  } // eslint-disable-line react-hooks/exhaustive-deps

  async function handleActivateReceptionist(lead) {
    setReceptionistLoading(true);
    try {
      const token = localStorage.getItem('dwm_token');
      const res = await fetch(`/api/leads/${lead.id}/setup-receptionist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) { alert('Error: ' + data.error); return; }
      setReceptionistLead({ ...lead, receptionist: data.receptionist });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setReceptionistLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Lead Finder</h1>
          <p className="text-sm text-gray-500">Search local businesses, flag who needs a website, track calls.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Signed in as <strong>{username}</strong></span>
          <button onClick={onLogout} className="text-gray-400 hover:text-gray-700 underline text-xs">Sign out</button>
        </div>
      </header>

      <SearchForm onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      {lastQuery && (
        <div className="flex items-center gap-3 mt-4 text-sm">
          <span className="text-gray-500">
            Showing results for <strong>{lastQuery.category}</strong> in <strong>{lastQuery.city}</strong>
          </span>
          <select className="border rounded px-2 py-1 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pitch_ready">Pitch targets (no website)</option>
            <option value="chatbot_pitch">Chatbot targets (has website)</option>
            <option value="not_called">Not called yet</option>
            <option value="called">Called</option>
            <option value="all">All results</option>
          </select>
          <select className="border rounded px-2 py-1 text-xs" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="default">Newest first</option>
            <option value="rating">Rating</option>
            <option value="reviews">Review count</option>
          </select>
        </div>
      )}

      <LeadsTable
        leads={leads}
        onUpdateLead={handleUpdateLead}
        onBuildDemo={handleBuildDemo}
        buildingDemoId={buildingDemoId}
        onBuildChatbotPitch={handleBuildChatbotPitch}
        buildingChatbotPitchId={buildingChatbotPitchId}
        onDemoChat={(lead) => setChatLead(lead)}
        onColdEmail={handleColdEmail}
        onActivateReceptionist={handleActivateReceptionist}
      />

      <AppointmentsPanel />
      <ChatbotActivityPanel />
      <ReceptionistPanel />
      <RebuildSection onPreview={(demo) => setActiveDemo(demo)} />
      <SocialToSiteSection onPreview={(demo) => setActiveDemo(demo)} />
      <DemoPreviewModal demo={activeDemo} onClose={() => setActiveDemo(null)} />

      {chatLead && (
        <ChatbotModal lead={chatLead} onClose={() => setChatLead(null)} />
      )}
      {coldEmailLead && (
        <ColdEmailModal
          lead={coldEmailLead}
          email={coldEmail}
          loading={coldEmailLoading}
          error={coldEmailError}
          onClose={() => { setColdEmailLead(null); setColdEmail(null); }}
        />
      )}
    </div>
  );
}

// ── Auth wrapper ──────────────────────────────────────────────────────────
export default function App() {
  const [token,    setToken]    = useState(() => localStorage.getItem('dwm_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('dwm_username') || '');

  function handleLogin(tok, user) {
    setToken(tok);
    setUsername(user);
  }

  function handleLogout() {
    localStorage.removeItem('dwm_token');
    localStorage.removeItem('dwm_username');
    setToken(null);
    setUsername('');
  }

  if (!token) return <LoginPage onLogin={handleLogin} />;
  return <MainApp username={username} onLogout={handleLogout} />;
}
