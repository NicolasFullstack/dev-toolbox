export class HttpError extends Error {
  constructor(status, data = null, { retryAfter = null } = {}) {
    super(`La requête a échoué avec le statut ${status}.`);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends Error {
  constructor(cause) {
    super('La requête réseau a échoué.', { cause });
    this.name = 'NetworkError';
  }
}

export async function fetchJson(
  url,
  { fetchImpl = globalThis.fetch, signal } = {},
) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('Une implémentation de fetch est nécessaire.');
  }

  let response;

  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new NetworkError(error);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  const isJson = mediaType === 'application/json' || mediaType.endsWith('+json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new HttpError(response.status, data, {
      retryAfter: response.headers.get('retry-after'),
    });
  }

  if (!isJson) {
    throw new TypeError('La réponse attendue doit être au format JSON.');
  }

  return data;
}
