const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export class LoginInProgressError extends Error {
  constructor() {
    super('Une connexion est déjà en cours.');
    this.name = 'LoginInProgressError';
  }
}

function assertFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} doit être une fonction.`);
  }
}

export function buildLoginPayload({ email, password } = {}) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new TypeError('L’adresse et le mot de passe doivent être des chaînes.');
  }

  const normalizedEmail = email.trim();
  if (
    normalizedEmail.length === 0
    || normalizedEmail.length > MAX_EMAIL_LENGTH
    || !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    throw new TypeError('L’adresse électronique est invalide.');
  }
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    throw new TypeError('Le mot de passe doit contenir entre 1 et 1024 caractères.');
  }

  return { email: normalizedEmail, password };
}

export function createLogin({ request, parseSession, setSession }) {
  assertFunction(request, 'request');
  assertFunction(parseSession, 'parseSession');
  assertFunction(setSession, 'setSession');

  let loginInProgress = false;

  return async function login(credentials) {
    if (loginInProgress) {
      throw new LoginInProgressError();
    }

    const payload = buildLoginPayload(credentials);
    loginInProgress = true;

    try {
      const response = await request('session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const session = parseSession(response);

      if (session?.authenticated !== true) {
        throw new TypeError('La réponse de connexion ne contient pas de session authentifiée.');
      }

      setSession(session);
      return session;
    } finally {
      loginInProgress = false;
    }
  };
}
