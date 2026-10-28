import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createConditionalProductUpdater,
  ProductConflictError,
} from '../update-product-with-etag.js';

const PRODUCT = {
  id: 7,
  name: 'Clavier',
  priceCents: 9990,
  active: true,
};

test('envoie un PATCH conditionnel et renvoie la nouvelle version', async () => {
  let captured;
  const updateProduct = createConditionalProductUpdater({
    request: async (endpoint, options) => {
      captured = { endpoint, options };
      return {
        data: { ...PRODUCT, name: options.body.name },
        etag: '"product-7-v4"',
      };
    },
  });

  const result = await updateProduct({
    id: 7,
    changes: { name: '  Clavier maître  ', ownerId: 999 },
    etag: '"product-7-v3"',
  });

  assert.deepEqual(captured, {
    endpoint: 'products/7',
    options: {
      method: 'PATCH',
      headers: { 'If-Match': '"product-7-v3"' },
      body: { name: 'Clavier maître' },
    },
  });
  assert.deepEqual(result, {
    product: { ...PRODUCT, name: 'Clavier maître' },
    etag: '"product-7-v4"',
  });
});

test('convertit un statut 412 en conflit métier explicite', async () => {
  const updateProduct = createConditionalProductUpdater({
    request: async () => {
      throw Object.assign(new Error('Precondition Failed'), { status: 412 });
    },
  });

  await assert.rejects(
    updateProduct({
      id: 7,
      changes: { active: false },
      etag: '"product-7-v3"',
    }),
    ProductConflictError,
  );
});

test('ne masque pas une erreur réseau ou HTTP différente', async () => {
  const networkError = new Error('réseau indisponible');
  const updateProduct = createConditionalProductUpdater({
    request: async () => {
      throw networkError;
    },
  });

  await assert.rejects(
    updateProduct({
      id: 7,
      changes: { active: false },
      etag: '"product-7-v3"',
    }),
    (error) => error === networkError,
  );
});

test('refuse un ETag faible, absent ou mal formé avant le réseau', async () => {
  let requestCalls = 0;
  const updateProduct = createConditionalProductUpdater({
    request: async () => {
      requestCalls += 1;
    },
  });

  for (const etag of [undefined, 'product-7-v3', 'W/"product-7-v3"', '""']) {
    await assert.rejects(
      updateProduct({ id: 7, changes: { active: false }, etag }),
      /ETag fort/,
    );
  }

  assert.equal(requestCalls, 0);
});

test('valide chaque champ autorisé avant le réseau', async () => {
  let requestCalls = 0;
  const updateProduct = createConditionalProductUpdater({
    request: async () => {
      requestCalls += 1;
    },
  });

  for (const changes of [
    {},
    { ownerId: 4 },
    { name: 'x' },
    { priceCents: 1.5 },
    { active: 'false' },
  ]) {
    await assert.rejects(
      updateProduct({ id: 7, changes, etag: '"product-7-v3"' }),
      TypeError,
    );
  }

  assert.equal(requestCalls, 0);
});

test('refuse un identifiant invalide avant le réseau', async () => {
  let requestCalls = 0;
  const updateProduct = createConditionalProductUpdater({
    request: async () => {
      requestCalls += 1;
    },
  });

  for (const id of [0, -1, 1.5, '7']) {
    await assert.rejects(
      updateProduct({ id, changes: { active: false }, etag: '"product-7-v3"' }),
      /identifiant/,
    );
  }

  assert.equal(requestCalls, 0);
});

test('valide le produit et le nouvel ETag renvoyés par l’API', async () => {
  const invalidResponses = [
    { data: { ...PRODUCT, priceCents: '9990' }, etag: '"product-7-v4"' },
    { data: PRODUCT, etag: 'W/"product-7-v4"' },
    null,
  ];

  for (const response of invalidResponses) {
    const updateProduct = createConditionalProductUpdater({
      request: async () => response,
    });

    await assert.rejects(
      updateProduct({
        id: 7,
        changes: { active: false },
        etag: '"product-7-v3"',
      }),
      TypeError,
    );
  }
});
