import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  ProductUpdateDeniedError,
  updateOwnedProduct,
} from '../update-owned-product.js';

const schema = readFileSync(
  new URL('../products-schema.sql', import.meta.url),
  'utf8',
);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(schema);
  const categoryId = database
    .prepare('INSERT INTO categories (name) VALUES (?) RETURNING id')
    .get('Claviers').id;
  const insertUser = database.prepare(`
    INSERT INTO users (email, display_name)
    VALUES (?, ?)
    RETURNING id
  `);
  const ownerId = insertUser.get('owner@example.test', 'Owner').id;
  const otherUserId = insertUser.get('other@example.test', 'Other').id;
  const productId = database.prepare(`
    INSERT INTO products (owner_id, category_id, name, price_cents)
    VALUES (?, ?, ?, ?)
    RETURNING id
  `).get(ownerId, categoryId, 'Clavier MIDI', 9990).id;

  return { database, ownerId, otherUserId, productId };
}

test('modifie le produit lorsque l’utilisateur en est propriétaire', () => {
  const { database, ownerId, productId } = createDatabase();

  const product = updateOwnedProduct(database, {
    productId,
    actorId: ownerId,
    name: '  Clavier maître  ',
    priceCents: 12990,
  });

  assert.deepEqual({ ...product }, {
    id: productId,
    owner_id: ownerId,
    name: 'Clavier maître',
    price_cents: 12990,
  });
  database.close();
});

test('ne modifie rien pour un autre utilisateur', () => {
  const { database, otherUserId, productId } = createDatabase();

  assert.throws(() => updateOwnedProduct(database, {
    productId,
    actorId: otherUserId,
    name: 'Produit détourné',
    priceCents: 1,
  }), ProductUpdateDeniedError);

  const product = database
    .prepare('SELECT name, price_cents FROM products WHERE id = ?')
    .get(productId);
  assert.deepEqual({ ...product }, { name: 'Clavier MIDI', price_cents: 9990 });
  database.close();
});

test('utilise la même erreur pour un produit absent', () => {
  const { database, ownerId } = createDatabase();

  assert.throws(() => updateOwnedProduct(database, {
    productId: 999,
    actorId: ownerId,
    name: 'Produit absent',
    priceCents: 1000,
  }), ProductUpdateDeniedError);
  database.close();
});

test('refuse les identifiants invalides avant la requête', () => {
  const { database, ownerId, productId } = createDatabase();

  assert.throws(() => updateOwnedProduct(database, {
    productId: 0,
    actorId: ownerId,
    name: 'Clavier',
    priceCents: 1000,
  }), /productId doit être un entier strictement positif/);
  assert.throws(() => updateOwnedProduct(database, {
    productId,
    actorId: '1',
    name: 'Clavier',
    priceCents: 1000,
  }), /actorId doit être un entier strictement positif/);
  database.close();
});

test('refuse un nom ou un prix invalide avant la requête', () => {
  const { database, ownerId, productId } = createDatabase();

  assert.throws(() => updateOwnedProduct(database, {
    productId,
    actorId: ownerId,
    name: ' ',
    priceCents: 1000,
  }), /name doit contenir entre 2 et 120 caractères/);
  assert.throws(() => updateOwnedProduct(database, {
    productId,
    actorId: ownerId,
    name: 'Clavier',
    priceCents: -1,
  }), /priceCents doit être un entier positif ou nul/);
  database.close();
});
