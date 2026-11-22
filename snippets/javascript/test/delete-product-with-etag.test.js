import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createConditionalProductDeleter,
  ProductDeletionConflictError,
} from '../delete-product-with-etag.js';

test('envoie un DELETE conditionnel et confirme l’identifiant supprimé', async () => {
  let captured;
  const deleteProduct = createConditionalProductDeleter({
    request: async (endpoint, options) => {
      captured = { endpoint, options };
      return { status: 204, data: null };
    },
  });

  const result = await deleteProduct({ id: 7, etag: '"product-7-v3"' });

  assert.deepEqual(captured, {
    endpoint: 'products/7',
    options: {
      method: 'DELETE',
      headers: { 'If-Match': '"product-7-v3"' },
      includeResponseMetadata: true,
    },
  });
  assert.deepEqual(result, { id: 7 });
});

test('convertit un statut 412 en conflit de suppression', async () => {
  const deleteProduct = createConditionalProductDeleter({
    request: async () => {
      throw Object.assign(new Error('Precondition Failed'), { status: 412 });
    },
  });

  await assert.rejects(
    deleteProduct({ id: 7, etag: '"product-7-v3"' }),
    ProductDeletionConflictError,
  );
});

test('ne masque pas une autre erreur HTTP ou réseau', async () => {
  const expected = Object.assign(new Error('Forbidden'), { status: 403 });
  const deleteProduct = createConditionalProductDeleter({
    request: async () => { throw expected; },
  });

  await assert.rejects(
    deleteProduct({ id: 7, etag: '"product-7-v3"' }),
    (error) => error === expected,
  );
});

test('refuse un identifiant ou un ETag invalide avant le réseau', async () => {
  let requestCalls = 0;
  const deleteProduct = createConditionalProductDeleter({
    request: async () => { requestCalls += 1; },
  });

  for (const input of [
    { id: 0, etag: '"product-7-v3"' },
    { id: '7', etag: '"product-7-v3"' },
    { id: 7, etag: 'product-7-v3' },
    { id: 7, etag: 'W/"product-7-v3"' },
  ]) {
    await assert.rejects(deleteProduct(input), TypeError);
  }

  assert.equal(requestCalls, 0);
});

test('exige une réponse 204 réellement vide', async () => {
  for (const response of [
    { status: 200, data: { deleted: true } },
    { status: 204, data: { deleted: true } },
    null,
  ]) {
    const deleteProduct = createConditionalProductDeleter({
      request: async () => response,
    });

    await assert.rejects(
      deleteProduct({ id: 7, etag: '"product-7-v3"' }),
      /réponse 204 vide/,
    );
  }
});

test('refuse une dépendance request invalide', () => {
  assert.throws(
    () => createConditionalProductDeleter({ request: null }),
    /fonction request/,
  );
});
