import { useState, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import WatchRoom from './components/WatchRoom';
import type { RoomState } from './types';
import './index.css';

export default function App() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  const handleJoined = useCallback((state: RoomState) => {
    setRoomState(state);
  }, []);

  const handleLeave = useCallback(() => {
    setRoomState(null);
  }, []);

  return (
    <>
      {roomState ? (
        <WatchRoom roomState={roomState} onLeave={handleLeave} />
      ) : (
        <LandingPage onJoined={handleJoined} />
      )}
    </>
  );
}


