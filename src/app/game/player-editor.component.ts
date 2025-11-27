import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { GameService } from '../services/game.service';

@Component({
  selector: 'player-editor',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="player-editor" role="region" aria-label="Spieler">
      <h3>Spieler</h3>
      <form [formGroup]="form" (ngSubmit)="addPlayer()">
        <label for="name">Name</label>
        <input id="name" formControlName="name" />
        <div class="actions">
          <button type="submit" [disabled]="form.invalid">Hinzufügen</button>
        </div>
      </form>
      <ul>
        <li *ngFor="let p of players(); trackBy: trackById">{{ p.name }}</li>
      </ul>
    </div>
  `,
  styles: [
    `
      .player-editor { border:1px solid #eee; padding:0.5rem }
      ul { padding-left:1rem }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerEditorComponent {
  private readonly gameService = inject(GameService);

  form = new FormGroup({ name: new FormControl('') });

  players = signal(this.gameService.games().flatMap((g) => g.players ?? []));

  addPlayer() {
    const name = this.form.value.name?.trim();
    if (!name) return;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    this.gameService.addPlayer({ id, name });
    this.form.reset();

    const active = this.gameService.activeGame();
    this.players.set(active?.players ?? []);
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }
}
