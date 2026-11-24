import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialProductsState,
  productsReducer,
} from '../products-reducer.js';

test('crée l’état initial attendu', () => {
  assert.deepEqual(createInitialProductsState(), {
    status: 'idle',
    products: [],
    error: null,
    requestId: null,
  });
});

test('passe au chargement sans modifier l’état reçu', () => {
  const state = createInitialProductsState();
  const nextState = productsReducer(state, {
    type: 'loadStarted',
    requestId: 'request-1',
  });

  assert.equal(nextState.status, 'loading');
  assert.equal(nextState.requestId, 'request-1');
  assert.equal(state.status, 'idle');
});

test('accepte uniquement la réponse du chargement courant', () => {
  const loadingState = {
    status: 'loading',
    products: [],
    error: null,
    requestId: 'request-2',
  };
  const staleState = productsReducer(loadingState, {
    type: 'loadSucceeded',
    requestId: 'request-1',
    products: [{ id: 1, name: 'Ancien résultat' }],
  });
  const products = [{ id: 2, name: 'Résultat récent' }];
  const successState = productsReducer(loadingState, {
    type: 'loadSucceeded',
    requestId: 'request-2',
    products,
  });

  assert.equal(staleState, loadingState);
  assert.deepEqual(successState.products, products);
  assert.notEqual(successState.products, products);
  assert.equal(successState.status, 'success');
});

test('utilise un message maîtrisé en cas d’échec', () => {
  const loadingState = {
    status: 'loading',
    products: [],
    error: null,
    requestId: 'request-1',
  };
  const nextState = productsReducer(loadingState, {
    type: 'loadFailed',
    requestId: 'request-1',
    technicalError: new Error('Détail interne sensible'),
  });

  assert.equal(nextState.status, 'error');
  assert.equal(nextState.error, 'Le chargement a échoué.');
  assert.equal(nextState.error.includes('sensible'), false);
});

test('retire un produit sans modifier le tableau reçu', () => {
  const remainingProduct = { id: 2, name: 'Souris' };
  const state = {
    status: 'success',
    products: [{ id: 1, name: 'Clavier' }, remainingProduct],
    error: null,
    requestId: null,
  };

  const nextState = productsReducer(state, {
    type: 'productDeleted',
    id: 1,
  });

  assert.deepEqual(nextState.products, [remainingProduct]);
  assert.notEqual(nextState.products, state.products);
  assert.equal(nextState.products[0], remainingProduct);
  assert.equal(state.products.length, 2);
});

test('conserve le même état si le produit est déjà absent', () => {
  const state = {
    status: 'success',
    products: [{ id: 2, name: 'Souris' }],
    error: null,
    requestId: null,
  };

  const nextState = productsReducer(state, {
    type: 'productDeleted',
    id: 1,
  });

  assert.equal(nextState, state);
});

test('ignore un chargement commencé avant la suppression', () => {
  const loadingState = {
    status: 'loading',
    products: [{ id: 1, name: 'Clavier' }],
    error: null,
    requestId: 'request-before-deletion',
  };

  const deletedState = productsReducer(loadingState, {
    type: 'productDeleted',
    id: 1,
  });
  const lateState = productsReducer(deletedState, {
    type: 'loadSucceeded',
    requestId: 'request-before-deletion',
    products: [{ id: 1, name: 'Ancienne copie' }],
  });

  assert.equal(deletedState.requestId, null);
  assert.deepEqual(deletedState.products, []);
  assert.equal(lateState, deletedState);
});

test('refuse un identifiant de suppression invalide', () => {
  const state = createInitialProductsState();

  for (const id of [0, -1, 1.5, '1']) {
    assert.throws(
      () => productsReducer(state, { type: 'productDeleted', id }),
      /identifiant/,
    );
  }
});

