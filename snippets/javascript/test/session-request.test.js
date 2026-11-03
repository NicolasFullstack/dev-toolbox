import assert from 'node:assert/strict';
import test from 'node:test';

import { createSessionRequest } from '../session-request.js';

test('inclut la session sans envoyer de jeton CSRF pendant une lecture', async () => {
  let captured;
  let csrfReads = 0;
  const sessionRequest = createSessionRequest({
    request: async (endpoint, options) => {
      captured = { endpoint, options };
      return { authenticated: true };
    },
    getCsrfToken: () => {
      csrfReads += 1;
      return 'trusted-token';
    },
  });

  const result = await sessionRequest('session', {
    headers: {
      'X-CSRF-Token': 'caller-token',
      'X-Request-Id': 'request-1',
    },
  });

  assert.deepEqual(result, { authenticated: true });
  assert.equal(csrfReads, 0);
  assert.equal(captured.endpoint, 'session');
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.credentials, 'include');
  assert.equal(captured.options.headers.has('X-CSRF-Token'), false);
  assert.equal(captured.options.headers.get('X-Request-Id'), 'request-1');
});

test('ajoute le jeton approuvé à une mutation', async () => {
  let captured;
  const sessionRequest = createSessionRequest({
    request: async (_endpoint, options) => {
      captured = options;
    },
    getCsrfToken: async () => '  trusted-token  ',
  });

  await sessionRequest('products', {
    method: 'post',
    headers: { 'X-CSRF-Token': 'caller-token' },
    body: { name: 'Clavier' },
  });

  assert.equal(captured.method, 'POST');
  assert.equal(captured.credentials, 'include');
  assert.equal(captured.headers.get('X-CSRF-Token'), 'trusted-token');
  assert.deepEqual(captured.body, { name: 'Clavier' });
});

test('protège toutes les méthodes non sûres', async () => {
  const methods = [];
  const sessionRequest = createSessionRequest({
    request: async (_endpoint, options) => methods.push(options.method),
    getCsrfToken: () => 'trusted-token',
  });

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await sessionRequest('resource', { method });
  }

  assert.deepEqual(methods, ['POST', 'PUT', 'PATCH', 'DELETE']);
});

test('refuse un jeton vide, mal formé ou trop long avant le réseau', async () => {
  let requestCalls = 0;

  for (const token of ['', 'token non valide', 'a'.repeat(513)]) {
    const sessionRequest = createSessionRequest({
      request: async () => {
        requestCalls += 1;
      },
      getCsrfToken: () => token,
    });

    await assert.rejects(
      sessionRequest('products', { method: 'POST' }),
      /jeton CSRF/i,
    );
  }

  assert.equal(requestCalls, 0);
});

test('impose les cookies même si l’appelant demande de les omettre', async () => {
  let credentials;
  const sessionRequest = createSessionRequest({
    request: async (_endpoint, options) => {
      credentials = options.credentials;
    },
    getCsrfToken: () => 'trusted-token',
  });

  await sessionRequest('session', { credentials: 'omit' });
  assert.equal(credentials, 'include');
});

test('refuse des dépendances, options ou méthodes invalides', async () => {
  assert.throws(
    () => createSessionRequest({ request: null, getCsrfToken: () => 'token' }),
    /doivent être des fonctions/,
  );

  const sessionRequest = createSessionRequest({
    request: async () => null,
    getCsrfToken: () => 'trusted-token',
  });

  await assert.rejects(sessionRequest('products', null), /options de requête/);
  await assert.rejects(
    sessionRequest('products', { method: ' ' }),
    /méthode HTTP/,
  );
});
