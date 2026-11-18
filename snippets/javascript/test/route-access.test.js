import assert from 'node:assert/strict';
import test from 'node:test';

import { PERMISSIONS } from '../authorization-ui.js';
import { decideRouteAccess, ROUTE_ACCESS } from '../route-access.js';

const session = {
  authenticated: true,
  user: { id: 12 },
  permissions: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE_OWN,
  ],
};

test('attend la fin de la restauration avant de décider', () => {
  assert.equal(
    decideRouteAccess({ session: { status: 'uninitialized' } }),
    ROUTE_ACCESS.WAIT,
  );
  assert.equal(
    decideRouteAccess({ session: { status: 'loading' } }),
    ROUTE_ACCESS.WAIT,
  );
});

test('distingue une erreur temporaire d’une session anonyme', () => {
  assert.equal(
    decideRouteAccess({ session: { status: 'error' } }),
    ROUTE_ACCESS.RETRY,
  );
  assert.equal(
    decideRouteAccess({ session: { authenticated: false } }),
    ROUTE_ACCESS.SIGN_IN,
  );
});

test('affiche une route authentifiée sans permission supplémentaire', () => {
  assert.equal(decideRouteAccess({ session }), ROUTE_ACCESS.SHOW);
});

test('exige toutes les permissions par défaut', () => {
  assert.equal(decideRouteAccess({
    session,
    requiredPermissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_WRITE_OWN,
    ],
  }), ROUTE_ACCESS.SHOW);

  assert.equal(decideRouteAccess({
    session,
    requiredPermissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_DELETE_ANY,
    ],
  }), ROUTE_ACCESS.FORBIDDEN);
});

test('peut accepter au moins une permission', () => {
  assert.equal(decideRouteAccess({
    session,
    requiredPermissions: [
      PERMISSIONS.PRODUCTS_DELETE_ANY,
      PERMISSIONS.PRODUCTS_READ,
    ],
    mode: 'any',
  }), ROUTE_ACCESS.SHOW);
});

test('refuse les permissions, modes et sessions internes invalides', () => {
  assert.throws(
    () => decideRouteAccess({ session, requiredPermissions: ['admin'] }),
    /Permission requise inconnue/,
  );
  assert.throws(
    () => decideRouteAccess({ session, mode: 'some' }),
    /mode doit être/,
  );
  assert.throws(
    () => decideRouteAccess({ session: { authenticated: true, permissions: [] } }),
    /session invalide/,
  );
});
