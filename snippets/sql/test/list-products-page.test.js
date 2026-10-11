import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { listActiveProductsPage } from '../list-products-page.js';

const schema = readFileSync(
  new URL('../products-schema.sql', import.meta.url),
  'utf8',
);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(schema);
  database.exec(`
    INSERT INTO users (id, email, display_name)
    VALUES (1, 'ada@example.test', 'Ada');

    INSERT INTO categories (id, name)
    VALUES (1, 'Claviers');
  `);
  return database;
}

function insertProduct(
  database,
  { name, createdAt, active = 1 },
) {
  return database.prepare(`
    INSERT INTO products (
      owner_id,
      category_id,
      name,
      price_cents,
      active,
      created_at
    ) VALUES (1, 1, ?, 1000, ?, ?)
    RETURNING id
  `).get(name, active, createdAt).id;
}

test('parcourt les produits sans doublon avec un tri stable', () => {
  const database = createDatabase();
  insertProduct(database, { name: 'Ancien', createdAt: '2026-01-01 10:00:00' });
  insertProduct(database, { name: 'Milieu A', createdAt: '2026-01-02 10:00:00' });
  insertProduct(database, { name: 'Milieu B', createdAt: '2026-01-02 10:00:00' });
  insertProduct(database, { name: 'Récent', createdAt: '2026-01-03 10:00:00' });

  const firstPage = listActiveProductsPage(database, { limit: 2 });
  const secondPage = listActiveProductsPage(database, {
    limit: 2,
    cursor: firstPage.nextCursor,
  });

  assert.deepEqual(
    firstPage.items.map(({ name }) => name),
    ['Récent', 'Milieu B'],
  );
  assert.deepEqual(
    secondPage.items.map(({ name }) => name),
    ['Milieu A', 'Ancien'],
  );
  assert.equal(secondPage.nextCursor, null);
  assert.equal(
    new Set([...firstPage.items, ...secondPage.items].map(({ id }) => id)).size,
    4,
  );

  database.close();
});

test('ne décale pas la page suivante lorsqu’un produit plus récent est ajouté', () => {
  const database = createDatabase();
  insertProduct(database, { name: 'Premier', createdAt: '2026-01-01 10:00:00' });
  insertProduct(database, { name: 'Deuxième', createdAt: '2026-01-02 10:00:00' });
  insertProduct(database, { name: 'Troisième', createdAt: '2026-01-03 10:00:00' });

  const firstPage = listActiveProductsPage(database, { limit: 2 });
  insertProduct(database, { name: 'Nouveau', createdAt: '2026-01-04 10:00:00' });
  const secondPage = listActiveProductsPage(database, {
    limit: 2,
    cursor: firstPage.nextCursor,
  });

  assert.deepEqual(
    firstPage.items.map(({ name }) => name),
    ['Troisième', 'Deuxième'],
  );
  assert.deepEqual(secondPage.items.map(({ name }) => name), ['Premier']);

  database.close();
});

test('exclut les produits inactifs', () => {
  const database = createDatabase();
  insertProduct(database, { name: 'Visible', createdAt: '2026-01-01 10:00:00' });
  insertProduct(database, {
    name: 'Masqué',
    createdAt: '2026-01-02 10:00:00',
    active: 0,
  });

  const page = listActiveProductsPage(database);

  assert.deepEqual(page.items.map(({ name }) => name), ['Visible']);
  assert.equal(page.nextCursor, null);

  database.close();
});

test('refuse une limite ou un curseur invalide avant la requête', () => {
  const database = createDatabase();

  assert.throws(
    () => listActiveProductsPage(database, { limit: 0 }),
    /limit doit être un entier/,
  );
  assert.throws(
    () => listActiveProductsPage(database, {
      cursor: { createdAt: '', id: -1 },
    }),
    /curseur de pagination est invalide/,
  );

  database.close();
});

test('utilise l’index dédié à la pagination', () => {
  const database = createDatabase();
  const plan = database.prepare(`
    EXPLAIN QUERY PLAN
    SELECT id, name, price_cents, created_at
    FROM products
    WHERE active = 1
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(21);

  assert.equal(
    plan.some(({ detail }) => detail.includes('idx_products_active_created_id')),
    true,
  );

  database.close();
});
