import assert from 'node:assert/strict';
import test from 'node:test';

import { createSessionBootstrap } from '../session-bootstrap.js';
import { createSessionRequest } from '../session-request.js';

const parseSession = (value) => {
  if (value?.authenticated === true && Number.isSafeInteger(value.user?.id)) {
    return {
      authenticated: true,
      user: { id: value.user.id, displayName: value.user.displayName.trim() },
      permissions: [...new Set(value.permissions)],
    };
  }
  if (value?.authenticated === false) {
    return { authenticated: false, user: null, permissions: [] };
  }
  throw new TypeError('Réponse de session invalide.');
};

function createBootstrap(overrides = {}) {
  return createSessionBootstrap({
    request: async () => ({ authenticated: false }),
    parseSession,
    setSession: () => {},
    isSessionUninitialized: () => true,
    ...overrides,
  });
}

test('restaure uniquement les champs validés d’une session authentifiée', async () => {
  let stored;
  const bootstrap = createBootstrap({
    request: async () => ({
      authenticated: true,
      user: { id: 42, displayName: '  Ada  ', email: 'ignored@example.test' },
      permissions: ['products:read', 'products:read'],
      accessToken: 'ignored',
    }),
    setSession: (session) => { stored = session; },
  });

  const result = await bootstrap();

  assert.deepEqual(result, {
    authenticated: true,
    user: { id: 42, displayName: 'Ada' },
    permissions: ['products:read'],
  });
  assert.equal(stored, result);
  assert.equal('accessToken' in stored, false);
});

test('normalise une réponse anonyme', async () => {
  let stored;
  const bootstrap = createBootstrap({
    request: async () => ({
      authenticated: false,
      user: { id: 42 },
      permissions: ['users:manage'],
    }),
    setSession: (session) => { stored = session; },
  });

  await bootstrap();
  assert.deepEqual(stored, {
    authenticated: false,
    user: null,
    permissions: [],
  });
});

test('traite un statut 401 comme une session absente', async () => {
  let stored;
  const bootstrap = createBootstrap({
    request: async () => {
      throw Object.assign(new Error('Session absente'), { status: 401 });
    },
    setSession: (session) => { stored = session; },
  });

  const result = await bootstrap();
  assert.equal(result.authenticated, false);
  assert.equal(stored, result);
});

test('transmet le cookie sans lire le jeton CSRF', async () => {
  let captured;
  let csrfReads = 0;
  const sessionRequest = createSessionRequest({
    request: async (endpoint, options) => {
      captured = { endpoint, options };
      return { authenticated: false };
    },
    getCsrfToken: () => {
      csrfReads += 1;
      return 'unused-token';
    },
  });
  const bootstrap = createBootstrap({ request: sessionRequest });

  await bootstrap();

  assert.equal(captured.endpoint, 'session');
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.credentials, 'include');
  assert.equal(captured.options.headers.has('X-CSRF-Token'), false);
  assert.equal(csrfReads, 0);
});

test('partage la même promesse entre plusieurs consommateurs', async () => {
  let resolveRequest;
  let requestCount = 0;
  let storeCount = 0;
  const pending = new Promise((resolve) => { resolveRequest = resolve; });
  const bootstrap = createBootstrap({
    request: async () => {
      requestCount += 1;
      return pending;
    },
    setSession: () => { storeCount += 1; },
  });

  const first = bootstrap();
  const second = bootstrap();
  assert.equal(first, second);
  assert.equal(requestCount, 1);

  resolveRequest({ authenticated: false });
  await Promise.all([first, second]);
  assert.equal(storeCount, 1);
});

test('n’écrase pas une connexion arrivée pendant la lecture', async () => {
  let resolveRequest;
  let currentSession = { status: 'uninitialized' };
  const pending = new Promise((resolve) => { resolveRequest = resolve; });
  const bootstrap = createBootstrap({
    request: async () => pending,
    setSession: (session) => { currentSession = session; },
    isSessionUninitialized: () => currentSession.status === 'uninitialized',
  });

  const loading = bootstrap();
  currentSession = { authenticated: true, user: { id: 7 } };
  resolveRequest({ authenticated: false });

  const result = await loading;
  assert.equal(result.authenticated, false);
  assert.deepEqual(currentSession, { authenticated: true, user: { id: 7 } });
});

test('conserve l’état et autorise une nouvelle tentative après une panne', async () => {
  const networkError = new TypeError('fetch failed');
  let requestCount = 0;
  let storeCount = 0;
  const bootstrap = createBootstrap({
    request: async () => {
      requestCount += 1;
      if (requestCount === 1) throw networkError;
      return { authenticated: false };
    },
    setSession: () => { storeCount += 1; },
  });

  await assert.rejects(bootstrap(), (error) => error === networkError);
  assert.equal(storeCount, 0);

  await bootstrap();
  assert.equal(requestCount, 2);
  assert.equal(storeCount, 1);
});

test('refuse une réponse invalide sans modifier l’état', async () => {
  let storeCount = 0;
  const bootstrap = createBootstrap({
    request: async () => ({ authenticated: 'yes' }),
    setSession: () => { storeCount += 1; },
  });

  await assert.rejects(bootstrap(), /session invalide/);
  assert.equal(storeCount, 0);
});

test('refuse les dépendances invalides', () => {
  const valid = {
    request: async () => ({}),
    parseSession,
    setSession: () => {},
    isSessionUninitialized: () => true,
  };

  for (const dependency of Object.keys(valid)) {
    assert.throws(
      () => createSessionBootstrap({ ...valid, [dependency]: null }),
      new RegExp(`${dependency} doit être une fonction`),
    );
  }
});
