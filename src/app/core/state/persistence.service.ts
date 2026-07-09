import { Injectable } from '@angular/core';
import {
  deserializeWorkbook,
  serializeWorkbook,
  Workbook,
} from '../model/workbook.model';

const DB_NAME = 'spreadsheet';
const DB_VERSION = 1;
const STORE = 'workbooks';
const CURRENT_KEY = 'current';
const SAVE_DEBOUNCE_MS = 300;

/**
 * Autosaves the open workbook to IndexedDB so in-progress work survives a
 * reload, even offline. `init()` runs as an app initializer so the saved
 * workbook is available synchronously when the store is created.
 */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private db: IDBDatabase | null = null;
  private restored: Workbook | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
      this.db = await openDatabase();
      const saved = await requestToPromise<unknown>(
        this.db.transaction(STORE, 'readonly').objectStore(STORE).get(CURRENT_KEY),
      );
      if (saved) {
        this.restored = deserializeWorkbook(saved as Parameters<typeof deserializeWorkbook>[0]);
      }
    } catch {
      // Persistence is best-effort: a broken/unavailable DB must not block startup.
      this.db = null;
    }
  }

  /** Workbook restored by `init()`, if any. */
  takeRestored(): Workbook | null {
    const workbook = this.restored;
    this.restored = null;
    return workbook;
  }

  /** Debounced write of the current workbook. */
  save(workbook: Workbook): void {
    if (!this.db) return;
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        this.db
          ?.transaction(STORE, 'readwrite')
          .objectStore(STORE)
          .put(serializeWorkbook(workbook), CURRENT_KEY);
      } catch {
        // Best-effort; never surface autosave failures as app errors.
      }
    }, SAVE_DEBOUNCE_MS);
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
