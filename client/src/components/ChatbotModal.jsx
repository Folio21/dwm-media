import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api.js';
import SchedulerWidget from './SchedulerWidget.jsx';

// Keywords that indicate the customer wants to book/schedule
const SCHEDULING_RE = /schedule|appointment|book|visit|available|come in|service call|when can|open next|come out|set me up|set up/i;

export default function ChatbotModal({ lead, onClose }) {
  // displayMessages: what's shown in UI — text bubbles + widget cards
  const [displayMessages, setDisplayMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! 👋 I'm the AI assistant for ${lead.name}. Ask me anything about our services, pricing, or hours — or tap below to book an appointment.`,
    },
  ]);
  // apiHistory: only real user/assistant text turns (no widget entries)
  const [apiHistory, setApiHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedulerShown, setSchedulerShown] = useState(false);
  const [schedulerDone, setSchedulerDone] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Show scheduler inline when a confirmed booking happens
  function handleScheduled({ date, time, name }) {
    setSchedulerDone(true);
    setDisplayMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `You're all set, ${name}! 🎉 We've got you down for ${date} at ${time}. We'll be in touch to confirm. Is there anything else I can help you with?`,
      },
    ]);
    setApiHistory((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Appointment scheduled for ${name} on ${date} at ${time}.`,
      },
    ]);
  }

  // Show the scheduler widget inline in the chat
  function showScheduler() {
    if (schedulerShown) return;
    setDisplayMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: "I'd love to help you schedule that! Pick a date and time that works for you:",
      },
      { type: 'scheduler' },
    ]);
    setApiHistory((prev) => [
      ...prev,
      { role: 'assistant', content: "I'd love to help you schedule that! Pick a date and time below." },
    ]);
    setSchedulerShown(true);
  }

  async function handleSendText(text) {
    if (!text || loading) return;

    const isScheduling = SCHEDULING_RE.test(text) && !schedulerShown;
    const userMsg = { role: 'user', content: text };
    const newHistory = [...apiHistory, userMsg];

    setDisplayMessages((prev) => [...prev, userMsg]);
    setApiHistory(newHistory);
    setInput('');

    // For scheduling intent, skip the API and inject the scheduler immediately
    if (isScheduling) {
      setDisplayMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'd love to help you schedule that! Pick a date and time that works for you:" },
        { type: 'scheduler' },
      ]);
      setApiHistory((prev) => [
        ...prev,
        { role: 'assistant', content: "I'd love to help you schedule that! Pick a date and time below." },
      ]);
      setSchedulerShown(true);
      return;
    }

    setLoading(true);
    try {
      const reply = await sendChatMessage(lead.id, newHistory);
      const assistantMsg = { role: 'assistant', content: reply.content };
      setDisplayMessages((prev) => [...prev, assistantMsg]);
      setApiHistory((prev) => [...prev, assistantMsg]);
    } catch {
      setDisplayMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again or call us directly!' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    await handleSendText(input.trim());
  }

  const quickPrompts = [
    { label: 'What services do you offer?', text: 'What services do you offer?' },
    { label: 'What are your hours?', text: 'What are your hours?' },
    { label: '📅 Book an appointment', text: 'I need to schedule a visit', schedule: true },
    { label: 'How much does it cost?', text: 'How much does it cost?' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ height: '640px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          <div>
            <div className="text-white font-semibold">{lead.name}</div>
            <div className="text-blue-200 text-xs mt-0.5">
              AI Chatbot Demo — this is what your website visitors would see
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none transition-colors">
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0">
          {displayMessages.map((msg, i) => {
            // Scheduler widget card
            if (msg.type === 'scheduler') {
              return (
                <div key={i} className="w-full">
                  {schedulerDone ? null : (
                    <SchedulerWidget lead={lead} onScheduled={handleScheduled} />
                  )}
                </div>
              );
            }

            // Normal text bubble
            return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-400 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 text-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '120ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '240ms' }}>●</span>
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick prompts — only while conversation is fresh */}
        {apiHistory.length === 0 && !schedulerShown && (
          <div className="px-3 py-2 flex gap-1.5 flex-wrap bg-gray-50 border-t border-gray-100 flex-shrink-0">
            {quickPrompts.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSendText(p.text)}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Book appointment button — shown after conversation starts, if not booked */}
        {apiHistory.length > 0 && !schedulerShown && (
          <div className="px-3 py-2 border-t bg-gray-50 flex-shrink-0">
            <button
              onClick={() => handleSendText('I need to schedule a visit')}
              className="w-full text-xs py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              📅 Book an Appointment
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2 px-3 py-3 border-t bg-white flex-shrink-0">
          <input
            ref={inputRef}
            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>

        {/* Tagline */}
        <div className="text-center text-xs text-gray-400 pb-2 bg-white flex-shrink-0">
          AI-powered · Books appointments 24/7 · No phone call needed
        </div>
      </div>
    </div>
  );
}
