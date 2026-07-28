import { useEffect, useRef, useCallback, useState } from 'react';

export default function YouTubePlayer({
  syncState,
  canControl,
  onPlay,
  onPause,
  onSeek,
  onEnded,
  onPermissionDenied,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const suppressUntilRef = useRef(0);
  const isReadyRef = useRef(false);
  const currentVideoIdRef = useRef(syncState.videoId);
  const lastTimeRef = useRef(syncState.currentTime);

  const suppress = (ms = 800) => {
    suppressUntilRef.current = Date.now() + ms;
  };

  const isSuppressed = () => Date.now() < suppressUntilRef.current;

  const canControlRef = useRef(canControl);
  useEffect(() => {
    canControlRef.current = canControl;
  }, [canControl]);

  const [needsUnmute, setNeedsUnmute] = useState(false);

  const handleUnmute = () => {
    const player = playerRef.current;
    if (player) {
      if (typeof player.unMute === 'function') player.unMute();
      if (typeof player.playVideo === 'function') player.playVideo();
    }
    setNeedsUnmute(false);
  };

  // Handle remote sync changes
  const applySync = useCallback((state) => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) return;

    // Check videoId change
    if (state.videoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = state.videoId;
      lastTimeRef.current = state.currentTime;
      suppress(1500);
      if (state.playState === 'playing') {
        player.loadVideoById(state.videoId, state.currentTime);
      } else {
        player.cueVideoById(state.videoId, state.currentTime);
      }
      return;
    }

    // Drift check (> 1.5s) to keep all participants strictly in sync without stutter loops
    const currentTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
    if (Math.abs(currentTime - state.currentTime) > 1.5) {
      suppress(800);
      lastTimeRef.current = state.currentTime;
      if (typeof player.seekTo === 'function') {
        player.seekTo(state.currentTime, true);
      }
    }

    // Play/Pause Sync with Browser Autoplay Fallback
    const playerState = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
    if (state.playState === 'playing') {
      if (playerState !== window.YT.PlayerState.PLAYING) {
        try {
          const res = player.playVideo();
          if (res && typeof res.catch === 'function') {
            res.catch(() => {
              if (typeof player.mute === 'function') player.mute();
              player.playVideo();
              setNeedsUnmute(true);
            });
          }
        } catch (e) {
          if (typeof player.mute === 'function') player.mute();
          player.playVideo();
          setNeedsUnmute(true);
        }
      }
    } else if (state.playState === 'paused') {
      if (playerState !== window.YT.PlayerState.PAUSED) {
        player.pauseVideo();
      }
    }
  }, []);

  useEffect(() => {
    applySync(syncState);
  }, [syncState, applySync]);

  useEffect(() => {
    if (!syncState.videoId) return;

    let checkInterval = null;

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: syncState.videoId,
        playerVars: {
          autoplay: syncState.playState === 'playing' ? 1 : 0,
          controls: 1,
          fs: 1,
          playsinline: 1,
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(syncState.currentTime),
        },
        events: {
          onReady: () => {
            isReadyRef.current = true;
            if (syncState.playState === 'playing') {
              playerRef.current?.playVideo();
            } else {
              playerRef.current?.pauseVideo();
            }
          },
          onStateChange: (event) => {
            if (isSuppressed()) return;

            const curTime = playerRef.current && typeof playerRef.current.getCurrentTime === 'function'
              ? playerRef.current.getCurrentTime()
              : 0;

            // Check if user manually jumped/seeked time (> 2s difference from last known time)
            if (Math.abs(curTime - lastTimeRef.current) > 2) {
              lastTimeRef.current = curTime;
              if (canControlRef.current) {
                suppress(1200);
                onSeek?.(curTime);
              }
            } else {
              lastTimeRef.current = curTime;
            }

            if (event.data === window.YT.PlayerState.PLAYING) {
              if (canControlRef.current) {
                suppress(1200);
                onPlay();
              } else {
                suppress();
                if (syncState.playState === 'paused') {
                  playerRef.current?.pauseVideo();
                }
                onPermissionDenied?.('🔒 Only the Host or a Moderator can play or pause the video.');
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              if (canControlRef.current && playerRef.current) {
                suppress(1200);
                onPause(curTime);
              } else {
                suppress();
                if (syncState.playState === 'playing') {
                  playerRef.current?.playVideo();
                }
                onPermissionDenied?.('🔒 Only the Host or a Moderator can play or pause the video.');
              }
            } else if (event.data === window.YT.PlayerState.ENDED) {
              if (canControlRef.current) {
                onEnded?.();
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 100);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
        isReadyRef.current = false;
      }
    };
  }, [syncState.videoId, canControl]);

  if (!syncState.videoId) {
    return (
      <div className="empty-video-box">
        <div className="animated-border-glow" />
        <div className="empty-box-content">
          <div className="empty-box-icon">🎬</div>
          <h3 className="empty-box-title">No Video Loaded Yet</h3>
          <p className="empty-box-desc">
            {canControl
              ? 'Click "Videos" in the left HUD menu to select or paste a YouTube video!'
              : 'Waiting for the Host or Moderator to select a video…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="yt-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} className="yt-player-container" style={{ width: '100%', height: '100%' }} />

      {!canControl && (
        <div
          className="viewer-block-shield"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 99,
            cursor: 'not-allowed',
            background: 'transparent',
            pointerEvents: 'auto',
            touchAction: 'manipulation',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (needsUnmute) {
              handleUnmute();
            } else {
              onPermissionDenied?.('🔒 Only the Host or a Moderator can play or pause the video.');
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (needsUnmute) {
              handleUnmute();
            } else {
              onPermissionDenied?.('🔒 Only the Host or a Moderator can play or pause the video.');
            }
          }}
          title="🔒 Only Host or Moderator can control playback"
        />
      )}

      {needsUnmute && (
        <div
          className="unmute-banner"
          onClick={handleUnmute}
          onTouchEnd={handleUnmute}
          style={{ zIndex: 100, touchAction: 'manipulation' }}
        >
          <span>🔊 Tap anywhere to Unmute Audio & Sync</span>
        </div>
      )}

      {canControl && (
        <button
          className={`host-control-fab ${syncState.playState === 'playing' ? 'playing' : ''}`}
          onClick={() => {
            if (syncState.playState === 'playing') {
              const currentTime = playerRef.current && typeof playerRef.current.getCurrentTime === 'function'
                ? playerRef.current.getCurrentTime()
                : syncState.currentTime;
              onPause(currentTime);
            } else {
              onPlay();
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (syncState.playState === 'playing') {
              const currentTime = playerRef.current && typeof playerRef.current.getCurrentTime === 'function'
                ? playerRef.current.getCurrentTime()
                : syncState.currentTime;
              onPause(currentTime);
            } else {
              onPlay();
            }
          }}
        >
          {syncState.playState === 'playing' ? '⏸ Pause' : '▶ Play'}
        </button>
      )}
    </div>
  );
}
