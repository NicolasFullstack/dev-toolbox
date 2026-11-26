import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { searchProducts } from '../search-products.js';

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(readFileSync(new URL('../products-schema.sql', import.meta.url), 'utf8'));
  database.exec(`
    INSERT INTO users VALUES (1, 'ada@example.test', 'Ada');
    INSERT INTO categories VALUES (1, 'Claviers'), (2, 'Souris');
    INSERT INTO products (id, owner_id, category_id, name, price_cents, active, created_at) VALUES
      (1, 1, 1, 'Clavier compact', 5900, 1, '2026-01-01'),
      (2, 1, 1, 'Clavier 100% mécanique', 12900, 1, '2026-01-03'),
      (3, 1, 2, 'Souris ergonomique', 7900, 1, '2026-01-02'),
      (4, 1, 2, 'Souris masquée', 3900, 0, '2026-01-04');
  `);
  return database;
}

test('combine recherche, catégorie, prix et tri autorisé', () => {
  const database = createDatabase();
  const products = searchProducts(database, {
    query: 'clavier', categoryId: 1, minPriceCents: 5000,
    maxPriceCents: 15000, sort: 'priceDesc',
  });

  assert.deepEqual(products.map(({ id }) => id), [2, 1]);
  assert.equal(products[0].category_name, 'Claviers');
  database.close();
});

test('traite les jokers LIKE comme du texte utilisateur', () => {
  const database = createDatabase();

  assert.deepEqual(searchProducts(database, { query: '100%' }).map(({ id }) => id), [2]);
  assert.deepEqual(searchProducts(database, { query: '%' }).map(({ id }) => id), [2]);
  assert.deepEqual(searchProducts(database, { query: '_' }), []);
  database.close();
});

test('exclut systématiquement les produits inactifs', () => {
  const database = createDatabase();

  assert.deepEqual(
    searchProducts(database, { query: 'souris', sort: 'name' }).map(({ id }) => id),
    [3],
  );
  database.close();
});

test('refuse un tri injecté avant de préparer la requête', () => {
  let prepareCalls = 0;
  const database = { prepare() { prepareCalls += 1; } };

  assert.throws(
    () => searchProducts(database, { sort: 'price_cents; DROP TABLE products' }),
    /tri demandé n’est pas autorisé/,
  );
  assert.equal(prepareCalls, 0);
});

test('valide les bornes numériques et la limite', () => {
  const database = createDatabase();

  for (const filters of [
    { categoryId: 0 }, { minPriceCents: -1 },
    { minPriceCents: 500, maxPriceCents: 100 }, { limit: 101 },
  ]) {
    assert.throws(() => searchProducts(database, filters));
  }
  database.close();
});
