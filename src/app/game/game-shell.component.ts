import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerEditorComponent } from './player-editor.component';
import { ScoreboardComponent } from './scoreboard.component';
import { GameControlsComponent } from './game-controls.component';

@Component({
  selector: 'app-game-shell',
  imports: [CommonModule, PlayerEditorComponent, ScoreboardComponent, GameControlsComponent],
  template: `
    <section aria-labelledby="game-title">
      <h2 id="game-title">Spiel</h2>
      <div class="layout">
        <player-editor></player-editor>
        <scoreboard></scoreboard>
      </div>
      <game-controls></game-controls>
    </section>
  `,
  styles: [
    `
      .layout { display:flex; gap:1rem; align-items:flex-start }
      player-editor { width: 280px }
      scoreboard { flex: 1 }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameShellComponent {}
