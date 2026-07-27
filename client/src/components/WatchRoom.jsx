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

export default function WatchRoom({ roomState: initial, onLeave }) {
  const socket = getSocket();

  // ── Room state ────────────────────────────────────────────────
  const [participants, setParticipants] = useState(initial.participants);
  const [myRole, setMyRole] = useState(initial.role);
  const [syncState, setSyncState] = useState(initial.syncState);
  const [chatMessages, setChatMessages] = useState(initial.chatHistory || []);

  const [showLeftNav, setShowLeftNav] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [mobileTab, setMobileTab] = useState('chat');

  // ── HUD panel visibility ──────────────────────────────────────
  // Only one panel can be "open" at a time (like a game menu)
  const [activePanel, setActivePanel] = useState('chat');
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);

  const togglePanel = (panel) =>
    setActivePanel(prev => prev === panel ? null : panel);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  // ── Socket events ─────────────────────────────────────────────
  useEffect(() => {
    const onSyncState = (data) => {
      setSyncState(data);
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

  const handleChangeVideo = (videoId) => {
    socket.emit('change_video', { videoId });
    setActivePanel(null);
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

  const copyRoomCode = () => {
    navigator.clipboard.writeText(initial.roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
    { id: 'video', icon: '🎬', label: 'Videos', show: canControl, color: 'gold' },
    { id: 'chat', icon: '💬', label: 'Chat', show: true, color: 'orange' },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="game-room">

      {/* ── Full-screen video world ───────── */}
      <div className="game-world">
        <YouTubePlayer
          key={`${myRole}-${canControl}`}
          syncState={syncState}
          canControl={canControl}
          myUserId={socket.id || ''}
          onPlay={handlePlay}
          onPause={handlePause}
          onPermissionDenied={showToast}
        />
      </div>

      {/* ── HUD overlay ──────────────────── */}
      <div className="game-hud" aria-label="Room controls">

        {/* ── Top bar ──────────────────────── */}
        <header className="hud-top">
          {/* Logo */}
          <div className="hud-logo">
            <div className="hud-logo-icon" aria-hidden="true">▶</div>
            <span className="hud-logo-text">WatchParty</span>
          </div>

          {/* Room code — center */}
          <div className="hud-room-code" title="Room Code">
            <span className="hrc-label">ROOM</span>
            <span className="hrc-code" id="room-code-display">{initial.roomId}</span>
            <button id="copy-code-btn" className="hrc-copy" onClick={copyRoomCode} title="Copy code">
              {copied ? '✓' : '⎘'}
            </button>
          </div>

          {/* Top-right actions */}
          <div className="hud-top-actions">
            <button id="leave-room-btn" className="hud-action-btn danger" onClick={handleLeave} title="Leave Room">
              <span>🚪</span>
              <span className="hab-label">Leave</span>
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
            onClose={() => setActivePanel(null)}
            canControl={canControl}
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
            className={`mth-tab ${mobileTab === 'players' ? 'active' : ''}`}
            onClick={() => setMobileTab('players')}
          >
            👥 Players ({participants.length})
          </button>
          {canControl && (
            <button
              className={`mth-tab ${mobileTab === 'video' ? 'active' : ''}`}
              onClick={() => setMobileTab('video')}
            >
              🎬 Videos
            </button>
          )}
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

          {mobileTab === 'video' && canControl && (
            <VideoSearch
              onSelect={handleChangeVideo}
              onClose={() => setMobileTab('chat')}
              canControl={canControl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
