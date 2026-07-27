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
import { getSocket } from '../socket';
import type { RoomState, ParticipantInfo, SyncState, ChatMessage, Role } from '../types';
import YouTubePlayer from './YouTubePlayer';
import ParticipantList from './ParticipantList';
import ChatPanel from './ChatPanel';
import VideoSearch from './VideoSearch';

interface Props {
  roomState: RoomState;
  onLeave:   () => void;
}

export default function WatchRoom({ roomState: initial, onLeave }: Props) {
  const socket = getSocket();

  // ── Room state ────────────────────────────────────────────────
  const [participants, setParticipants] = useState<ParticipantInfo[]>(initial.participants);
  const [myRole,       setMyRole]       = useState<Role>(initial.role);
  const [syncState,    setSyncState]    = useState<SyncState>(initial.syncState);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initial.chatHistory || []);

  // ── HUD panel visibility ──────────────────────────────────────
  // Only one panel can be "open" at a time (like a game menu)
  const [activePanel, setActivePanel] = useState<'people' | 'chat' | 'video' | null>('chat');
  const [toast,       setToast]       = useState('');
  const [copied,      setCopied]      = useState(false);

  const [leftUIVisible, setLeftUIVisible]   = useState(true);
  const [rightUIVisible, setRightUIVisible] = useState(true);

  const togglePanel = (panel: 'people' | 'chat' | 'video') =>
    setActivePanel(prev => prev === panel ? null : panel);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  // ── Socket events ─────────────────────────────────────────────
  useEffect(() => {
    const onSyncState = (data: SyncState) => {
      if (data.triggeredBy !== socket.id) setSyncState(data);
    };

    const onUserJoined = (data: { participants: ParticipantInfo[]; username: string }) => {
      setParticipants(data.participants);
      showToast(`${data.username} joined`);
    };

    const onUserLeft = (data: { participants: ParticipantInfo[]; username: string; newHostId?: string }) => {
      setParticipants(data.participants);
      showToast(`${data.username} left`);
      if (data.newHostId === socket.id) { setMyRole('host'); showToast('👑 You are now the host!'); }
    };

    const onRoleAssigned = (data: { userId: string; role: Role; participants: ParticipantInfo[] }) => {
      setParticipants(data.participants);
      if (data.userId === socket.id) { setMyRole(data.role); showToast(`Role: ${data.role}`); }
    };

    const onParticipantRemoved = (data: { participants: ParticipantInfo[] }) => setParticipants(data.participants);
    const onRemovedFromRoom = () => { alert('You were removed from the room.'); onLeave(); };
    const onChatMessage = (msg: ChatMessage) => setChatMessages(prev => [...prev.slice(-199), msg]);

    socket.on('sync_state',          onSyncState);
    socket.on('user_joined',         onUserJoined);
    socket.on('user_left',           onUserLeft);
    socket.on('role_assigned',       onRoleAssigned);
    socket.on('participant_removed', onParticipantRemoved);
    socket.on('removed_from_room',   onRemovedFromRoom);
    socket.on('chat_message',        onChatMessage);

    return () => {
      socket.off('sync_state',          onSyncState);
      socket.off('user_joined',         onUserJoined);
      socket.off('user_left',           onUserLeft);
      socket.off('role_assigned',       onRoleAssigned);
      socket.off('participant_removed', onParticipantRemoved);
      socket.off('removed_from_room',   onRemovedFromRoom);
      socket.off('chat_message',        onChatMessage);
    };
  }, [socket, onLeave, showToast]);

  // ── Helpers ───────────────────────────────────────────────────
  const canControl = myRole === 'host' || myRole === 'moderator';

  const handlePlay  = ()    => socket.emit('play',  {});
  const handlePause = (t: number) => socket.emit('pause', { currentTime: t });

  const handleChangeVideo = (videoId: string) => {
    socket.emit('change_video', { videoId });
    setActivePanel(null);
  };

  const handleLeave             = () => { socket.emit('leave_room', { roomId: initial.roomId }); onLeave(); };
  const handleAssignRole        = (uid: string, role: string) => socket.emit('assign_role',        { userId: uid, role });
  const handleRemoveParticipant = (uid: string)               => socket.emit('remove_participant', { userId: uid });
  const handleTransferHost      = (uid: string)               => socket.emit('transfer_host',      { userId: uid });
  const handleSendChat          = (msg: string)               => socket.emit('chat_message',       { message: msg });

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

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: panelPos.x,
      startPosY: panelPos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPanelPos({
      x: dragRef.current.startPosX + dx,
      y: dragRef.current.startPosY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // ── Left nav tiles definition ─────────────────────────────────
  const navTiles = [
    { id: 'video'  as const, icon: '🎬', label: 'Videos', show: canControl, color: 'gold' },
    { id: 'chat'   as const, icon: '💬', label: 'Chat',   show: true, color: 'orange' },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="game-room">

      {/* ── Ambient background for depth ── */}
      <div className="bg-bubbles" aria-hidden="true" style={{ zIndex: 0, opacity: 0.6 }}>
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
                '--dur': `${b.dur}s`,
                '--delay': `${b.delay}s`,
              } as React.CSSProperties}
            />
          ))}
      </div>

      {/* ── Full-screen video world ───────── */}
      <div className="game-world">
        <YouTubePlayer
          syncState={syncState}
          canControl={canControl}
          myUserId={socket.id || ''}
          onPlay={handlePlay}
          onPause={handlePause}
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

        {/* ── Toggle UI Buttons ────────────── */}
        <button className="hud-toggle-btn hud-toggle-left" onClick={() => setLeftUIVisible(!leftUIVisible)}>
          {leftUIVisible ? '◀' : '▶'}
        </button>
        <button className="hud-toggle-btn hud-toggle-right" onClick={() => setRightUIVisible(!rightUIVisible)}>
          {rightUIVisible ? '▶' : '◀'}
        </button>

        {/* ── Left nav panel ───────────────── */}
        <nav className={`hud-left-nav ${leftUIVisible ? '' : 'hidden'}`} aria-label="Navigation">
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

        {/* ── Right info panel ─────────────── */}
        <aside className={`hud-right-panel ${rightUIVisible ? '' : 'hidden'}`} aria-label="Room info">
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
    </div>
  );
}
