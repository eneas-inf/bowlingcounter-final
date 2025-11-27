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

  private cloneGame(g: Game): Game {
    try {
      // structuredClone preserves dates/objects when available
      return (typeof structuredClone === 'function' ? structuredClone(g) : JSON.parse(JSON.stringify(g))) as Game;
    } catch {
      return JSON.parse(JSON.stringify(g)) as Game;
    }
  }

  private framesFor(): Frame[] {
    return Array.from({ length: 10 }, (_, i) => ({ index: i + 1, rolls: [] } as Frame));
  }

  startNewGame(players: Pick<Player, 'id' | 'name'>[]): Game {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
    const now = new Date().toISOString();
    const playersFull: Player[] = players.map((p: Pick<Player, 'id' | 'name'>) => ({ ...p, createdAt: now } as Player));

    const game: Game = {
      id,
      players: playersFull,
      playerFrames: Object.fromEntries(playersFull.map((p: Player) => [p.id, this.framesFor()])),
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

  /**
   * Add a player to the currently active game immutably. If no active game exists, starts a new game.
   */
  addPlayer(player: Pick<Player, 'id' | 'name'>): Game {
    const active = this._activeGame();
    if (!active) {
      return this.startNewGame([player]);
    }

    const now = new Date().toISOString();
    const newPlayer: Player = { ...player, createdAt: now } as Player;

    // create a cloned new game object
    const newGame = this.cloneGame(active);

    // avoid duplicate ids: replace if exists, otherwise append
    const exists = newGame.players.find((p) => p.id === newPlayer.id);
    if (exists) {
      newGame.players = newGame.players.map((p) => (p.id === newPlayer.id ? newPlayer : p));
    } else {
      newGame.players = [...newGame.players, newPlayer];
      newGame.playerFrames = { ...newGame.playerFrames, [newPlayer.id]: this.framesFor() };
    }

    newGame.currentPlayerId = newGame.currentPlayerId ?? newPlayer.id;

    // persist and update signals immutably
    this._activeGame.set(newGame);
    this._games.update((list) => list.map((g) => (g.id === newGame.id ? newGame : g)));
    this.saveActive();
    return newGame;
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

    // snapshot for undo (use clone of current state)
    const snapshotState = this.cloneGame(g);
    const timestamp = new Date().toISOString();

    // clone game and mutate the clone
    const newGame = this.cloneGame(g);
    newGame.undoStack = newGame.undoStack ?? [];
    newGame.undoStack.push({ timestamp, state: snapshotState } as any);

    const frames = newGame.playerFrames[playerId];
    const frame = frames[newGame.currentFrameIndex - 1];
    frame.rolls = [...(frame.rolls ?? []), { pins, timestamp } as any];

    const playerIndex = newGame.players.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = (playerIndex + 1) % newGame.players.length;
    if (newGame.currentFrameIndex === 10 && frame.rolls.length >= 3) {
      newGame.currentPlayerId = newGame.players[nextPlayerIndex]?.id;
    } else if (frame.rolls.length >= 2 || pins === 10) {
      newGame.currentPlayerId = newGame.players[nextPlayerIndex]?.id;
      if (nextPlayerIndex === 0) newGame.currentFrameIndex = Math.min(10, newGame.currentFrameIndex + 1);
    }

    // set cloned game immutably so signals update
    this._activeGame.set(newGame);
    this._games.update((list) => list.map((x) => (x.id === newGame.id ? newGame : x)));
    this.saveActive();
  }

  undo(): void {
    const g = this._activeGame();
    if (!g) return;
    const last = (g.undoStack ?? []).slice(-1)[0];
    if (last) {
      // restore snapshot (assume snapshot is a full state)
      const restored = this.cloneGame(last.state as Game);
      // remove last snapshot
      restored.undoStack = (restored.undoStack ?? []).slice(0, -1);
      this._activeGame.set(restored);
      this._games.update((list) => list.map((x) => (x.id === restored.id ? restored : x)));
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
