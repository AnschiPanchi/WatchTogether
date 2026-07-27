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
    const v   = url.searchParams.get('v');
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

export default function VideoSearch({ onSelect, onClose, canControl }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleLoad = () => {
    if (!canControl) return;
    const id = extractVideoId(input);
    if (!id) { setError("Couldn't parse a video ID — try pasting the full YouTube URL."); return; }
    onSelect(id);
  };

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Change video">
      <div className="search-modal">
        {/* Header */}
        <div className="search-header">
          <h2 className="search-title gradient-text">Change Video</h2>
          <button id="close-search-btn" className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!canControl ? (
          <p className="no-perm-msg">🔒 Only the Host or a Moderator can change the video.</p>
        ) : (
          <>
            {/* URL / ID input */}
            <div className="search-input-row">
              <input
                id="video-url-input"
                className="search-modal-input"
                type="text"
                placeholder="Paste a YouTube URL or video ID…"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                autoFocus
              />
              <button id="load-video-btn" className="search-modal-btn" onClick={handleLoad}>
                Load
              </button>
            </div>

            {error && <p className="error-msg" role="alert">{error}</p>}

            {/* Quick-pick grid */}
            <p className="suggestions-label">Quick picks</p>
            <div className="suggestions-grid">
              {QUICK_PICKS.map((v) => (
                <button
                  key={v.id}
                  id={`pick-${v.id}`}
                  className="suggestion-card"
                  onClick={() => onSelect(v.id)}
                  title={v.title}
                >
                  <img
                    src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                    alt={v.title}
                    loading="lazy"
                  />
                  <span>{v.title}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
