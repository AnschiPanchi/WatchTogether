/**
 * ParticipantList.tsx
 *
 * Renders the live sidebar list of everyone in the room.
 * Each entry shows avatar, name, role chip, and (for hosts)
 * a ⋮ dropdown with management actions.
 *
 * The dropdown is a controlled component: only one menu is
 * open at a time, tracked by `openMenu` state holding the
 * userId of the open row (or null if all are closed).
 *
 * Accessibility note: the dropdown uses role="menu" /
 * role="menuitem" so screen readers treat it correctly.
 */

import { useState } from 'react';
import type { ParticipantInfo, Role } from '../types';

interface Props {
  participants:         ParticipantInfo[];
  myUserId:             string;
  myRole:               Role;
  onAssignRole:         (userId: string, role: string) => void;
  onRemoveParticipant:  (userId: string) => void;
  onTransferHost:       (userId: string) => void;
}

// Role metadata — icon + CSS class pairing keeps the render clean
const ROLE_META: Record<Role, { icon: string; cls: string }> = {
  host:        { icon: '👑', cls: 'role-host'        },
  moderator:   { icon: '🛡️', cls: 'role-mod'         },
  participant: { icon: '👤', cls: 'role-participant'  },
};

export default function ParticipantList({
  participants,
  myUserId,
  myRole,
  onAssignRole,
  onRemoveParticipant,
  onTransferHost,
}: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (userId: string) => {
    setOpenMenu(prev => prev === userId ? null : userId);
  };

  const closeMenu = () => setOpenMenu(null);

  return (
    <div className="hud-participant-mini">
      <div className="hpm-title">
        <span>Players</span>
        <span style={{ marginLeft: 'auto' }}>Role</span>
      </div>

      <div className="hpm-list">
        {participants.map((p) => {
          const isMe   = p.userId === myUserId;
          const isHost = p.role === 'host';

          return (
            <div key={p.userId} className={`hpm-row ${isHost ? 'is-host-row' : ''}`}>
              <span className="hpm-name">
                {p.username} {isMe && <span style={{ opacity: 0.5 }}>(you)</span>}
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`hpm-role role-${p.role}`}>
                  {p.role === 'host' ? 'Host' : p.role === 'moderator' ? 'Mod' : 'Viewer'}
                </span>

                {/* ── Host management menu ─────── */}
                {myRole === 'host' && !isMe && (
                  <div className="p-actions">
                    <button
                      className="manage-btn"
                      aria-haspopup="menu"
                      aria-expanded={openMenu === p.userId}
                      onClick={() => toggleMenu(p.userId)}
                      title="Manage participant"
                      style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                    >
                      ⋮
                    </button>

                    {openMenu === p.userId && (
                      <div className="manage-dropdown" role="menu">
                        {/* Promote / demote moderator */}
                        {p.role === 'participant' && (
                          <button role="menuitem" onClick={() => { onAssignRole(p.userId, 'moderator'); closeMenu(); }}>
                            🛡️ Make Moderator
                          </button>
                        )}
                        {p.role === 'moderator' && (
                          <button role="menuitem" onClick={() => { onAssignRole(p.userId, 'participant'); closeMenu(); }}>
                            👤 Demote to Viewer
                          </button>
                        )}

                        {/* Transfer the host crown */}
                        <button role="menuitem" onClick={() => { onTransferHost(p.userId); closeMenu(); }}>
                          👑 Transfer Host
                        </button>

                        <div className="divider" role="separator" />

                        {/* Kick — destructive, so confirm first */}
                        <button
                          role="menuitem"
                          className="danger-item"
                          onClick={() => {
                            if (confirm(`Remove ${p.username} from the room?`)) {
                              onRemoveParticipant(p.userId);
                            }
                            closeMenu();
                          }}
                        >
                          🚫 Remove from Room
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


