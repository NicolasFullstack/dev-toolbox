import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiDataError } from '../product-api-schema.js';
import { createProductSubmission } from '../submit-product.js';

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
  });

  assert.deepEqual(captured, {
    endpoint: 'products',
    options: {
      method: 'POST',
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

test('n’appelle pas le réseau lorsque le formulaire est invalide', async () => {
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
    submitProduct({ name: 'Produit', price: '10' }),
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
    submitProduct({ name: 'Produit', price: '10' }),
    (error) => error === failure,
  );
});

test('refuse une dépendance request invalide', () => {
  assert.throws(
    () => createProductSubmission({ request: null }),
    /fonction request est nécessaire/,
  );
});
