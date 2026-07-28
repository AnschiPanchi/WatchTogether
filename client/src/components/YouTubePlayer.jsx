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
  const endedRef = useRef(false);

  const suppress = (ms = 800) => {
    suppressUntilRef.current = Date.now() + ms;
  };

  const isSuppressed = () => Date.now() < suppressUntilRef.current;

  const canControlRef = useRef(canControl);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekRef = useRef(onSeek);
  const onEndedRef = useRef(onEnded);
  const onPermissionDeniedRef = useRef(onPermissionDenied);
  useEffect(() => {
    canControlRef.current = canControl;
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onSeekRef.current = onSeek;
    onEndedRef.current = onEnded;
    onPermissionDeniedRef.current = onPermissionDenied;
  });

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
      endedRef.current = false; // Reset ended flag for new video
      suppress(2000);
      if (state.playState === 'playing') {
        player.loadVideoById(state.videoId, state.currentTime);
      } else {
        player.cueVideoById(state.videoId, state.currentTime);
      }
      return;
    }

    // If video has ended locally, ignore all sync updates until videoId changes
    if (endedRef.current) return;

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
          loop: 0,
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

            // If video already ended, block all state changes until new video loads
            if (endedRef.current) return;

            // Handle ENDED first, before any other processing
            if (event.data === window.YT.PlayerState.ENDED) {
              endedRef.current = true;
              suppress(5000); // Suppress everything for 5s while next_video processes
              onEndedRef.current?.();
              return;
            }

            const curTime = playerRef.current && typeof playerRef.current.getCurrentTime === 'function'
              ? playerRef.current.getCurrentTime()
              : 0;

            const duration = playerRef.current && typeof playerRef.current.getDuration === 'function'
              ? playerRef.current.getDuration()
              : 0;

            // Check if user manually jumped/seeked time (> 2s difference from last known time)
            // Ignore seek check near the end of video (within 4 seconds of duration)
            // Ignore seek check when curTime is near 0 (video restart/loop detection)
            const nearEnd = duration > 0 && curTime >= duration - 4;
            const nearStart = curTime < 2;
            if (!nearEnd && !nearStart && Math.abs(curTime - lastTimeRef.current) > 2) {
              lastTimeRef.current = curTime;
              if (canControlRef.current) {
                suppress(1200);
                onSeekRef.current?.(curTime);
              }
            } else {
              lastTimeRef.current = curTime;
            }

            if (event.data === window.YT.PlayerState.PLAYING) {
              if (canControlRef.current) {
                suppress(1200);
                onPlayRef.current();
              } else {
                suppress();
                if (syncState.playState === 'paused') {
                  playerRef.current?.pauseVideo();
                }
                onPermissionDeniedRef.current?.('🔒 Only the Host or a Moderator can play or pause the video.');
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              if (canControlRef.current && playerRef.current) {
                suppress(1200);
                onPauseRef.current(curTime);
              } else {
                suppress();
                if (syncState.playState === 'playing') {
                  playerRef.current?.playVideo();
                }
                onPermissionDeniedRef.current?.('🔒 Only the Host or a Moderator can play or pause the video.');
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
  }, [syncState.videoId]);

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
