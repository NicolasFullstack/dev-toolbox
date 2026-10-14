import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpError, NetworkError } from '../fetch-json.js';
import { fetchJsonWithRetry } from '../fetch-json-with-retry.js';

function jsonResponse(data, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

test('renvoie immédiatement une réponse réussie', async () => {
  let attempts = 0;
  const delays = [];
  const result = await fetchJsonWithRetry('https://api.example.test/products', {
    fetchImpl: async () => {
      attempts += 1;
      return jsonResponse({ ok: true });
    },
    sleep: async (delay) => delays.push(delay),
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test('respecte Retry-After avant de retenter un statut 503', async () => {
  let attempts = 0;
  const delays = [];
  const result = await fetchJsonWithRetry('https://api.example.test/products', {
    fetchImpl: async () => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse({ code: 'unavailable' }, {
          status: 503,
          headers: { 'Retry-After': '2' },
        })
        : jsonResponse({ ok: true });
    },
    sleep: async (delay) => delays.push(delay),
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(delays, [2000]);
});

test('applique une attente exponentielle aux pannes réseau', async () => {
  let attempts = 0;
  const delays = [];
  const result = await fetchJsonWithRetry('https://api.example.test/products', {
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 3) throw new TypeError('connexion indisponible');
      return jsonResponse({ ok: true });
    },
    baseDelayMs: 100,
    sleep: async (delay) => delays.push(delay),
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(delays, [100, 200]);
});

test('ne retente pas une erreur permanente', async () => {
  let attempts = 0;
  await assert.rejects(
    fetchJsonWithRetry('https://api.example.test/products/999', {
      fetchImpl: async () => {
        attempts += 1;
        return jsonResponse({ code: 'not_found' }, { status: 404 });
      },
      sleep: async () => assert.fail('aucune attente attendue'),
    }),
    (error) => error instanceof HttpError && error.status === 404,
  );
  assert.equal(attempts, 1);
});

test('s’arrête après le nombre maximal de tentatives', async () => {
  let attempts = 0;
  const delays = [];
  await assert.rejects(
    fetchJsonWithRetry('https://api.example.test/products', {
      fetchImpl: async () => {
        attempts += 1;
        throw new TypeError('hors ligne');
      },
      maxAttempts: 3,
      baseDelayMs: 50,
      sleep: async (delay) => delays.push(delay),
    }),
    NetworkError,
  );
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [50, 100]);
});

test('ne transforme ni ne retente une annulation', async () => {
  const abortError = new DOMException('annulée', 'AbortError');
  let attempts = 0;
  await assert.rejects(
    fetchJsonWithRetry('https://api.example.test/products', {
      fetchImpl: async () => {
        attempts += 1;
        throw abortError;
      },
      sleep: async () => assert.fail('aucune attente attendue'),
    }),
    (error) => error === abortError,
  );
  assert.equal(attempts, 1);
});
