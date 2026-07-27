import { useEffect, useRef, useCallback, useState } from 'react';
import type { SyncState } from '../types';

interface Props {
  syncState: SyncState;
  canControl: boolean;
  myUserId: string;
  onPlay: () => void;
  onPause: (currentTime: number) => void;
  onPermissionDenied?: (message: string) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export default function YouTubePlayer({
  syncState,
  canControl,
  onPlay,
  onPause,
  onPermissionDenied,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const suppressUntilRef = useRef<number>(0);
  const isReadyRef = useRef<boolean>(false);
  const currentVideoIdRef = useRef<string>(syncState.videoId);

  const suppress = (ms = 800) => {
    suppressUntilRef.current = Date.now() + ms;
  };

  const isSuppressed = () => Date.now() < suppressUntilRef.current;

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
  const applySync = useCallback((state: SyncState) => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) return;

    // Check videoId change
    if (state.videoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = state.videoId;
      suppress(1500);
      if (state.playState === 'playing') {
        player.loadVideoById(state.videoId, state.currentTime);
      } else {
        player.cueVideoById(state.videoId, state.currentTime);
      }
      return;
    }

    // Drift check (> 2.0s) to prevent playback flickering
    const currentTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
    if (Math.abs(currentTime - state.currentTime) > 2.0) {
      suppress(1000);
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
    let checkInterval: any = null;

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: syncState.videoId,
        playerVars: {
          autoplay: syncState.playState === 'playing' ? 1 : 0,
          controls: canControl ? 1 : 0,
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
          onStateChange: (event: any) => {
            if (isSuppressed()) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              if (canControl) {
                onPlay();
              } else {
                suppress();
                if (syncState.playState === 'paused') {
                  playerRef.current?.pauseVideo();
                }
                onPermissionDenied?.('🔒 Only the Host or a Moderator can play or pause the video.');
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              if (canControl && playerRef.current) {
                onPause(playerRef.current.getCurrentTime());
              } else {
                suppress();
                if (syncState.playState === 'playing') {
                  playerRef.current?.playVideo();
                }
                onPermissionDenied?.('🔒 Only the Host or a Moderator can play or pause the video.');
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
      }
    };
  }, []);

  return (
    <div className="yt-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} className="yt-player-container" style={{ width: '100%', height: '100%' }} />

      {needsUnmute && (
        <div className="unmute-banner" onClick={handleUnmute}>
          <span>🔊 Click anywhere to Unmute Audio & Sync</span>
        </div>
      )}

      {!canControl && (
        <div
          className="viewer-click-shield"
          onClick={() => {
            if (needsUnmute) {
              handleUnmute();
            } else {
              onPermissionDenied?.('🔒 Only the Host or a Moderator can play or pause the video.');
            }
          }}
        >
          <div className="viewer-overlay">
            <span className="viewer-badge">👁 Viewer Mode</span>
          </div>
        </div>
      )}
    </div>
  );
}
