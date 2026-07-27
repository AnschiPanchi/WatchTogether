import { useEffect, useRef, useCallback } from 'react';
import type { SyncState } from '../types';

// ─── YouTube IFrame API Loader (singleton) ────────────────────────────────────
let ytApiReady = false;
let ytApiCallbacks: (() => void)[] = [];

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiReady) {
      resolve();
      return;
    }
    ytApiCallbacks.push(resolve);
    if (!document.getElementById('yt-api-script')) {
      const script = document.createElement('script');
      script.id = 'yt-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });
}

// YouTube calls this globally when the IFrame API finishes loading
(window as any).onYouTubeIframeAPIReady = () => {
  ytApiReady = true;
  ytApiCallbacks.forEach((cb) => cb());
  ytApiCallbacks = [];
};

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  syncState: SyncState;
  canControl: boolean;
  myUserId: string;
  onPlay: () => void;
  onPause: (currentTime: number) => void;
}

export default function YouTubePlayer({
  syncState,
  canControl,
  onPlay,
  onPause,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const syncStateRef = useRef(syncState);
  const lastVideoIdRef = useRef('');
  const suppressUntilRef = useRef<number>(0);

  const isSuppressed = () => Date.now() < suppressUntilRef.current;
  const suppress = (ms = 700) => { suppressUntilRef.current = Date.now() + ms; };

  syncStateRef.current = syncState;

  // ─── Init Player ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const divId = `yt-player-${Math.random().toString(36).substr(2, 9)}`;

    // Create a fresh div for the YouTube IFrame API to replace
    const targetDiv = document.createElement('div');
    targetDiv.id = divId;
    targetDiv.style.width = '100%';
    targetDiv.style.height = '100%';
    
    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // clear any orphaned iframes
      containerRef.current.appendChild(targetDiv);
    }

    loadYTApi().then(() => {
      if (!isMounted) return;

      console.log('[DEBUG YT] Creating new YT.Player with videoId:', syncStateRef.current.videoId);
      playerRef.current = new YT.Player(divId, {
        height: '100%',
        width: '100%',
        videoId: syncStateRef.current.videoId,
        host: 'https://www.youtube.com',
        playerVars: {
          enablejsapi: 1,
          controls: canControl ? 1 : 0,
          disablekb: canControl ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
          autoplay: 0,
        },
        events: {
          onReady: (e) => {
            if (!isMounted) return;
            lastVideoIdRef.current = syncStateRef.current.videoId;
            suppress(1000);
            e.target.seekTo(syncStateRef.current.currentTime, true);
            if (syncStateRef.current.playState === 'playing') {
              e.target.playVideo();
            } else {
              e.target.pauseVideo();
            }
          },
          onStateChange: (e) => {
            if (!isMounted || isSuppressed()) return;
            const state = e.data;
            if (state === YT.PlayerState.PLAYING) {
              onPlay();
            } else if (state === YT.PlayerState.PAUSED) {
              const t = playerRef.current?.getCurrentTime() ?? 0;
              onPause(t);
            }
          },
          onError: (e) => {
            console.error('[YT Player Error code]', e.data);
          },
        },
      });
    });

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (err) {}
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [canControl]); // re-run if canControl changes so controls update

  // ─── Apply Remote Sync ───────────────────────────────────────────────────────
  const applySync = useCallback((state: SyncState) => {
    const player = playerRef.current;
    if (!player || typeof player.getPlayerState !== 'function') return;

    suppress();

    if (state.videoId !== lastVideoIdRef.current) {
      console.log('[DEBUG YT] applySync changing video to:', state.videoId);
      lastVideoIdRef.current = state.videoId;
      suppress(1500);
      if (state.playState === 'playing') {
        player.loadVideoById({ videoId: state.videoId, startSeconds: state.currentTime });
      } else {
        player.cueVideoById({ videoId: state.videoId, startSeconds: state.currentTime });
      }
      return;
    }

    const localTime = player.getCurrentTime() ?? 0;
    if (Math.abs(localTime - state.currentTime) > 1.5) {
      player.seekTo(state.currentTime, true);
    }

    const ps = player.getPlayerState();
    if (state.playState === 'playing' && ps !== YT.PlayerState.PLAYING) {
      player.playVideo();
    } else if (state.playState === 'paused' && ps === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    }
  }, []);

  useEffect(() => {
    applySync(syncState);
  }, [syncState, applySync]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="yt-wrapper">
      <div className="yt-player-container" ref={containerRef} style={{ width: '100%', height: '100%' }}>
      </div>

      {!canControl && (
        <div className="viewer-overlay">
          <span className="viewer-badge">👁 Viewer Mode</span>
        </div>
      )}
    </div>
  );
}
