import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canUseProductAction,
  PERMISSIONS,
} from '../authorization-ui.js';

function createSession(permissions, userId = 7) {
  return {
    authenticated: true,
    user: { id: userId },
    permissions,
  };
}

test('refuse toute action à une session anonyme', () => {
  const session = { authenticated: false };

  assert.equal(canUseProductAction(session, 'read', { ownerId: 7 }), false);
  assert.equal(canUseProductAction(session, 'edit', { ownerId: 7 }), false);
  assert.equal(canUseProductAction(session, 'delete', { ownerId: 7 }), false);
});

test('autorise la lecture uniquement avec la permission attendue', () => {
  assert.equal(canUseProductAction(
    createSession([PERMISSIONS.PRODUCTS_READ]),
    'read',
    { ownerId: 12 },
  ), true);

  assert.equal(canUseProductAction(createSession([]), 'read', { ownerId: 12 }), false);
});

test('autorise la modification de sa ressource avec une permission limitée', () => {
  assert.equal(canUseProductAction(
    createSession([PERMISSIONS.PRODUCTS_WRITE_OWN], 7),
    'edit',
    { ownerId: 7 },
  ), true);
});

test('refuse la modification de la ressource d’un autre propriétaire', () => {
  assert.equal(canUseProductAction(
    createSession([PERMISSIONS.PRODUCTS_WRITE_OWN], 7),
    'edit',
    { ownerId: 8 },
  ), false);
});

test('autorise une modification globale sans dépendre du propriétaire', () => {
  assert.equal(canUseProductAction(
    createSession([PERMISSIONS.PRODUCTS_WRITE_ANY], 7),
    'edit',
    { ownerId: 8 },
  ), true);
});

test('réserve la suppression à la permission globale', () => {
  assert.equal(canUseProductAction(
    createSession([PERMISSIONS.PRODUCTS_DELETE_ANY]),
    'delete',
    { ownerId: 99 },
  ), true);

  assert.equal(canUseProductAction(
    createSession([PERMISSIONS.PRODUCTS_WRITE_ANY]),
    'delete',
    { ownerId: 7 },
  ), false);
});

test('échoue de façon restrictive pour des données ou une action invalides', () => {
  assert.equal(canUseProductAction(
    createSession([PERMISSIONS.PRODUCTS_WRITE_OWN], 7),
    'edit',
    {},
  ), false);

  assert.throws(
    () => canUseProductAction(createSession([]), 'publish', { ownerId: 7 }),
    TypeError,
  );
});

