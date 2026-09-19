import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchJson, HttpError } from '../fetch-json.js';

test('renvoie les données d’une réponse JSON réussie', async () => {
  const result = await fetchJson('https://api.example.test/products', {
    fetchImpl: async () => new Response(JSON.stringify([{ id: 1 }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  });

  assert.deepEqual(result, [{ id: 1 }]);
});

test('transforme un statut 404 en HttpError', async () => {
  await assert.rejects(
    fetchJson('https://api.example.test/products/999', {
      fetchImpl: async () => new Response(JSON.stringify({ code: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 404);
      assert.deepEqual(error.data, { code: 'not_found' });
      return true;
    },
  );
});

test('renvoie null pour une réponse 204', async () => {
  const result = await fetchJson('https://api.example.test/session', {
    fetchImpl: async () => new Response(null, { status: 204 }),
  });

  assert.equal(result, null);
});

test('refuse une réponse réussie qui n’est pas en JSON', async () => {
  await assert.rejects(
    fetchJson('https://api.example.test/products', {
      fetchImpl: async () => new Response('<html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    }),
    /doit être au format JSON/,
  );
});

test('transmet le signal d’annulation à fetch', async () => {
  const controller = new AbortController();
  let receivedSignal;

  await fetchJson('https://api.example.test/products', {
    signal: controller.signal,
    fetchImpl: async (_url, options) => {
      receivedSignal = options.signal;
      return new Response(null, { status: 204 });
    },
  });

  assert.equal(receivedSignal, controller.signal);
});
