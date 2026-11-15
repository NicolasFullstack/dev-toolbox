function assertFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} doit être une fonction.`);
  }
}

function anonymousSession() {
  return {
    authenticated: false,
    user: null,
    permissions: [],
  };
}

export function createSessionBootstrap({
  request,
  parseSession,
  setSession,
  isSessionUninitialized,
}) {
  assertFunction(request, 'request');
  assertFunction(parseSession, 'parseSession');
  assertFunction(setSession, 'setSession');
  assertFunction(isSessionUninitialized, 'isSessionUninitialized');

  let activeBootstrap = null;

  return function bootstrapSession() {
    if (activeBootstrap) {
      return activeBootstrap;
    }

    const operation = (async () => {
      let session;

      try {
        const response = await request('session', { method: 'GET' });
        session = parseSession(response);
      } catch (error) {
        if (error?.status !== 401) {
          throw error;
        }

        session = anonymousSession();
      }

      if (isSessionUninitialized()) {
        setSession(session);
      }

      return session;
    })();

    activeBootstrap = operation.finally(() => {
      activeBootstrap = null;
    });

    return activeBootstrap;
  };
}
