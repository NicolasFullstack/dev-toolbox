import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  IdempotencyConflictError,
  runIdempotentRequest,
} from '../idempotent-request.js';

const schema = readFileSync(
  new URL('../products-schema.sql', import.meta.url),
  'utf8',
);
const KEY = '018f47e2-81a6-7f21-b74c-2f9b0ca42ad5';
const HASH = 'a'.repeat(64);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(schema);
  const userId = database.prepare(`
    INSERT INTO users (email, display_name)
    VALUES ('ada@example.test', 'Ada')
    RETURNING id
  `).get().id;
  return { database, userId };
}

function request(userId, overrides = {}) {
  return {
    userId,
    route: '/products',
    idempotencyKey: KEY,
    requestHash: HASH,
    expiresAt: '2026-10-24T12:00:00Z',
    ...overrides,
  };
}

test('mémorise la première réponse dans la même transaction', () => {
  const { database, userId } = createDatabase();

  const result = runIdempotentRequest(database, request(userId), (connection) => {
    connection.prepare('INSERT INTO categories (name) VALUES (?)').run('Claviers');
    return { status: 201, body: { id: 42, name: 'Clavier' } };
  });

  assert.deepEqual(result, {
    replayed: false,
    status: 201,
    body: { id: 42, name: 'Clavier' },
  });
  assert.equal(
    database.prepare('SELECT COUNT(*) AS count FROM categories').get().count,
    1,
  );
  database.close();
});

test('rejoue la réponse sans répéter l’opération', () => {
  const { database, userId } = createDatabase();
  let calls = 0;
  const operation = () => {
    calls += 1;
    return { status: 201, body: { id: 42 } };
  };

  runIdempotentRequest(database, request(userId), operation);
  const replay = runIdempotentRequest(database, request(userId), operation);

  assert.equal(calls, 1);
  assert.deepEqual(replay, { replayed: true, status: 201, body: { id: 42 } });
  database.close();
});

test('refuse de réutiliser une clé avec un contenu différent', () => {
  const { database, userId } = createDatabase();
  runIdempotentRequest(database, request(userId), () => ({
    status: 201,
    body: { id: 42 },
  }));

  assert.throws(
    () => runIdempotentRequest(
      database,
      request(userId, { requestHash: 'b'.repeat(64) }),
      () => ({ status: 201, body: { id: 43 } }),
    ),
    IdempotencyConflictError,
  );
  database.close();
});

test('isole la même clé par utilisateur et par route', () => {
  const { database, userId } = createDatabase();
  const otherUserId = database.prepare(`
    INSERT INTO users (email, display_name)
    VALUES ('grace@example.test', 'Grace')
    RETURNING id
  `).get().id;

  runIdempotentRequest(database, request(userId), () => ({ status: 201, body: 1 }));
  const otherUser = runIdempotentRequest(
    database,
    request(otherUserId),
    () => ({ status: 201, body: 2 }),
  );
  const otherRoute = runIdempotentRequest(
    database,
    request(userId, { route: '/orders' }),
    () => ({ status: 201, body: 3 }),
  );

  assert.equal(otherUser.replayed, false);
  assert.equal(otherRoute.replayed, false);
  database.close();
});

test('annule l’écriture métier et la clé si l’opération échoue', () => {
  const { database, userId } = createDatabase();

  assert.throws(
    () => runIdempotentRequest(database, request(userId), (connection) => {
      connection.prepare('INSERT INTO categories (name) VALUES (?)').run('Claviers');
      throw new Error('création impossible');
    }),
    /création impossible/,
  );

  assert.equal(
    database.prepare('SELECT COUNT(*) AS count FROM categories').get().count,
    0,
  );
  assert.equal(
    database.prepare('SELECT COUNT(*) AS count FROM idempotency_requests').get().count,
    0,
  );
  database.close();
});

test('valide la portée, la clé et l’empreinte avant la transaction', () => {
  const { database, userId } = createDatabase();
  const operation = () => ({ status: 201, body: {} });

  assert.throws(
    () => runIdempotentRequest(database, request(userId, { idempotencyKey: 'court' }), operation),
    /idempotencyKey/,
  );
  assert.throws(
    () => runIdempotentRequest(database, request(userId, { route: 'products' }), operation),
    /route/,
  );
  assert.throws(
    () => runIdempotentRequest(database, request(userId, { requestHash: 'pas-un-hash' }), operation),
    /requestHash/,
  );
  database.close();
});
