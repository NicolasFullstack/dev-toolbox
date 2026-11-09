import assert from 'node:assert/strict';
import test from 'node:test';

import { createLogout } from '../logout.js';
import { createSessionRequest } from '../session-request.js';

test('révoque la session puis efface l’état local', async () => {
  const calls = [];
  let clearCount = 0;
  const logout = createLogout({
    request: async (...args) => calls.push(args),
    clearSession: () => { clearCount += 1; },
  });

  await logout();

  assert.deepEqual(calls, [['session', { method: 'DELETE' }]]);
  assert.equal(clearCount, 1);
});

test('considère une réponse 401 comme une session déjà révoquée', async () => {
  let clearCount = 0;
  const logout = createLogout({
    request: async () => {
      throw Object.assign(new Error('Session absente'), { status: 401 });
    },
    clearSession: () => { clearCount += 1; },
  });

  await logout();
  assert.equal(clearCount, 1);
});

test('transmet le cookie et le jeton CSRF jusqu’à la révocation', async () => {
  let captured;
  const sessionRequest = createSessionRequest({
    request: async (endpoint, options) => { captured = { endpoint, options }; },
    getCsrfToken: async () => 'logout-csrf-token',
  });
  const logout = createLogout({
    request: sessionRequest,
    clearSession: () => {},
  });

  await logout();

  assert.equal(captured.endpoint, 'session');
  assert.equal(captured.options.method, 'DELETE');
  assert.equal(captured.options.credentials, 'include');
  assert.equal(captured.options.headers.get('X-CSRF-Token'), 'logout-csrf-token');
});

test('conserve l’état local si la révocation échoue sur le réseau', async () => {
  const networkError = new TypeError('fetch failed');
  let clearCount = 0;
  const logout = createLogout({
    request: async () => { throw networkError; },
    clearSession: () => { clearCount += 1; },
  });

  await assert.rejects(logout(), (error) => error === networkError);
  assert.equal(clearCount, 0);
});

test('ne transforme pas un refus 403 en déconnexion réussie', async () => {
  const forbidden = Object.assign(new Error('Interdit'), { status: 403 });
  let clearCount = 0;
  const logout = createLogout({
    request: async () => { throw forbidden; },
    clearSession: () => { clearCount += 1; },
  });

  await assert.rejects(logout(), (error) => error === forbidden);
  assert.equal(clearCount, 0);
});

test('partage une déconnexion en cours entre plusieurs déclencheurs', async () => {
  let resolveRequest;
  let requestCount = 0;
  let clearCount = 0;
  const pendingRequest = new Promise((resolve) => { resolveRequest = resolve; });
  const logout = createLogout({
    request: async () => {
      requestCount += 1;
      return pendingRequest;
    },
    clearSession: () => { clearCount += 1; },
  });

  const first = logout();
  const second = logout();
  assert.equal(requestCount, 1);

  resolveRequest();
  await Promise.all([first, second]);
  assert.equal(clearCount, 1);
});

test('autorise une nouvelle tentative après un échec', async () => {
  let requestCount = 0;
  const logout = createLogout({
    request: async () => {
      requestCount += 1;
      if (requestCount === 1) throw new TypeError('fetch failed');
    },
    clearSession: () => {},
  });

  await assert.rejects(logout(), TypeError);
  await logout();
  assert.equal(requestCount, 2);
});

test('refuse les dépendances invalides', () => {
  assert.throws(
    () => createLogout({ request: null, clearSession: () => {} }),
    /request doit être une fonction/,
  );
  assert.throws(
    () => createLogout({ request: async () => {}, clearSession: null }),
    /clearSession doit être une fonction/,
  );
});
