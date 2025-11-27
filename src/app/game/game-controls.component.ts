import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { GameService } from '../services/game.service';

@Component({
  selector: 'game-controls',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="controls" role="region" aria-label="Spielsteuerung">
      <label for="pins">Pins</label>
      <input id="pins" type="number" min="0" max="10" [(ngModel)]="pins" />
      <button (click)="roll()">Wurf</button>
      <button (click)="undo()">Rückgängig</button>
    </div>
  `,
  styles: [
    `
      .controls { display:flex; gap:0.5rem; align-items:center }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameControlsComponent {
  private readonly gameService = inject(GameService) as GameService;
  pins = 0;

  roll() {
    const n = Math.max(0, Math.min(10, Number(this.pins) || 0));
    this.gameService.roll(n);
    this.pins = 0;
  }

  undo() {
    this.gameService.undo();
  }
}
