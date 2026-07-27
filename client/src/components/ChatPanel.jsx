/**
 * ChatPanel.tsx
 *
 * In-room text chat. Messages are stored in WatchRoom state
 * (capped at 200) and passed in as a prop — ChatPanel is
 * purely presentational with one outbound callback (onSend).
 *
 * The auto-scroll ref approach (scrolling to a sentinel div)
 * is more reliable than scrollTop arithmetic when new messages
 * have variable heights.
 */

import { useState, useRef, useEffect } from 'react';

// Maps roles to their indicator icon shown before the author name
const ROLE_ICON = {
  host:        '👑',
  moderator:   '🛡️',
  participant: '',
};

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({ messages, myUserId, onSend }) {
  const [input, setInput]   = useState('');
  const bottomRef           = useRef(null);

  // Scroll to bottom whenever messages list grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <div className="chat-panel">
      <div className="panel-header">
        <span>
          <span className="live-dot" style={{ marginRight: 7 }} aria-hidden="true" />
          Chat
        </span>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
          {messages.length} msg{messages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Message log ──────────────────────── */}
      <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <p className="chat-empty">
            No messages yet.<br />Be the first to say hi! 👋
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-msg ${msg.userId === myUserId ? 'mine' : ''}`}
            >
              {/* Meta row: icon + author name + timestamp */}
              <div className="chat-meta">
                {ROLE_ICON[msg.role] && (
                  <span className="chat-role-icon" aria-hidden="true">
                    {ROLE_ICON[msg.role]}
                  </span>
                )}
                <span className="chat-author">{msg.username}</span>
                <span className="chat-time">{formatTime(msg.timestamp)}</span>
              </div>

              {/* The message bubble itself */}
              <p className="chat-text">{msg.message}</p>
            </div>
          ))
        )}
        {/* Invisible sentinel that we scroll into view */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* ── Input row ────────────────────────── */}
      <div className="chat-input-row">
        <input
          id="chat-input"
          className="chat-input"
          type="text"
          placeholder="Say something…"
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          aria-label="Chat message input"
        />
        <button
          id="chat-send-btn"
          className="chat-send-btn"
          onClick={send}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
}


