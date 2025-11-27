import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { GameService } from '../services/game.service';

@Component({
  selector: 'scoreboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div role="table" aria-label="Scoreboard">
      <div role="rowgroup">
        <div role="row">
          <div role="columnheader">Spieler</div>
          <div role="columnheader" *ngFor="let i of frames">{{ i }}</div>
          <div role="columnheader">Gesamt</div>
        </div>
      </div>

      <div role="rowgroup">
        <div role="row" *ngFor="let player of (game()?.players || []); trackBy: trackById">
          <div role="cell">{{ player.name }}</div>
          <div role="cell" *ngFor="let frame of framesFor(player.id)">
            {{ rollString(frame) }}
          </div>
          <div role="cell">{{ totals()[player.id] ?? 0 }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      [role="table"] { width:100%; border-collapse:collapse }
      [role="row"] { display:flex; gap:0.5rem; padding:0.25rem 0 }
      [role="columnheader"] { font-weight:600; width:3rem }
      [role="cell"] { width:3rem }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreboardComponent {
  private readonly gameService = inject(GameService) as GameService;
  game = this.gameService.activeGame;
  totals = this.gameService.playerTotals;

  frames = Array.from({ length: 10 }, (_, i) => i + 1);

  trackById(_: number, item: { id: string }) {
    return item.id;
  }

  framesFor(playerId: string) {
    const g = this.game();
    if (!g) return [] as any[];
    return g.playerFrames[playerId] ?? [];
  }

  rollString(frame: any): string {
    return (frame.rolls ?? []).map((r: any) => String(r.pins)).join(',');
  }
}
