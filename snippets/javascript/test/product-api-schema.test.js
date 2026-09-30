import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ApiDataError,
  parseProductList,
} from '../product-api-schema.js';

const validProduct = {
  id: 1,
  name: 'Clavier',
  priceCents: 9990,
  active: true,
};

test('normalise un produit sans modifier la réponse d’origine', () => {
  const source = [{
    ...validProduct,
    name: '  Clavier  ',
    internalNote: 'ne doit pas sortir de la frontière API',
  }];

  assert.deepEqual(parseProductList(source), [validProduct]);
  assert.equal(source[0].name, '  Clavier  ');
  assert.equal(source[0].internalNote, 'ne doit pas sortir de la frontière API');
});

test('refuse une réponse qui n’est pas un tableau', () => {
  assert.throws(
    () => parseProductList({ products: [] }),
    (error) => (
      error instanceof ApiDataError
      && error.index === null
      && /tableau de produits/.test(error.message)
    ),
  );
});

test('refuse une entrée qui n’est pas un objet', () => {
  assert.throws(
    () => parseProductList([null]),
    (error) => error instanceof ApiDataError && error.index === 0,
  );
});

test('refuse les identifiants invalides', () => {
  for (const id of [0, -1, 1.5, '1']) {
    assert.throws(
      () => parseProductList([{ ...validProduct, id }]),
      /id doit être un entier strictement positif/,
    );
  }
});

test('refuse les noms vides ou trop longs après normalisation', () => {
  for (const name of [' ', 'a', 'a'.repeat(121)]) {
    assert.throws(
      () => parseProductList([{ ...validProduct, name }]),
      /entre 2 et 120 caractères/,
    );
  }
});

test('refuse un prix ou un indicateur d’activité du mauvais type', () => {
  assert.throws(
    () => parseProductList([{ ...validProduct, priceCents: '9990' }]),
    /priceCents doit être un entier positif ou nul/,
  );
  assert.throws(
    () => parseProductList([{ ...validProduct, active: 1 }]),
    /active doit être un booléen/,
  );
});
