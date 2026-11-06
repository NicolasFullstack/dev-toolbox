import assert from 'node:assert/strict';
import test from 'node:test';

import { createSessionGuard } from '../session-guard.js';

test('transmet la réponse et les arguments de la requête', async () => {
  const calls = [];
  const guardedRequest = createSessionGuard({
    request: async (...args) => {
      calls.push(args);
      return { id: 42 };
    },
    onSessionExpired: () => assert.fail('la session ne doit pas être invalidée'),
  });

  assert.deepEqual(await guardedRequest('/me', { method: 'GET' }), { id: 42 });
  assert.deepEqual(calls, [['/me', { method: 'GET' }]]);
});

test('invalide la session puis propage la même erreur 401', async () => {
  const unauthorized = Object.assign(new Error('Non authentifié'), { status: 401 });
  let expirationCount = 0;
  const guardedRequest = createSessionGuard({
    request: async () => { throw unauthorized; },
    onSessionExpired: () => { expirationCount += 1; },
  });

  await assert.rejects(guardedRequest('/me'), (error) => error === unauthorized);
  assert.equal(expirationCount, 1);
});

test('ne notifie qu’une fois pendant une rafale de réponses 401', async () => {
  let expirationCount = 0;
  const guardedRequest = createSessionGuard({
    request: async () => {
      throw Object.assign(new Error('Session expirée'), { status: 401 });
    },
    onSessionExpired: () => { expirationCount += 1; },
  });

  const results = await Promise.allSettled([
    guardedRequest('/me'),
    guardedRequest('/products'),
    guardedRequest('/orders'),
  ]);

  assert.ok(results.every(({ status }) => status === 'rejected'));
  assert.equal(expirationCount, 1);
});

test('réarme la notification après une nouvelle authentification', async () => {
  let expirationCount = 0;
  const guardedRequest = createSessionGuard({
    request: async () => {
      throw Object.assign(new Error('Session expirée'), { status: 401 });
    },
    onSessionExpired: () => { expirationCount += 1; },
  });

  await assert.rejects(guardedRequest('/me'));
  guardedRequest.reset();
  await assert.rejects(guardedRequest('/me'));

  assert.equal(expirationCount, 2);
});

test('conserve la session pour un refus 403 ou une panne réseau', async () => {
  let expirationCount = 0;
  const errors = [
    Object.assign(new Error('Interdit'), { status: 403 }),
    new TypeError('fetch failed'),
  ];
  const guardedRequest = createSessionGuard({
    request: async () => { throw errors.shift(); },
    onSessionExpired: () => { expirationCount += 1; },
  });

  await assert.rejects(guardedRequest('/admin'), { status: 403 });
  await assert.rejects(guardedRequest('/me'), TypeError);
  assert.equal(expirationCount, 0);
});

test('refuse les dépendances invalides', () => {
  assert.throws(
    () => createSessionGuard({ request: null, onSessionExpired: () => {} }),
    /request doit être une fonction/,
  );
  assert.throws(
    () => createSessionGuard({ request: async () => {}, onSessionExpired: null }),
    /onSessionExpired doit être une fonction/,
  );
});
