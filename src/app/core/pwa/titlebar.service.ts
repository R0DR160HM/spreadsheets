import { Injectable, signal } from '@angular/core';

/** Subset of the Window Controls Overlay API (not yet in TypeScript's dom lib). */
interface WindowControlsOverlay extends EventTarget {
  visible: boolean;
}

/**
 * Tracks the PWA Window Controls Overlay: when the app is installed on
 * desktop with `"display_override": ["window-controls-overlay"]`, the OS
 * title bar collapses to the window buttons and the app renders into the
 * rest of the strip (the toolbar moves its File group there). `visible`
 * is false in browser tabs, on mobile, and when the user toggles the
 * overlay off — the layout must work in both states.
 */
@Injectable({ providedIn: 'root' })
export class TitlebarService {
  readonly visible = signal(false);

  constructor() {
    const overlay = (navigator as Navigator & { windowControlsOverlay?: WindowControlsOverlay })
      .windowControlsOverlay;
    if (!overlay) return;
    this.visible.set(overlay.visible);
    overlay.addEventListener('geometrychange', () => this.visible.set(overlay.visible));
  }
}
