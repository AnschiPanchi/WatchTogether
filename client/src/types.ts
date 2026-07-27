export type Role = 'host' | 'moderator' | 'participant';
export type PlayState = 'playing' | 'paused';

export interface ParticipantInfo {
  userId: string;
  username: string;
  role: Role;
  joinedAt: number;
}

export interface SyncState {
  videoId: string;
  playState: PlayState;
  currentTime: number;
  triggeredBy?: string;
}

export interface ChatMessage {
  userId: string;
  username: string;
  role: Role;
  message: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  userId: string;
  username: string;
  role: Role;
  participants: ParticipantInfo[];
  syncState: SyncState;
  chatHistory: ChatMessage[];
}
