import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PREFERENCES,
  createPreferencesStorage,
} from '../preferences-storage.js';

class MemoryStorage {
  constructor(initialValue = null) {
    this.value = initialValue;
  }

  getItem() {
    return this.value;
  }

  setItem(_key, value) {
    this.value = value;
  }

  removeItem() {
    this.value = null;
  }
}

test('charge des valeurs par défaut lorsque le stockage est vide', () => {
  const store = createPreferencesStorage(new MemoryStorage());

  assert.deepEqual(store.load(), DEFAULT_PREFERENCES);
  assert.notEqual(store.load(), DEFAULT_PREFERENCES);
});

test('enregistre uniquement les propriétés autorisées', () => {
  const storage = new MemoryStorage();
  const store = createPreferencesStorage(storage);

  const saved = store.save({
    theme: 'dark',
    compactMode: true,
    accessToken: 'valeur-a-ne-pas-conserver',
  });

  assert.deepEqual(saved, { theme: 'dark', compactMode: true });
  assert.deepEqual(JSON.parse(storage.value), saved);
  assert.equal(storage.value.includes('accessToken'), false);
});

test('revient aux valeurs par défaut si le JSON est corrompu', () => {
  const store = createPreferencesStorage(new MemoryStorage('{invalide'));

  assert.deepEqual(store.load(), DEFAULT_PREFERENCES);
});

test('revient aux valeurs par défaut si les données ont un schéma invalide', () => {
  const storage = new MemoryStorage(JSON.stringify({
    theme: 'inconnu',
    compactMode: 'oui',
  }));

  assert.deepEqual(createPreferencesStorage(storage).load(), DEFAULT_PREFERENCES);
});

test('propage une erreur d’écriture pour que l’interface puisse la traiter', () => {
  const storage = new MemoryStorage();
  storage.setItem = () => {
    throw new Error('Quota dépassé');
  };

  const store = createPreferencesStorage(storage);

  assert.throws(
    () => store.save({ theme: 'light', compactMode: false }),
    /Quota dépassé/,
  );
});

