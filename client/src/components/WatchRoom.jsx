/**
 * WatchRoom.tsx
 *
 * Full game-HUD layout: the video fills the entire viewport
 * and all controls float on top as HUD panels — left nav tiles,
 * right info column, bottom chat strip.
 *
 * Panel visibility is tracked locally; none of them affect
 * the underlying player. Each nav tile toggles its panel.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import YouTubePlayer from './YouTubePlayer';
import ParticipantList from './ParticipantList';
import ChatPanel from './ChatPanel';
import VideoSearch from './VideoSearch';
import QueuePanel from './QueuePanel';

export default function WatchRoom({ roomState: initial, onLeave }) {
  const socket = getSocket();

  // ── Room state ────────────────────────────────────────────────
  const [participants, setParticipants] = useState(initial.participants);
  const [myRole, setMyRole] = useState(initial.role);
  const [syncState, setSyncState] = useState(initial.syncState);
  const [queue, setQueue] = useState(initial.syncState.queue || []);
  const [chatMessages, setChatMessages] = useState(initial.chatHistory || []);

  const [showLeftNav, setShowLeftNav] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [mobileTab, setMobileTab] = useState('chat');

  // ── HUD panel visibility ──────────────────────────────────────
  // Closed by default when entering the room; opens when clicked
  const [activePanel, setActivePanel] = useState(null);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);

  const togglePanel = (panel) =>
    setActivePanel(prev => prev === panel ? null : panel);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  // ── Mobile Background & Visibility Listener ─────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected) {
          socket.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket]);

  // ── Socket events ─────────────────────────────────────────────
  useEffect(() => {
    const onSyncState = (data) => {
      setSyncState(data);
      if (Array.isArray(data.queue)) {
        setQueue(data.queue);
      }
    };

    const onUserJoined = (data) => {
      setParticipants(data.participants);
      showToast(`${data.username} joined`);
    };

    const onUserLeft = (data) => {
      setParticipants(data.participants);
      showToast(`${data.username} left`);
      if (data.newHostId === socket.id) { setMyRole('host'); showToast('👑 You are now the host!'); }
    };

    const onRoleAssigned = (data) => {
      setParticipants(data.participants);
      const me = data.participants.find(p => p.userId === socket.id);
      if (me) {
        setMyRole(me.role);
      }
      if (data.userId === socket.id) {
        showToast(`Role updated: ${data.role}`);
      }
    };

    const onParticipantRemoved = (data) => setParticipants(data.participants);
    const onRemovedFromRoom = () => { alert('You were removed from the room.'); onLeave(); };
    const onChatMessage = (msg) => setChatMessages(prev => [...prev.slice(-199), msg]);
    const onErrorEvent = (data) => {
      showToast(`🔒 ${data.message || 'Only Host or Moderator can perform this action.'}`);
    };

    socket.on('sync_state', onSyncState);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('role_assigned', onRoleAssigned);
    socket.on('participant_removed', onParticipantRemoved);
    socket.on('removed_from_room', onRemovedFromRoom);
    socket.on('chat_message', onChatMessage);
    socket.on('error_event', onErrorEvent);

    return () => {
      socket.off('sync_state', onSyncState);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('role_assigned', onRoleAssigned);
      socket.off('participant_removed', onParticipantRemoved);
      socket.off('removed_from_room', onRemovedFromRoom);
      socket.off('chat_message', onChatMessage);
      socket.off('error_event', onErrorEvent);
    };
  }, [socket, onLeave, showToast]);

  // ── Helpers ───────────────────────────────────────────────────
  const canControl = myRole === 'host' || myRole === 'moderator';

  const handlePlay = () => socket.emit('play', {});
  const handlePause = (t) => socket.emit('pause', { currentTime: t });
  const handleSeek = (time) => socket.emit('seek', { time });

  const handleChangeVideo = (videoId) => {
    socket.emit('change_video', { videoId });
    setActivePanel(null);
  };

  const handleAddToQueue = (videoId, title) => {
    socket.emit('add_to_queue', { videoId, title });
    showToast('Added video to waiting list!');
    setActivePanel(null);
  };

  const handleRemoveQueueItem = (itemId) => {
    socket.emit('remove_from_queue', { itemId });
  };

  const handleSkipNext = () => {
    socket.emit('next_video', {});
  };

  const handleVideoEnded = () => {
    if (queue.length > 0) {
      socket.emit('next_video', {});
    }
  };

  const handleLeave = () => { socket.emit('leave_room', { roomId: initial.roomId }); onLeave(); };
  const handleAssignRole = (uid, role) => socket.emit('assign_role', { userId: uid, role });
  const handleRemoveParticipant = (uid) => socket.emit('remove_participant', { userId: uid });
  const handleTransferHost = (uid) => socket.emit('transfer_host', { userId: uid });
  const handleSendChat = (msg) => socket.emit('chat_message', { message: msg });

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        if (window.screen?.orientation && 'lock' in window.screen.orientation) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
          if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
            window.screen.orientation.unlock();
          }
        }).catch(() => {});
      }
    }
  };

  const [shareDropdown, setShareDropdown] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(initial.roomId).then(() => {
      setCopied(true);
      showToast('Room Code copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareToPlatform = (platform) => {
    setShareDropdown(false);
    const roomUrl = `${window.location.origin}/?room=${initial.roomId}`;
    const shareText = `Join my WatchParty room to watch YouTube together in sync!\n\nRoom Code: ${initial.roomId}\nDirect Link: ${roomUrl}`;

    if (platform === 'whatsapp') {
      const waText = `Hey! Join my WatchParty room to watch YouTube together in real-time!\n\nRoom Code: *${initial.roomId}*\nClick to join directly: ${roomUrl}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(roomUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'discord') {
      navigator.clipboard.writeText(`${shareText}`).then(() => {
        showToast('Invite copied! Opening Discord…');
        window.open('https://discord.com/channels/@me', '_blank');
      });
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(roomUrl).then(() => {
        showToast('Direct Room Link copied!');
      });
    }
  };

  const shareNative = () => {
    const roomUrl = `${window.location.origin}/?room=${initial.roomId}`;
    const text = `Join my WatchParty room! Room Code: ${initial.roomId}`;
    if (navigator.share) {
      navigator.share({
        title: 'WatchParty Room',
        text: text,
        url: roomUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(roomUrl).then(() => {
        showToast('Direct Room Link copied to clipboard!');
      });
    }
  };

  // ── Dragging State ────────────────────────────────────────────
  const [panelPos, setPanelPos] = useState({ x: 144, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: panelPos.x,
      startPosY: panelPos.y,
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPanelPos({
      x: dragRef.current.startPosX + dx,
      y: dragRef.current.startPosY + dy,
    });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  // ── Left nav tiles definition ─────────────────────────────────
  const navTiles = [
    { id: 'video', icon: '🎬', label: 'Add Video', show: true, color: 'gold' },
    { id: 'queue', icon: '📑', label: `Queue (${queue.length})`, show: true, color: 'cyan' },
    { id: 'chat', icon: '💬', label: 'Chat', show: true, color: 'orange' },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="game-room">

      {/* ── Full-screen video world ───────── */}
      <div className="game-world">
        <YouTubePlayer
          syncState={syncState}
          canControl={canControl}
          myUserId={socket.id || ''}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onEnded={handleVideoEnded}
          onPermissionDenied={showToast}
        />
      </div>

      {/* ── HUD overlay ──────────────────── */}
      <div className="game-hud" aria-label="Room controls">

        {/* ── Top bar ──────────────────────── */}
        <header className="hud-top">
          {/* Logo */}
          <div className="hud-logo">
            <div className="hud-logo-icon" aria-hidden="true">
              <svg className="play-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="hud-logo-text">WatchParty</span>
          </div>

          {/* Room code — center */}
          <div className="hud-room-code" title="Room Code">
            <span className="hrc-label">ROOM</span>
            <span className="hrc-code" id="room-code-display">{initial.roomId}</span>
            <button id="copy-code-btn" className="hrc-copy" onClick={copyRoomCode} title="Copy code">
              {copied ? '✓' : '⎘'}
            </button>

            {/* Social Share Dropdown Container */}
            <div className="share-dropdown-wrapper" style={{ position: 'relative' }}>
              <button
                id="share-dropdown-btn"
                className="hrc-copy wa-share-btn"
                onClick={() => setShareDropdown(!shareDropdown)}
                title="Share Room to Social Media"
              >
                {/* Authentic Filled WhatsApp Brand Logo SVG */}
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#25D366" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M16 6.5C10.75 6.5 6.5 10.75 6.5 16C6.5 17.82 7.02 19.52 7.92 20.97L6.68 25.56L11.4 24.32C12.8 25.13 14.39 25.5 16 25.5C21.25 25.5 25.5 21.25 25.5 16C25.5 10.75 21.25 6.5 16 6.5ZM16 23.9C14.59 23.9 13.22 23.53 12.02 22.82L11.73 22.65L8.94 23.38L9.68 20.66L9.5 20.37C8.72 19.12 8.3 17.58 8.3 16C8.3 11.75 11.75 8.3 16 8.3C20.25 8.3 23.7 11.75 23.7 16C23.7 20.25 20.25 23.9 16 23.9ZM20.22 18.28C19.99 18.17 18.86 17.61 18.65 17.53C18.44 17.45 18.29 17.41 18.14 17.63C17.99 17.85 17.56 18.36 17.43 18.51C17.3 18.66 17.17 18.68 16.94 18.57C16.71 18.46 15.97 18.22 15.09 17.44C14.4 16.83 13.93 16.07 13.8 15.84C13.67 15.61 13.79 15.49 13.9 15.38C14 15.28 14.13 15.11 14.24 14.98C14.35 14.85 14.39 14.75 14.47 14.59C14.55 14.43 14.51 14.3 14.45 14.18C14.39 14.06 13.94 12.95 13.75 12.5C13.57 12.06 13.38 12.12 13.24 12.11C13.11 12.1 12.96 12.1 12.81 12.1C12.66 12.1 12.42 12.16 12.21 12.38C12 12.6 11.39 13.17 11.39 14.33C11.39 15.49 12.24 16.61 12.35 16.76C12.46 16.91 14.01 19.3 16.39 20.33C16.95 20.57 17.39 20.72 17.73 20.83C18.3 21.01 18.81 20.98 19.22 20.92C19.68 20.85 20.63 20.34 20.83 19.78C21.03 19.22 21.03 18.74 20.97 18.64C20.91 18.54 20.76 18.48 20.53 18.37L20.22 18.28Z" fill="white"/>
                </svg>
              </button>

              {shareDropdown && (
                <div className="share-dropdown-menu">
                  <button className="share-menu-item" onClick={() => shareToPlatform('whatsapp')}>
                    <span className="share-brand-icon" style={{ background: '#25D366' }}>💬</span> WhatsApp
                  </button>
                  <button className="share-menu-item" onClick={() => shareToPlatform('telegram')}>
                    <span className="share-brand-icon" style={{ background: '#0088cc' }}>✈️</span> Telegram
                  </button>
                  <button className="share-menu-item" onClick={() => shareToPlatform('twitter')}>
                    <span className="share-brand-icon" style={{ background: '#1DA1F2' }}>🐦</span> Twitter / X
                  </button>
                  <button className="share-menu-item" onClick={() => shareToPlatform('discord')}>
                    <span className="share-brand-icon" style={{ background: '#5865F2' }}>🎮</span> Discord
                  </button>
                  <button className="share-menu-item" onClick={shareNative}>
                    <span className="share-brand-icon" style={{ background: '#ffd060', color: '#000' }}>🔗</span> System Share
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Top-right actions */}
          <div className="hud-top-actions">
            <button id="leave-room-btn" className="hud-action-btn danger" onClick={handleLeave} title="Leave Room">
              <span style={{ fontSize: '15px' }}>🏃💨</span>
              <span className="hab-label">Leave Room</span>
            </button>
          </div>
        </header>

        {/* ── Left nav panel ───────────────── */}
        <div className="hud-left-wrapper">
          {showLeftNav && (
            <nav className="hud-left-nav" aria-label="Navigation">
              {navTiles.filter(t => t.show).map(tile => (
                <button
                  key={tile.id}
                  id={`nav-${tile.id}`}
                  className={`nav-tile tile-${tile.color} ${activePanel === tile.id ? 'active' : ''}`}
                  onClick={() => togglePanel(tile.id)}
                  aria-pressed={activePanel === tile.id}
                >
                  <span className="nav-tile-icon">{tile.icon}</span>
                  <span className="nav-tile-label">{tile.label}</span>
                </button>
              ))}

              {/* Divider */}
              <div className="nav-divider" />

              {/* Viewer badge when not in control */}
              {!canControl && (
                <div className="nav-role-chip viewer">
                  <span>👁</span>
                  <span>Viewer</span>
                </div>
              )}
              {myRole === 'host' && (
                <div className="nav-role-chip host">
                  <span>👑</span>
                  <span>Host</span>
                </div>
              )}
              {myRole === 'moderator' && (
                <div className="nav-role-chip mod">
                  <span>🛡️</span>
                  <span>Mod</span>
                </div>
              )}
            </nav>
          )}
          <button
            className="hud-toggle-arrow left-arrow"
            onClick={() => setShowLeftNav(prev => !prev)}
            title={showLeftNav ? "Hide Left Menu" : "Show Left Menu"}
          >
            {showLeftNav ? '◀' : '▶'}
          </button>
        </div>

        {/* ── Right info panel ─────────────── */}
        <div className="hud-right-wrapper">
          <button
            className="hud-toggle-arrow right-arrow"
            onClick={() => setShowRightPanel(prev => !prev)}
            title={showRightPanel ? "Hide Leaderboard" : "Show Leaderboard"}
          >
            {showRightPanel ? '▶' : '◀'}
          </button>
          {showRightPanel && (
            <aside className="hud-right-panel" aria-label="Room info">
              {/* My user card */}
              <div className="hud-user-card">
                <div className="huc-avatar">{initial.username.charAt(0).toUpperCase()}</div>
                <div className="huc-info">
                  <span className="huc-name">{initial.username}</span>
                  <span className="huc-role">{myRole}</span>
                </div>
              </div>

              {/* Participant mini-list (Leaderboard) */}
              <ParticipantList
                participants={participants}
                myUserId={socket.id || ''}
                myRole={myRole}
                onAssignRole={handleAssignRole}
                onRemoveParticipant={handleRemoveParticipant}
                onTransferHost={handleTransferHost}
              />
            </aside>
          )}
        </div>

        {/* ── Floating panels (left-anchored) ── */}

        {/* Chat panel */}
        {activePanel === 'chat' && (
          <div className="hud-float-panel chat-float" id="chat-panel" style={{ left: panelPos.x, top: panelPos.y, transform: 'none' }}>
            <div
              className="hfp-header"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <span className="hfp-title">💬 Chat</span>
              <button className="hfp-close" onClick={() => setActivePanel(null)}>✕</button>
            </div>
            <ChatPanel
              messages={chatMessages}
              myUserId={socket.id || ''}
              myUsername={initial.username}
              onSend={handleSendChat}
            />
          </div>
        )}

        {/* Video search modal */}
        {activePanel === 'video' && (
          <VideoSearch
            onSelect={handleChangeVideo}
            onAddToQueue={handleAddToQueue}
            onClose={() => setActivePanel(null)}
            canControl={canControl}
          />
        )}

        {/* Queue panel modal */}
        {activePanel === 'queue' && (
          <QueuePanel
            queue={queue}
            onRemoveItem={handleRemoveQueueItem}
            onSkipNext={handleSkipNext}
            canControl={canControl}
            currentSocketId={socket.id || ''}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Toast */}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>

      {/* ── Mobile Portrait Tab Hub (Underneath 16:9 Video) ── */}
      <div className="mobile-tab-hub">
        <div className="mth-tabs" role="tablist">
          <button
            className={`mth-tab ${mobileTab === 'chat' ? 'active' : ''}`}
            onClick={() => setMobileTab('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`mth-tab ${mobileTab === 'queue' ? 'active' : ''}`}
            onClick={() => setMobileTab('queue')}
          >
            📑 Queue ({queue.length})
          </button>
          <button
            className={`mth-tab ${mobileTab === 'players' ? 'active' : ''}`}
            onClick={() => setMobileTab('players')}
          >
            👥 Players ({participants.length})
          </button>
          <button
            className={`mth-tab ${mobileTab === 'video' ? 'active' : ''}`}
            onClick={() => setMobileTab('video')}
          >
            🎬 Add Video
          </button>
        </div>

        <div className="mth-content">
          {mobileTab === 'chat' && (
            <ChatPanel
              messages={chatMessages}
              myUserId={socket.id || ''}
              myUsername={initial.username}
              onSend={handleSendChat}
            />
          )}

          {mobileTab === 'queue' && (
            <QueuePanel
              queue={queue}
              onRemoveItem={handleRemoveQueueItem}
              onSkipNext={handleSkipNext}
              canControl={canControl}
              currentSocketId={socket.id || ''}
              onClose={() => setMobileTab('chat')}
            />
          )}

          {mobileTab === 'players' && (
            <div className="mth-players-wrapper">
              <div className="hud-user-card">
                <div className="huc-avatar">{initial.username.charAt(0).toUpperCase()}</div>
                <div className="huc-info">
                  <span className="huc-name">{initial.username}</span>
                  <span className="huc-role">{myRole}</span>
                </div>
              </div>
              <ParticipantList
                participants={participants}
                myUserId={socket.id || ''}
                myRole={myRole}
                onAssignRole={handleAssignRole}
                onRemoveParticipant={handleRemoveParticipant}
                onTransferHost={handleTransferHost}
              />
            </div>
          )}

          {mobileTab === 'video' && (
            <VideoSearch
              onSelect={handleChangeVideo}
              onAddToQueue={handleAddToQueue}
              onClose={() => setMobileTab('chat')}
              canControl={canControl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
