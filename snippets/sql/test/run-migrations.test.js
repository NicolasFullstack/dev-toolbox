import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  applyMigrations,
  MigrationHistoryError,
} from '../run-migrations.js';

const migrations = [
  {
    version: 1,
    name: 'create_products',
    sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
  },
  {
    version: 2,
    name: 'add_products_active',
    sql: 'ALTER TABLE products ADD COLUMN active INTEGER NOT NULL DEFAULT 1',
  },
];

test('applique les migrations dans l’ordre et mémorise leur empreinte', () => {
  const database = new DatabaseSync(':memory:');

  assert.deepEqual(applyMigrations(database, migrations), [1, 2]);
  assert.deepEqual(
    database.prepare('SELECT version, name, length(checksum) AS size FROM schema_migrations ORDER BY version').all().map((row) => ({ ...row })),
    [
      { version: 1, name: 'create_products', size: 64 },
      { version: 2, name: 'add_products_active', size: 64 },
    ],
  );
  assert.deepEqual(
    database.prepare('PRAGMA table_info(products)').all().map(({ name }) => name),
    ['id', 'name', 'active'],
  );

  database.close();
});

test('ne rejoue pas les migrations déjà appliquées', () => {
  const database = new DatabaseSync(':memory:');

  applyMigrations(database, migrations);
  assert.deepEqual(applyMigrations(database, migrations), []);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 2);

  database.close();
});

test('refuse une migration modifiée après son application', () => {
  const database = new DatabaseSync(':memory:');
  applyMigrations(database, migrations);
  const changed = [
    { ...migrations[0], sql: `${migrations[0].sql}; -- correction tardive` },
    migrations[1],
  ];

  assert.throws(() => applyMigrations(database, changed), MigrationHistoryError);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 2);

  database.close();
});

test('refuse d’insérer tardivement une version antérieure', () => {
  const database = new DatabaseSync(':memory:');
  const existingVersion = {
    version: 2,
    name: 'create_products',
    sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY)',
  };
  applyMigrations(database, [existingVersion]);

  assert.throws(
    () => applyMigrations(database, [
      { version: 1, name: 'create_users', sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY)' },
      existingVersion,
    ]),
    MigrationHistoryError,
  );
  assert.deepEqual(
    database.prepare('SELECT version FROM schema_migrations').all().map(({ version }) => version),
    [2],
  );

  database.close();
});

test('annule tout le lot lorsqu’une migration échoue', () => {
  const database = new DatabaseSync(':memory:');
  const broken = [
    migrations[0],
    { version: 2, name: 'broken_sql', sql: 'ALTER TABLE missing_table ADD COLUMN value TEXT' },
  ];

  assert.throws(() => applyMigrations(database, broken), /missing_table/);
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'").get().count,
    0,
  );

  database.close();
});

test('conserve l’historique validé si un lot ultérieur échoue', () => {
  const database = new DatabaseSync(':memory:');
  applyMigrations(database, [migrations[0]]);
  const brokenNext = [
    migrations[0],
    { version: 2, name: 'broken_sql', sql: 'CREATE TABLE products (id INTEGER)' },
  ];

  assert.throws(() => applyMigrations(database, brokenNext), /already exists/);
  assert.deepEqual(
    database.prepare('SELECT version FROM schema_migrations').all().map(({ version }) => version),
    [1],
  );

  database.close();
});

test('refuse un catalogue désordonné avant d’ouvrir une transaction', () => {
  const database = new DatabaseSync(':memory:');

  assert.throws(
    () => applyMigrations(database, [migrations[1], migrations[0]]),
    /strictement croissants/,
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'").get().count,
    0,
  );

  database.close();
});
