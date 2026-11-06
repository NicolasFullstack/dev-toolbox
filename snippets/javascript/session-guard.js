function assertFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} doit être une fonction.`);
  }
}

export function createSessionGuard({ request, onSessionExpired }) {
  assertFunction(request, 'request');
  assertFunction(onSessionExpired, 'onSessionExpired');

  let expirationNotified = false;

  async function guardedRequest(endpoint, options) {
    try {
      return await request(endpoint, options);
    } catch (error) {
      if (error?.status === 401 && !expirationNotified) {
        expirationNotified = true;
        onSessionExpired();
      }

      throw error;
    }
  }

  guardedRequest.reset = () => {
    expirationNotified = false;
  };

  return guardedRequest;
}
