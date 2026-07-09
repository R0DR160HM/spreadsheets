import { Injectable, signal } from '@angular/core';
import { Locale, TRANSLATIONS, TranslationKey } from './translations';

/**
 * Runtime internationalization. The locale is detected from the system
 * language: Portuguese (`pt`, `pt-BR`, …) gets Portuguese, everything else
 * falls back to English.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<Locale>(detectLocale());

  /** Translates a key, substituting `{placeholders}` from `params`. */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = TRANSLATIONS[this.locale()][key];
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  }
}

function detectLocale(): Locale {
  const language = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}
