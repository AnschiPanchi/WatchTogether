/**
 * LandingPage.tsx
 *
 * The entry screen — lets users create a new room or join
 * an existing one by code. Handles the initial socket handshake
 * and passes the resulting RoomState up to App.
 *
 * Decided to keep the socket connection logic here rather than
 * in a separate hook because this component is the only place
 * that needs it before a room exists. Once inside a room,
 * WatchRoom takes over with its own listeners.
 */

import { useState, useRef } from 'react';
import { getSocket } from '../socket';
import type { RoomState } from '../types';

interface Props {
  onJoined: (state: RoomState) => void;
}

export default function LandingPage({ onJoined }: Props) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab]           = useState<'create' | 'join'>('create');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Hold the socket in a ref — we don't want re-renders from socket changes
  const socketRef = useRef(getSocket());

  const handleSubmit = () => {
    const name = username.trim();

    if (!name) { setError('Please enter a display name.'); return; }
    if (tab === 'join' && !roomCode.trim()) { setError('Please enter a room code.'); return; }

    setError('');
    setLoading(true);

    const socket = socketRef.current;

    // Clean up both listeners regardless of which fires first
    const cleanup = () => {
      socket.off('joined_room');
      socket.off('error_event');
    };

    socket.once('joined_room', (data) => {
      cleanup();
      setLoading(false);
      onJoined({
        roomId:       data.roomId,
        userId:       data.userId,
        username:     name,
        role:         data.role,
        participants: data.participants,
        syncState:    data.syncState,
        chatHistory:  data.chatHistory || [],
      });
    });

    socket.once('error_event', (data) => {
      cleanup();
      setLoading(false);
      setError(data.message || 'Connection failed — is the server running?');
    });

    // If no roomId, server auto-creates a room and makes sender the host
    socket.emit('join_room', {
      roomId:   tab === 'join' ? roomCode.trim().toUpperCase() : undefined,
      username: name,
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="landing">
      {/* Rising bubbles — purely decorative, CSS-animated */}
      <div className="bg-bubbles" aria-hidden="true">
        {[{s:18,l:8, dur:9, delay:0}, {s:10,l:18,dur:12,delay:2},{s:25,l:35,dur:7, delay:1},
          {s:12,l:55,dur:14,delay:4},{s:20,l:70,dur:10,delay:0},{s:8, l:82,dur:8, delay:3},
          {s:30,l:92,dur:11,delay:5},{s:14,l:48,dur:13,delay:1},{s:22,l:62,dur:9, delay:6}]
          .map((b,i) => (
            <div
              key={i}
              className="bubble"
              style={{
                width: b.s, height: b.s,
                left: `${b.l}%`,
                ['--dur' as string]: `${b.dur}s`,
                ['--delay' as string]: `${b.delay}s`,
              }}
            />
          ))}
      </div>

      <div className="landing-card">
        <div className="landing-card-inner">
          {/* ── Logo ────────────────────────── */}
          <div className="landing-logo">
            <div className="logo-icon-wrap">
              <div className="logo-icon-bg" aria-hidden="true">▶</div>
            </div>
            <div>
              <h1 className="logo-title gradient-text">WatchParty</h1>
              <p className="logo-sub">Watch YouTube together — perfectly in sync.</p>
            </div>
          </div>

          {/* ── Tab: Create / Join ──────────── */}
          <div className="tab-group" role="tablist">
            <button
              id="tab-create"
              role="tab"
              aria-selected={tab === 'create'}
              className={`tab-btn ${tab === 'create' ? 'active' : ''}`}
              onClick={() => { setTab('create'); setError(''); }}
            >
              ✦ Create Room
            </button>
            <button
              id="tab-join"
              role="tab"
              aria-selected={tab === 'join'}
              className={`tab-btn ${tab === 'join' ? 'active' : ''}`}
              onClick={() => { setTab('join'); setError(''); }}
            >
              ⟶ Join Room
            </button>
          </div>

          {/* ── Username ────────────────────── */}
          <div className="form-group">
            <label htmlFor="username-input" className="form-label">Your Name</label>
            <div className="input-wrap">
              <input
                id="username-input"
                className="input-field"
                type="text"
                placeholder="How should we call you?"
                value={username}
                maxLength={32}
                autoComplete="off"
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
          </div>

          {/* ── Room code (join mode only) ──── */}
          {tab === 'join' && (
            <div className="form-group">
              <label htmlFor="roomcode-input" className="form-label">Room Code</label>
              <div className="input-wrap">
                <input
                  id="roomcode-input"
                  className="input-field"
                  type="text"
                  placeholder="8-character code (e.g. AB3D7F2E)"
                  value={roomCode}
                  maxLength={8}
                  autoComplete="off"
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKey}
                />
              </div>
            </div>
          )}

          {/* ── Error ───────────────────────── */}
          {error && <p className="error-msg" role="alert">{error}</p>}

          {/* ── Submit ──────────────────────── */}
          <button
            id="submit-btn"
            className="cta-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <span className="spinner" aria-hidden="true" /> : null}
            {loading
              ? 'Connecting…'
              : tab === 'create'
              ? '🚀 Create Room'
              : '🔗 Join Room'}
          </button>

          <p className="landing-hint">
            No account needed. Share the room code and watch together.
          </p>
        </div>
      </div>
    </div>
  );
}


