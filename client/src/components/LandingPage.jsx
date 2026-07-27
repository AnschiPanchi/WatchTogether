import { useState, useRef, useEffect } from 'react';
import { getSocket } from '../services/socket';
import Particles from './reactbits/Particles';
import ShinyText from './reactbits/ShinyText';
import SpotlightCard from './reactbits/SpotlightCard';
import TiltedCard from './reactbits/TiltedCard';
import MagnetButton from './reactbits/MagnetButton';
import Aurora from './reactbits/Aurora';
import { Play, Sparkles, Zap, MessageSquare, Shield, Share2, User, Key } from 'lucide-react';

export default function LandingPage({ onJoined }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL parameters or path on initial load (e.g. ?room=BED104A9 or /room/BED104A9 or /BED104A9)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let code = params.get('room');

    if (!code) {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const potentialCode = pathParts[pathParts.length - 1];
        if (/^[a-zA-Z0-9]{8}$/.test(potentialCode)) {
          code = potentialCode;
        }
      }
    }

    if (code) {
      setRoomCode(code.toUpperCase());
      setTab('join');
    }
  }, []);

  const socketRef = useRef(getSocket());

  const handleSubmit = () => {
    const name = username.trim();

    if (!name) { setError('Please enter a display name.'); return; }
    if (tab === 'join' && !roomCode.trim()) { setError('Please enter a room code.'); return; }

    setError('');
    setLoading(true);

    const socket = socketRef.current;

    const cleanup = () => {
      socket.off('joined_room');
      socket.off('error_event');
    };

    socket.once('joined_room', (data) => {
      cleanup();
      setLoading(false);
      onJoined({
        roomId: data.roomId,
        userId: data.userId,
        username: name,
        role: data.role,
        participants: data.participants,
        syncState: data.syncState,
        chatHistory: data.chatHistory || [],
      });
    });

    socket.once('error_event', (data) => {
      cleanup();
      setLoading(false);
      setError(data.message || 'Connection failed — is the server running?');
    });

    socket.emit('join_room', {
      roomId: tab === 'join' ? roomCode.trim().toUpperCase() : undefined,
      username: name,
    });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="landing">
      {/* ── ReactBits Aurora Flow & Canvas Particles Background ── */}
      <Aurora colorStops={['#30d870', '#ffd060', '#10b8a8']} speed={0.8} />
      <Particles
        particleCount={60}
        speed={0.15}
        particleColors={['#ffd060', '#30d870', '#ffffff', '#72d4ff']}
        particleBaseSize={80}
        sizeRandomness={1.2}
        className="reactbits-bg-canvas"
      />

      <div className="landing-wrapper">
        {/* Top Header Banner */}
        <header className="landing-nav-header">
          <div className="landing-logo-inline">
            <div className="logo-icon-bg theme-yg-icon" aria-hidden="true">
              <Play className="play-icon-svg" size={20} fill="currentColor" />
            </div>
            <span className="logo-title theme-yg-title">
              WatchParty
            </span>
          </div>
        </header>

        <main className="landing-main-layout">
          {/* Left Column: ReactBits Animated Hero Info */}
          <section className="landing-info-col">
            <div className="info-badge theme-yg-badge">
              <Sparkles size={14} className="badge-sparkle-icon" />
              <ShinyText text="Real-Time YouTube Theater" speed={3} />
            </div>
            <h1 className="info-heading">
              Watch YouTube Together,{' '}
              <ShinyText text="Perfectly in Sync." className="theme-yg-gradient-text" speed={4} />
            </h1>
            <p className="info-description">
              WatchParty connects you and your friends in a high-performance synchronized cinema room. Stream YouTube videos simultaneously with 100ms sync, interactive chat, and Host/Mod controls.
            </p>

            {/* ReactBits Spotlight & Interactive Feature Grid */}
            <div className="info-feature-cards">
              <SpotlightCard className="info-card reactbits-card" spotlightColor="rgba(255, 208, 96, 0.25)">
                <div className="info-card-icon theme-yg-sub-icon">
                  <Zap size={20} />
                </div>
                <div>
                  <h4>100ms Ultra-Sync</h4>
                  <p>Play, pause, and seek actions trigger instant synchronization for all room members.</p>
                </div>
              </SpotlightCard>

              <SpotlightCard className="info-card reactbits-card" spotlightColor="rgba(48, 216, 112, 0.25)">
                <div className="info-card-icon theme-yg-sub-icon">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4>Live Stream Chat</h4>
                  <p>Real-time chat feed with custom host/moderator badges and live message counters.</p>
                </div>
              </SpotlightCard>

              <SpotlightCard className="info-card reactbits-card" spotlightColor="rgba(255, 208, 96, 0.25)">
                <div className="info-card-icon theme-yg-sub-icon">
                  <Shield size={20} />
                </div>
                <div>
                  <h4>Host & Mod Roles</h4>
                  <p>Host controls video changes, promotes moderators, or manages participant access.</p>
                </div>
              </SpotlightCard>

              <SpotlightCard className="info-card reactbits-card" spotlightColor="rgba(48, 216, 112, 0.25)">
                <div className="info-card-icon theme-yg-sub-icon">
                  <Share2 size={20} />
                </div>
                <div>
                  <h4>Instant Social Share</h4>
                  <p>One-click room code sharing directly to WhatsApp, social media, or clipboard.</p>
                </div>
              </SpotlightCard>
            </div>
          </section>

          {/* Right Column: ReactBits Tilted Spotlight Dashboard Card */}
          <section className="landing-card">
            <TiltedCard rotateAmplitude={10} scaleOnHover={1.02}>
              <SpotlightCard className="landing-card-inner theme-yg-card-border reactbits-spotlight-card" spotlightColor="rgba(48, 216, 112, 0.3)">
                <div className="landing-logo">
                  <div className="logo-icon-wrap">
                    <div className="logo-icon-bg theme-yg-icon" aria-hidden="true">
                      <Play className="play-icon-svg" size={22} fill="currentColor" />
                    </div>
                  </div>
                  <div>
                    <h2 className="logo-title theme-yg-title" style={{ fontSize: '24px' }}>
                      <ShinyText text="Join Dashboard" speed={3} />
                    </h2>
                    <p className="logo-sub">Create or enter a room code below</p>
                  </div>
                </div>

                {/* ReactBits Magnet Tab Switcher */}
                <div className="tab-group" role="tablist">
                  <button
                    id="tab-create"
                    role="tab"
                    aria-selected={tab === 'create'}
                    className={`tab-btn ${tab === 'create' ? 'active theme-yg-tab-active' : ''}`}
                    onClick={() => { setTab('create'); setError(''); }}
                  >
                    ✦ Create Room
                  </button>
                  <button
                    id="tab-join"
                    role="tab"
                    aria-selected={tab === 'join'}
                    className={`tab-btn ${tab === 'join' ? 'active theme-yg-tab-active' : ''}`}
                    onClick={() => { setTab('join'); setError(''); }}
                  >
                    ⟶ Join Room
                  </button>
                </div>

                {/* Form Input Groups */}
                <div className="form-group">
                  <label htmlFor="username-input" className="form-label">
                    <User size={12} style={{ display: 'inline', marginRight: 4 }} /> Your Display Name
                  </label>
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

                {tab === 'join' && (
                  <div className="form-group">
                    <label htmlFor="roomcode-input" className="form-label">
                      <Key size={12} style={{ display: 'inline', marginRight: 4 }} /> Room Code
                    </label>
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

                {error && <p className="error-msg" role="alert">{error}</p>}

                {/* ReactBits Magnet Submit Button */}
                <MagnetButton
                  id="submit-btn"
                  className="cta-btn theme-yg-cta-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? <span className="spinner" aria-hidden="true" /> : null}
                  {loading
                    ? 'Connecting…'
                    : tab === 'create'
                      ? '🚀 Launch Theater Room'
                      : '🔗 Enter Room'}
                </MagnetButton>

                <p className="landing-hint" style={{ marginTop: '16px' }}>
                  No account needed. Instant room access.
                </p>
              </SpotlightCard>
            </TiltedCard>
          </section>
        </main>
      </div>
    </div>
  );
}
