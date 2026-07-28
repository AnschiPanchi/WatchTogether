/**
 * VideoSearch.tsx
 *
 * Modal that lets Host / Moderator switch the room's video.
 * Accepts a full YouTube URL, a youtu.be short link, or a
 * raw 11-character video ID. Falls back to a curated list
 * of thumbnail quick-picks.
 *
 * Why not use the YouTube Data API for search?
 * It requires a server-side API key + quota management.
 * For this MVP, paste-or-quick-pick covers the main flow.
 */

import { useState } from 'react';

/**
 * Extracts a YouTube video ID from various input formats:
 *   - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   - https://youtu.be/dQw4w9WgXcQ
 *   - dQw4w9WgXcQ  (raw ID — always 11 chars)
 */
function extractVideoId(input) {
  const s = input.trim();
  try {
    const url = new URL(s);
    const v = url.searchParams.get('v');
    if (v) return v;
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0] || null;
  } catch {
    // Not a URL — check if it looks like a bare video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  }
  return null;
}

// Hand-picked popular videos with a good variety so new rooms
// don't start with the same thing every time
const QUICK_PICKS = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley – Never Gonna Give You Up' },
  { id: 'jNQXAC9IVRw', title: 'Me at the zoo (first YouTube video)' },
  { id: 'kJQP7kiw5Fk', title: 'Luis Fonsi – Despacito' },
  { id: '9bZkp7q19f0', title: 'PSY – Gangnam Style' },
  { id: 'JGwWNGJdvx8', title: 'Ed Sheeran – Shape of You' },
  { id: 'fJ9rUzIMcZQ', title: 'Queen – Bohemian Rhapsody' },
];

export default function VideoSearch({ onSelect, onAddToQueue, onClose, canControl }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handlePlayNow = (id) => {
    if (!canControl) return;
    const targetId = id || extractVideoId(input);
    if (!targetId) { setError("Couldn't parse a video ID — try pasting the full YouTube URL."); return; }
    onSelect(targetId);
  };

  const handleQueue = async (id) => {
    const targetId = id || extractVideoId(input);
    if (!targetId) { setError("Couldn't parse a video ID — try pasting the full YouTube URL."); return; }

    const match = QUICK_PICKS.find(p => p.id === targetId);
    let title = match ? match.title : '';

    if (!title) {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${targetId}`);
        const data = await res.json();
        if (data && data.title) {
          title = data.title;
        }
      } catch {
        title = 'YouTube Video';
      }
    }

    onAddToQueue(targetId, title || 'YouTube Video');
    setInput('');
    setError('');
  };

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Add or change video">
      <div className="search-modal">
        {/* Header */}
        <div className="search-header">
          <h2 className="search-title gradient-text">Add Video</h2>
          <button id="close-search-btn" className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* URL / ID input */}
        <div className="search-input-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <input
            id="video-url-input"
            className="search-modal-input"
            type="text"
            placeholder="Paste a YouTube URL or video ID…"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleQueue()}
            autoFocus
            style={{ flex: '1 1 200px' }}
          />

          <button
            id="queue-video-btn"
            className="search-modal-btn"
            onClick={() => handleQueue()}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
          >
            + Add to Queue
          </button>

          {canControl && (
            <button
              id="load-video-btn"
              className="search-modal-btn"
              onClick={() => handlePlayNow()}
            >
              Play Now
            </button>
          )}
        </div>

        {error && <p className="error-msg" role="alert">{error}</p>}

        {/* Quick-pick grid */}
        <p className="suggestions-label">Quick picks</p>
        <div className="suggestions-grid">
          {QUICK_PICKS.map((v) => (
            <div key={v.id} className="suggestion-card" style={{ position: 'relative' }}>
              <img
                src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                alt={v.title}
                loading="lazy"
              />
              <span>{v.title}</span>

              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', width: '100%' }}>
                <button
                  onClick={() => handleQueue(v.id)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#6ee7b7',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Queue
                </button>
                {canControl && (
                  <button
                    onClick={() => handlePlayNow(v.id)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '0.75rem',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#a5b4fc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    ▶ Play
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
