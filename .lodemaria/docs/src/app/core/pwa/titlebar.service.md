## File: src/app/core/pwa/titlebar.service.ts

### Purpose and Role in the Project

The `TitlebarService` provides a way to interact with the title bar of an application when the app is installed on a desktop or mobile device. It tracks the status of the OS title bar collapse and updates the layout accordingly.

### Public/Exported Classes, Functions, Constants, and Entry Points

1. **WindowControlsOverlay Interface**: Defines the API for interacting with the OS's window controls overlay.
2. **TitlebarService Class**:
   - Uses `signal` to create a boolean state that tracks the current visibility of the title bar.
   - Registers an event listener on `windowControlsOverlay` to detect changes in its geometry.
   - Updates the `visible` state based on whether the window controls overlay is visible.
3. **Dependency Injection**: Injects the `WindowControlsOverlay` into the service.

### Notable Internal Logic, Algorithms, and Side Effects

- **Event Listener**: The service subscribes to the `windowControlsOverlay`'s `geometrychange` event to detect changes in the title bar's position or size.
- **Visibility Toggle**: When the application is installed on a desktop with `"display_override": ["window-controls-overlay"]`, it toggles the visibility of the OS title bar.
  - If the overlay is visible, it sets the `visible` state to `false`.
  - If the overlay is not visible, it resets the `visible` state to `true`.

### When Several Companion Files are Given

- **Code Block**: The service is demonstrated together in a single unit as an example.
  ```typescript
  // src/app/core/pwa/titlebar.service.ts
  import { Injectable } from '@angular/core';

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
  ```

This unit demonstrates the service's functionality and how it interacts with the OS title bar, allowing for easy management of the app's title bar.
