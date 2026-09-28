import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  InsufficientStockError,
  reserveStock,
} from '../reserve-stock.js';

const schema = readFileSync(
  new URL('../products-schema.sql', import.meta.url),
  'utf8',
);

function createDatabase(stock = 5) {
  const database = new DatabaseSync(':memory:');
  database.exec(schema);
  const categoryId = database
    .prepare('INSERT INTO categories (name) VALUES (?) RETURNING id')
    .get('Claviers').id;
  const productId = database.prepare(`
    INSERT INTO products (category_id, name, price_cents, stock)
    VALUES (?, ?, ?, ?)
    RETURNING id
  `).get(categoryId, 'Clavier MIDI', 9990, stock).id;

  return { database, productId };
}

test('diminue le stock et enregistre le mouvement dans une transaction', () => {
  const { database, productId } = createDatabase();

  const product = reserveStock(database, { productId, quantity: 2 });
  const movement = database.prepare(`
    SELECT product_id, quantity_delta, reason
    FROM stock_movements
  `).get();

  assert.deepEqual({ ...product }, { id: productId, stock: 3 });
  assert.deepEqual({ ...movement }, {
    product_id: productId,
    quantity_delta: -2,
    reason: 'reservation',
  });

  database.close();
});

test('ne modifie rien lorsque le stock est insuffisant', () => {
  const { database, productId } = createDatabase(1);

  assert.throws(
    () => reserveStock(database, { productId, quantity: 2 }),
    InsufficientStockError,
  );

  const product = database
    .prepare('SELECT stock FROM products WHERE id = ?')
    .get(productId);
  const movementCount = database
    .prepare('SELECT COUNT(*) AS count FROM stock_movements')
    .get().count;

  assert.equal(product.stock, 1);
  assert.equal(movementCount, 0);

  database.close();
});

test('annule la diminution si l’écriture du mouvement échoue', () => {
  const { database, productId } = createDatabase();
  database.exec(`
    CREATE TRIGGER reject_stock_movement
    BEFORE INSERT ON stock_movements
    BEGIN
      SELECT RAISE(ABORT, 'mouvement indisponible');
    END;
  `);

  assert.throws(
    () => reserveStock(database, { productId, quantity: 2 }),
    /mouvement indisponible/,
  );

  const product = database
    .prepare('SELECT stock FROM products WHERE id = ?')
    .get(productId);

  assert.equal(product.stock, 5);

  database.close();
});

test('refuse un identifiant ou une quantité invalide avant la transaction', () => {
  const { database, productId } = createDatabase();

  assert.throws(
    () => reserveStock(database, { productId, quantity: 0 }),
    /quantity doit être un entier strictement positif/,
  );
  assert.throws(
    () => reserveStock(database, { productId: '1', quantity: 1 }),
    /productId doit être un entier strictement positif/,
  );

  database.close();
});

