import { Player } from './player.model';
import { Frame } from './frame.model';

export interface Game {
  id: string;
  players: Player[];
  playerFrames: Record<string, Frame[]>; // keyed by playerId
  currentPlayerId?: string;
  currentFrameIndex: number; // 1..10
  createdAt: string;
  updatedAt?: string;
  undoStack?: GameSnapshot[];
  metadata?: Record<string, string | number | boolean>;
}

export interface GameSnapshot {
  timestamp: string;
  state: Game;
}

export interface StorageSchema {
  version: number;
  games: Game[];
  activeGameId?: string;
}

