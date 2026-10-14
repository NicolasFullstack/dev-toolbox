import { fetchJson, HttpError, NetworkError } from './fetch-json.js';

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRY_DELAY_MS = 30_000;

function defaultSleep(delayMs, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    function onAbort() {
      clearTimeout(timeoutId);
      reject(signal.reason);
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function requireInteger(value, name, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} doit être un entier entre ${min} et ${max}.`);
  }

  return value;
}

function getRetryAfterDelay(value, now) {
  if (value === null || value.trim() === '') {
    return null;
  }

  if (/^[0-9]+$/u.test(value)) {
    return Math.min(Number(value) * 1000, MAX_RETRY_DELAY_MS);
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) {
    return null;
  }

  return Math.min(Math.max(0, date - now()), MAX_RETRY_DELAY_MS);
}

function isRetryable(error) {
  return error instanceof NetworkError
    || (error instanceof HttpError && RETRYABLE_STATUSES.has(error.status));
}

export async function fetchJsonWithRetry(
  url,
  {
    fetchImpl = globalThis.fetch,
    signal,
    maxAttempts = 3,
    baseDelayMs = 200,
    sleep = defaultSleep,
    now = Date.now,
  } = {},
) {
  requireInteger(maxAttempts, 'maxAttempts', { min: 1, max: 5 });
  requireInteger(baseDelayMs, 'baseDelayMs', { min: 0, max: 10_000 });

  if (typeof sleep !== 'function' || typeof now !== 'function') {
    throw new TypeError('sleep et now doivent être des fonctions.');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchJson(url, { fetchImpl, signal });
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }

      const retryAfterDelay = error instanceof HttpError
        ? getRetryAfterDelay(error.retryAfter, now)
        : null;
      const exponentialDelay = baseDelayMs * (2 ** (attempt - 1));

      await sleep(retryAfterDelay ?? exponentialDelay, signal);
    }
  }

  throw new Error('État de reprise inaccessible.');
}
