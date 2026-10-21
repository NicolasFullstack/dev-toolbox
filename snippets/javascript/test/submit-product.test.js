import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiDataError } from '../product-api-schema.js';
import { createProductSubmission } from '../submit-product.js';

const IDEMPOTENCY_KEY = '018f47e2-81a6-7f21-b74c-2f9b0ca42ad5';

test('valide, envoie et normalise le produit créé', async () => {
  let captured;
  const submitProduct = createProductSubmission({
    request: async (endpoint, options) => {
      captured = { endpoint, options };
      return {
        id: 7,
        name: '  Clavier  ',
        priceCents: 9999,
        active: true,
        internalCost: 3000,
      };
    },
  });

  const result = await submitProduct({
    name: '  Clavier  ',
    price: '99.99',
    active: true,
  }, { idempotencyKey: IDEMPOTENCY_KEY });

  assert.deepEqual(captured, {
    endpoint: 'products',
    options: {
      method: 'POST',
      headers: { 'Idempotency-Key': IDEMPOTENCY_KEY },
      body: { name: 'Clavier', priceCents: 9999 },
    },
  });
  assert.deepEqual(result, {
    ok: true,
    product: {
      id: 7,
      name: 'Clavier',
      priceCents: 9999,
      active: true,
    },
  });
});

test('n’exige pas de clé et n’appelle pas le réseau si le formulaire est invalide', async () => {
  let requestCalls = 0;
  const submitProduct = createProductSubmission({
    request: async () => {
      requestCalls += 1;
    },
  });

  const result = await submitProduct({ name: 'A', price: '10.999' });

  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors), ['name', 'price']);
  assert.equal(requestCalls, 0);
});

test('refuse une clé absente, trop longue ou contenant des espaces', async () => {
  let requestCalls = 0;
  const submitProduct = createProductSubmission({
    request: async () => {
      requestCalls += 1;
    },
  });

  for (const idempotencyKey of [
    undefined,
    'trop-court',
    'a'.repeat(129),
    'clé avec espace',
  ]) {
    await assert.rejects(
      submitProduct(
        { name: 'Produit', price: '10' },
        { idempotencyKey },
      ),
      /clé d’idempotence/,
    );
  }

  assert.equal(requestCalls, 0);
});

test('réutilise la même clé uniquement pour reprendre la même opération', async () => {
  const keys = [];
  const submitProduct = createProductSubmission({
    request: async (_endpoint, options) => {
      keys.push(options.headers['Idempotency-Key']);
      return {
        id: keys.length,
        active: true,
        ...options.body,
      };
    },
  });
  const input = { name: 'Produit', price: '10' };

  await submitProduct(input, { idempotencyKey: IDEMPOTENCY_KEY });
  await submitProduct(input, { idempotencyKey: IDEMPOTENCY_KEY });

  assert.deepEqual(keys, [IDEMPOTENCY_KEY, IDEMPOTENCY_KEY]);
  assert.deepEqual(input, { name: 'Produit', price: '10' });
});

test('refuse une réponse API invalide après la création', async () => {
  const submitProduct = createProductSubmission({
    request: async () => ({
      id: 8,
      name: 'Produit',
      priceCents: '1000',
      active: true,
    }),
  });

  await assert.rejects(
    submitProduct(
      { name: 'Produit', price: '10' },
      { idempotencyKey: IDEMPOTENCY_KEY },
    ),
    ApiDataError,
  );
});

test('laisse remonter l’erreur technique de la requête', async () => {
  const failure = new Error('service indisponible');
  const submitProduct = createProductSubmission({
    request: async () => {
      throw failure;
    },
  });

  await assert.rejects(
    submitProduct(
      { name: 'Produit', price: '10' },
      { idempotencyKey: IDEMPOTENCY_KEY },
    ),
    (error) => error === failure,
  );
});

test('refuse une dépendance request invalide', () => {
  assert.throws(
    () => createProductSubmission({ request: null }),
    /fonction request est nécessaire/,
  );
});
