/**
 * QueuePanel.jsx
 *
 * Glassmorphic HUD panel displaying the room's video waiting list / queue.
 * Allows anyone to view the upcoming queue.
 * Host/Moderators can skip, remove items, or play next.
 * Item submitters can also remove their own added videos from the queue.
 */

import React from 'react';

export default function QueuePanel({
  queue = [],
  onRemoveItem,
  onSkipNext,
  canControl,
  currentSocketId,
  onClose,
}) {
  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Video Queue">
      <div className="search-modal" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="search-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="search-title gradient-text" style={{ margin: 0 }}>
              Video Waiting List
            </h2>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                color: '#fff',
              }}
            >
              {queue.length}
            </span>
          </div>
          <button id="close-queue-btn" className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Action Header for Host / Mod */}
        {canControl && queue.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="search-modal-btn"
              onClick={onSkipNext}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                border: 'none',
                padding: '8px 16px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              ▶ Play Next Video
            </button>
          </div>
        )}

        {/* Queue List */}
        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📑</div>
            <p style={{ margin: 0, fontWeight: 500 }}>The queue is currently empty.</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              Anyone can search and add videos to the waiting list!
            </p>
          </div>
        ) : (
          <div
            className="queue-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '360px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {queue.map((item, idx) => {
              const isOwner = item.addedBy === currentSocketId;
              const canRemove = canControl || isOwner;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Position Badge */}
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#64748b',
                      width: '20px',
                      textAlign: 'center',
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <img
                    src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                    alt={item.title}
                    style={{
                      width: '72px',
                      height: '42px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />

                  {/* Video Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#f8fafc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      Added by <strong style={{ color: '#cbd5e1' }}>{item.addedByUsername}</strong>
                    </div>
                  </div>

                  {/* Remove Button */}
                  {canRemove && (
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      title="Remove from queue"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
