import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const schema = readFileSync(
  new URL('../products-schema.sql', import.meta.url),
  'utf8',
);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(schema);
  return database;
}

function insertCategory(database, name = 'Claviers') {
  return database
    .prepare('INSERT INTO categories (name) VALUES (?) RETURNING id')
    .get(name).id;
}

test('insère un produit valide avec des paramètres liés', () => {
  const database = createDatabase();
  const categoryId = insertCategory(database);

  const product = database.prepare(`
    INSERT INTO products (category_id, name, price_cents)
    VALUES (?, ?, ?)
    RETURNING id, category_id, name, price_cents, active
  `).get(categoryId, 'Clavier MIDI', 9990);

  assert.deepEqual(
    { ...product },
    {
      id: 1,
      category_id: 1,
      name: 'Clavier MIDI',
      price_cents: 9990,
      active: 1,
    },
  );

  database.close();
});

test('refuse un prix négatif', () => {
  const database = createDatabase();
  const categoryId = insertCategory(database);
  const insertProduct = database.prepare(`
    INSERT INTO products (category_id, name, price_cents)
    VALUES (?, ?, ?)
  `);

  assert.throws(
    () => insertProduct.run(categoryId, 'Produit invalide', -1),
    /CHECK constraint failed/,
  );

  database.close();
});

test('refuse une catégorie inexistante', () => {
  const database = createDatabase();

  assert.throws(
    () => database.prepare(`
      INSERT INTO products (category_id, name, price_cents)
      VALUES (?, ?, ?)
    `).run(999, 'Produit orphelin', 1000),
    /FOREIGN KEY constraint failed/,
  );

  database.close();
});

test('refuse deux catégories identiques sans tenir compte de la casse', () => {
  const database = createDatabase();
  insertCategory(database, 'Claviers');

  assert.throws(
    () => insertCategory(database, 'claviers'),
    /UNIQUE constraint failed/,
  );

  database.close();
});

test('interdit la suppression d’une catégorie encore utilisée', () => {
  const database = createDatabase();
  const categoryId = insertCategory(database);
  database.prepare(`
    INSERT INTO products (category_id, name, price_cents)
    VALUES (?, ?, ?)
  `).run(categoryId, 'Clavier MIDI', 9990);

  assert.throws(
    () => database.prepare('DELETE FROM categories WHERE id = ?').run(categoryId),
    /FOREIGN KEY constraint failed/,
  );

  database.close();
});

test('utilise l’index pour filtrer et trier les produits actifs', () => {
  const database = createDatabase();
  const queryPlan = database.prepare(`
    EXPLAIN QUERY PLAN
    SELECT id, name, price_cents
    FROM products
    WHERE category_id = ? AND active = 1
    ORDER BY name
    LIMIT ?
  `).all(1, 20);

  assert.equal(
    queryPlan.some(({ detail }) => (
      detail.includes('idx_products_category_active_name')
    )),
    true,
  );

  database.close();
});

