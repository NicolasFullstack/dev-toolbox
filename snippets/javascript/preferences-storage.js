const STORAGE_KEY = 'demo:preferences:v1';
const ALLOWED_THEMES = new Set(['light', 'dark', 'system']);

export const DEFAULT_PREFERENCES = Object.freeze({
  theme: 'system',
  compactMode: false,
});

function normalizePreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Les préférences doivent être un objet.');
  }

  if (!ALLOWED_THEMES.has(input.theme)) {
    throw new TypeError('Le thème doit être light, dark ou system.');
  }

  if (typeof input.compactMode !== 'boolean') {
    throw new TypeError('Le mode compact doit être un booléen.');
  }

  return {
    theme: input.theme,
    compactMode: input.compactMode,
  };
}

export function createPreferencesStorage(storage, key = STORAGE_KEY) {
  if (!storage
    || typeof storage.getItem !== 'function'
    || typeof storage.setItem !== 'function'
    || typeof storage.removeItem !== 'function') {
    throw new TypeError('Une implémentation Storage valide est nécessaire.');
  }

  return {
    load() {
      try {
        const rawPreferences = storage.getItem(key);

        if (rawPreferences === null) {
          return { ...DEFAULT_PREFERENCES };
        }

        return normalizePreferences(JSON.parse(rawPreferences));
      } catch {
        return { ...DEFAULT_PREFERENCES };
      }
    },

    save(preferences) {
      const normalizedPreferences = normalizePreferences(preferences);
      storage.setItem(key, JSON.stringify(normalizedPreferences));
      return normalizedPreferences;
    },

    clear() {
      storage.removeItem(key);
    },
  };
}

