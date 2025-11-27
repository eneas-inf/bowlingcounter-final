import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'game', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./app-shell.component').then(m => m.AppShellComponent),
    children: [
      {
        path: 'game',
        loadComponent: () => import('./game/game-shell.component').then(m => m.GameShellComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'game' }
];
