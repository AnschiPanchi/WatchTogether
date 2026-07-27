import { useState, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import WatchRoom from './components/WatchRoom';
import './index.css';

export default function App() {
  const [roomState, setRoomState] = useState(null);

  const handleJoined = useCallback((state) => {
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
