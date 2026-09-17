import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getActiveProductsByPrice,
  getTotalPrice,
} from '../products.js';

const products = [
  { id: 1, name: 'Clavier MIDI', price: 99.9, active: true },
  { id: 2, name: 'Casque', price: 59.9, active: false },
  { id: 3, name: 'Pédale', price: 34.5, active: true },
];

test('filtre et trie les produits sans modifier la liste reçue', () => {
  const snapshot = structuredClone(products);

  const result = getActiveProductsByPrice(products);

  assert.deepEqual(result.map((product) => product.id), [3, 1]);
  assert.deepEqual(products, snapshot);
});

test('additionne les prix', () => {
  assert.equal(getTotalPrice(products), 194.3);
});

test('refuse une liste invalide', () => {
  assert.throws(
    () => getActiveProductsByPrice(null),
    /doit être un tableau/,
  );
});

test('refuse un prix négatif', () => {
  assert.throws(
    () => getTotalPrice([{ price: -1 }]),
    /nombre positif/,
  );
});
