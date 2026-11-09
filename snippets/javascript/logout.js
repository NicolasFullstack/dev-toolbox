function assertFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} doit être une fonction.`);
  }
}

export function createLogout({ request, clearSession }) {
  assertFunction(request, 'request');
  assertFunction(clearSession, 'clearSession');

  let activeLogout = null;

  return async function logout() {
    if (activeLogout) {
      return activeLogout;
    }

    activeLogout = (async () => {
      try {
        await request('session', { method: 'DELETE' });
      } catch (error) {
        if (error?.status !== 401) {
          throw error;
        }
      }

      clearSession();
    })();

    try {
      return await activeLogout;
    } finally {
      activeLogout = null;
    }
  };
}
