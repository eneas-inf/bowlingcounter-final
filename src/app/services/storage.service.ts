import { Injectable } from '@angular/core';
import { StorageSchema, Game } from '../models/game.model';

const STORAGE_KEY = 'bowling:storage:v1';
const CURRENT_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class StorageService {
  getRaw(): StorageSchema | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StorageSchema;
      if (typeof parsed.version !== 'number') return null;
      return parsed;
    } catch (e) {
      console.warn('Failed to read storage:', e);
      return null;
    }
  }

  save(raw: StorageSchema): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    } catch (e) {
      console.warn('Failed to write storage:', e);
    }
  }

  ensure(): StorageSchema {
    const existing = this.getRaw();
    if (!existing) {
      const initial: StorageSchema = { version: CURRENT_VERSION, games: [] };
      this.save(initial);
      return initial;
    }

    if (existing.version !== CURRENT_VERSION) {
      const migrated: StorageSchema = { version: CURRENT_VERSION, games: existing.games ?? [] };
      this.save(migrated);
      return migrated;
    }

    return existing;
  }

  getGames(): Game[] {
    const s = this.ensure();
    return s.games;
  }

  saveGame(game: Game): void {
    const s = this.ensure();
    const idx = s.games.findIndex((g) => g.id === game.id);
    if (idx >= 0) s.games[idx] = game;
    else s.games.push(game);
    this.save(s);
  }

  deleteGame(gameId: string): void {
    const s = this.ensure();
    s.games = s.games.filter((g) => g.id !== gameId);
    this.save(s);
  }

  setActiveGame(gameId?: string): void {
    const s = this.ensure();
    s.activeGameId = gameId;
    this.save(s);
  }

  getActiveGame(): Game | undefined {
    const s = this.ensure();
    return s.games.find((g) => g.id === s.activeGameId);
  }
}

