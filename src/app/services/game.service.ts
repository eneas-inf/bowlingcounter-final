import { computed, signal, Signal } from '@angular/core';
import { inject, Injectable } from '@angular/core';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { Frame } from '../models/frame.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly storage = inject(StorageService) as StorageService;

  private readonly _games = signal<Game[]>(this.storage.getGames());
  readonly games: Signal<Game[]> = this._games;

  private readonly _activeGame = signal<Game | null>(null);
  readonly activeGame: Signal<Game | null> = this._activeGame;

  readonly playerTotals = computed(() => {
    const g = this._activeGame();
    if (!g) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const p of g.players) {
      out[p.id] = this.calculateTotalForPlayer(g.playerFrames[p.id] ?? []);
    }
    return out;
  });

  constructor() {
    const active = this.storage.getActiveGame();
    if (active) this._activeGame.set(active);
  }

  startNewGame(players: Pick<Player, 'id' | 'name'>[]): Game {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
    const now = new Date().toISOString();
    const playersFull: Player[] = players.map((p: Pick<Player, 'id' | 'name'>) => ({ ...p, createdAt: now } as Player));

    const framesFor = () => Array.from({ length: 10 }, (_, i) => ({ index: i + 1, rolls: [] } as Frame));

    const game: Game = {
      id,
      players: playersFull,
      playerFrames: Object.fromEntries(playersFull.map((p: Player) => [p.id, framesFor()])),
      currentPlayerId: playersFull[0]?.id,
      currentFrameIndex: 1,
      createdAt: now,
      undoStack: [],
    };

    this._games.update((g) => [...g, game]);
    this._activeGame.set(game);
    this.storage.saveGame(game);
    this.storage.setActiveGame(game.id);
    return game;
  }

  loadGame(gameId: string): void {
    const g = this._games().find((x: Game) => x.id === gameId);
    if (g) {
      this._activeGame.set(g);
      this.storage.setActiveGame(g.id);
    }
  }

  private saveActive(): void {
    const g = this._activeGame();
    if (!g) return;
    g.updatedAt = new Date().toISOString();
    this.storage.saveGame(g);
    this._games.update((list) => {
      const idx = list.findIndex((x: Game) => x.id === g.id);
      if (idx >= 0) {
        const copy = [...list];
        copy[idx] = g;
        return copy;
      }
      return [...list, g];
    });
  }

  roll(pins: number): void {
    const g = this._activeGame();
    if (!g) return;
    const playerId = g.currentPlayerId;
    if (!playerId) return;

    g.undoStack = g.undoStack ?? [];
    try {
      const snapshotState = typeof structuredClone === 'function' ? structuredClone(g) : JSON.parse(JSON.stringify(g));
      (g.undoStack as any).push({ timestamp: new Date().toISOString(), state: snapshotState as Game });
    } catch {
      // ignore snapshot failures
    }

    const frames = g.playerFrames[playerId];
    const frame = frames[g.currentFrameIndex - 1];
    frame.rolls.push({ pins, timestamp: new Date().toISOString() } as any);

    const playerIndex = g.players.findIndex((p: Player) => p.id === playerId);
    const nextPlayerIndex = (playerIndex + 1) % g.players.length;
    if (g.currentFrameIndex === 10 && frame.rolls.length >= 3) {
      g.currentPlayerId = g.players[nextPlayerIndex]?.id;
    } else if (frame.rolls.length >= 2 || pins === 10) {
      g.currentPlayerId = g.players[nextPlayerIndex]?.id;
      if (nextPlayerIndex === 0) g.currentFrameIndex = Math.min(10, g.currentFrameIndex + 1);
    }

    this._activeGame.set(g);
    this.saveActive();
  }

  undo(): void {
    const g = this._activeGame();
    if (!g) return;
    const last = g.undoStack?.pop();
    if (last) {
      this._activeGame.set(last.state);
      this.saveActive();
    }
  }

  calculateTotalForPlayer(frames: Frame[]): number {
    let total = 0;
    for (const f of frames) {
      for (const r of f.rolls) total += (r as any).pins ?? 0;
    }
    return total;
  }
}
