import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-header',
  imports: [NgOptimizedImage],
  template: `
    <header role="banner" class="app-header">
      <div class="brand">
        <img ngSrc="/assets/logo.jpg" width="64" height="64" alt="Bowling Counter logo"/>
        <h1>Bowling Counter</h1>
      </div>
      <div class="controls">
        <button (click)="newGame()" aria-label="Neues Spiel">Neues Spiel</button>
      </div>
    </header>
  `,
  styles: [
    `
      .app-header { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem; border-bottom:1px solid #ddd }
      .brand { display:flex; align-items:center; gap:0.5rem }
      h1 { font-size:1.125rem; margin:0 }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly gameService = inject(GameService);

  newGame() {
    window.alert('Neues Spiel (implementiert in der Game-UI)');
  }
}
