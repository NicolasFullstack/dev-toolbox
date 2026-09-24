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

