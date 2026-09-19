export class HttpError extends Error {
  constructor(status, data = null) {
    super(`La requête a échoué avec le statut ${status}.`);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Récupère une ressource JSON et transforme les erreurs HTTP en exceptions.
 *
 * @param {string | URL} url
 * @param {{fetchImpl?: typeof fetch, signal?: AbortSignal}} options
 * @returns {Promise<unknown>}
 */
export async function fetchJson(
  url,
  { fetchImpl = globalThis.fetch, signal } = {},
) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('Une implémentation de fetch est nécessaire.');
  }

  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  const isJson = mediaType === 'application/json' || mediaType.endsWith('+json');

  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new HttpError(response.status, data);
  }

  if (!isJson) {
    throw new TypeError('La réponse attendue doit être au format JSON.');
  }

  return data;
}
