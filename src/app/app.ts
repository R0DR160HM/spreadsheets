import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { I18nService } from './core/i18n/i18n.service';
import { GridComponent } from './spreadsheet/grid.component';
import { SheetTabsComponent } from './spreadsheet/sheet-tabs.component';
import { ToolbarComponent } from './spreadsheet/toolbar.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolbarComponent, GridComponent, SheetTabsComponent],
  template: `
    <main class="shell">
      <h1 class="sr-only">{{ i18n.t('app.title') }}</h1>
      <app-toolbar />
      <app-grid />
      <app-sheet-tabs />
    </main>
  `,
  styles: `
    .shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class App {
  protected readonly i18n = inject(I18nService);
  private readonly swUpdate = inject(SwUpdate);

  constructor() {
    effect(() => {
      document.documentElement.lang = this.i18n.locale();
      document.title = this.i18n.t('app.title');
    });

    // Reloading is safe at any moment: the workbook autosaves to IndexedDB.
    if (this.swUpdate.isEnabled) {
      // Pick up new versions as soon as they are downloaded, so clients
      // never keep running a stale build after a deploy.
      this.swUpdate.versionUpdates
        .pipe(filter((event) => event.type === 'VERSION_READY'))
        .subscribe(() => document.location.reload());
      // The cache lost files it needs (e.g. evicted lazy chunks that no
      // longer exist on the server) — without this, features that lazy-load
      // (opening/saving files) fail until the user clears site data.
      this.swUpdate.unrecoverable.subscribe(() => document.location.reload());
    }
  }
}
