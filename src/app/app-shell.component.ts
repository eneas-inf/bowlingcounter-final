import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header.component';

@Component({
  selector: 'app-shell',
  imports: [RouterModule, HeaderComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `:host { display:block; min-height:100vh; } main { padding: 1rem; }`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {}

