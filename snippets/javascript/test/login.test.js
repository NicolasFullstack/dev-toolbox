import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLoginPayload,
  createLogin,
  LoginInProgressError,
} from '../login.js';
import { createSessionRequest } from '../session-request.js';

test('normalise l’adresse sans modifier le mot de passe', () => {
  assert.deepEqual(
    buildLoginPayload({ email: '  ada@example.test ', password: ' secret ' }),
    { email: 'ada@example.test', password: ' secret ' },
  );
});

test('refuse des identifiants invalides avant le réseau', async () => {
  let requestCount = 0;
  const login = createLogin({
    request: async () => { requestCount += 1; },
    parseSession: (value) => value,
    setSession: () => {},
  });

  for (const credentials of [
    { email: 'invalide', password: 'secret' },
    { email: 'ada@example.test', password: '' },
    { email: `${'a'.repeat(243)}@example.test`, password: 'secret' },
    { email: 'ada@example.test', password: 'x'.repeat(1025) },
  ]) {
    await assert.rejects(login(credentials), TypeError);
  }

  assert.equal(requestCount, 0);
});

test('envoie la connexion puis mémorise uniquement la session validée', async () => {
  let captured;
  let stored;
  const trustedSession = {
    authenticated: true,
    user: { id: 42, displayName: 'Ada' },
    permissions: ['products:read'],
  };
  const login = createLogin({
    request: async (endpoint, options) => {
      captured = { endpoint, options };
      return { ...trustedSession, ignored: 'retiré par le parseur' };
    },
    parseSession: () => trustedSession,
    setSession: (session) => { stored = session; },
  });

  const result = await login({ email: 'ada@example.test', password: 'secret' });

  assert.equal(captured.endpoint, 'session');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(captured.options.body), {
    email: 'ada@example.test',
    password: 'secret',
  });
  assert.equal(stored, trustedSession);
  assert.equal(result, trustedSession);
});

test('transmet le cookie et le jeton CSRF de pré-authentification', async () => {
  let captured;
  const sessionRequest = createSessionRequest({
    request: async (endpoint, options) => {
      captured = { endpoint, options };
      return { authenticated: true };
    },
    getCsrfToken: () => 'pre-auth-csrf-token',
  });
  const login = createLogin({
    request: sessionRequest,
    parseSession: (value) => value,
    setSession: () => {},
  });

  await login({ email: 'ada@example.test', password: 'secret' });

  assert.equal(captured.options.credentials, 'include');
  assert.equal(captured.options.headers.get('Content-Type'), 'application/json');
  assert.equal(captured.options.headers.get('X-CSRF-Token'), 'pre-auth-csrf-token');
});

test('ne mémorise pas une session anonyme ou mal formée', async () => {
  let storeCount = 0;
  const login = createLogin({
    request: async () => ({ authenticated: false }),
    parseSession: (value) => value,
    setSession: () => { storeCount += 1; },
  });

  await assert.rejects(
    login({ email: 'ada@example.test', password: 'secret' }),
    /session authentifiée/,
  );
  assert.equal(storeCount, 0);
});

test('propage une erreur HTTP sans mémoriser les identifiants', async () => {
  const unauthorized = Object.assign(new Error('Identifiants invalides'), { status: 401 });
  let storeCount = 0;
  const login = createLogin({
    request: async () => { throw unauthorized; },
    parseSession: (value) => value,
    setSession: () => { storeCount += 1; },
  });

  await assert.rejects(
    login({ email: 'ada@example.test', password: 'secret' }),
    (error) => error === unauthorized,
  );
  assert.equal(storeCount, 0);
});

test('refuse une seconde connexion pendant la première', async () => {
  let resolveRequest;
  const pending = new Promise((resolve) => { resolveRequest = resolve; });
  const login = createLogin({
    request: async () => pending,
    parseSession: (value) => value,
    setSession: () => {},
  });

  const first = login({ email: 'ada@example.test', password: 'secret' });
  await assert.rejects(
    login({ email: 'grace@example.test', password: 'autre-secret' }),
    LoginInProgressError,
  );

  resolveRequest({ authenticated: true });
  await first;
});

test('autorise une nouvelle tentative après un échec', async () => {
  let requestCount = 0;
  const login = createLogin({
    request: async () => {
      requestCount += 1;
      if (requestCount === 1) throw new TypeError('fetch failed');
      return { authenticated: true };
    },
    parseSession: (value) => value,
    setSession: () => {},
  });

  await assert.rejects(login({ email: 'ada@example.test', password: 'secret' }));
  await login({ email: 'ada@example.test', password: 'secret' });
  assert.equal(requestCount, 2);
});

test('refuse les dépendances invalides', () => {
  assert.throws(
    () => createLogin({ request: null, parseSession: () => {}, setSession: () => {} }),
    /request doit être une fonction/,
  );
  assert.throws(
    () => createLogin({ request: async () => {}, parseSession: null, setSession: () => {} }),
    /parseSession doit être une fonction/,
  );
  assert.throws(
    () => createLogin({ request: async () => {}, parseSession: () => {}, setSession: null }),
    /setSession doit être une fonction/,
  );
});
