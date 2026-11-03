const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MAX_CSRF_TOKEN_LENGTH = 512;
const VISIBLE_ASCII_PATTERN = /^[\x21-\x7E]+$/;

function normalizeMethod(method = 'GET') {
  if (typeof method !== 'string' || method.trim() === '') {
    throw new TypeError('La méthode HTTP doit être une chaîne non vide.');
  }

  return method.trim().toUpperCase();
}

function normalizeCsrfToken(token) {
  if (typeof token !== 'string') {
    throw new TypeError('Un jeton CSRF est requis pour modifier des données.');
  }

  const normalized = token.trim();
  if (normalized === '') {
    throw new TypeError('Un jeton CSRF est requis pour modifier des données.');
  }
  if (
    normalized.length > MAX_CSRF_TOKEN_LENGTH
    || !VISIBLE_ASCII_PATTERN.test(normalized)
  ) {
    throw new TypeError('Le jeton CSRF doit contenir entre 1 et 512 caractères ASCII visibles.');
  }

  return normalized;
}

export function createSessionRequest({ request, getCsrfToken }) {
  if (typeof request !== 'function' || typeof getCsrfToken !== 'function') {
    throw new TypeError('request et getCsrfToken doivent être des fonctions.');
  }

  return async function requestWithSession(endpoint, options = {}) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('Les options de requête doivent être un objet.');
    }

    const method = normalizeMethod(options.method);
    const headers = new Headers(options.headers);

    if (SAFE_METHODS.has(method)) {
      headers.delete('X-CSRF-Token');
    } else {
      headers.set('X-CSRF-Token', normalizeCsrfToken(await getCsrfToken()));
    }

    return request(endpoint, {
      ...options,
      method,
      credentials: 'include',
      headers,
    });
  };
}
