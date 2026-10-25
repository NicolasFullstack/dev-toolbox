const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export class IdempotencyConflictError extends Error {
  constructor() {
    super('Cette clé d’idempotence est déjà liée à une autre requête.');
    this.name = 'IdempotencyConflictError';
  }
}

function requireRequest({ userId, route, idempotencyKey, requestHash }) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new TypeError('userId doit être un entier strictement positif.');
  }
  if (typeof route !== 'string' || !/^\/[A-Za-z0-9/_-]{0,119}$/.test(route)) {
    throw new TypeError('route doit être un chemin API sûr.');
  }
  if (typeof idempotencyKey !== 'string' || !KEY_PATTERN.test(idempotencyKey)) {
    throw new TypeError('idempotencyKey doit contenir 16 à 128 caractères sûrs.');
  }
  if (typeof requestHash !== 'string' || !HASH_PATTERN.test(requestHash)) {
    throw new TypeError('requestHash doit être une empreinte SHA-256 hexadécimale.');
  }
}

function normalizeResponse(response) {
  if (!response || !Number.isInteger(response.status)
      || response.status < 200 || response.status > 599) {
    throw new TypeError('Le résultat doit contenir un statut HTTP entre 200 et 599.');
  }

  const responseBody = JSON.stringify(response.body);
  if (typeof responseBody !== 'string') {
    throw new TypeError('Le corps de réponse doit être sérialisable en JSON.');
  }

  return { status: response.status, responseBody };
}

function normalizeIsoDate(value, label) {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} doit être une date ISO valide.`);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new TypeError(`${label} doit être une date ISO valide.`);
  }

  return new Date(timestamp).toISOString();
}

export function runIdempotentRequest(database, request, operation) {
  if (!database || typeof database.exec !== 'function') {
    throw new TypeError('Une connexion SQLite valide est nécessaire.');
  }
  requireRequest(request);
  if (typeof operation !== 'function') {
    throw new TypeError('operation doit être une fonction synchrone.');
  }

  const { userId, route, idempotencyKey, requestHash } = request;
  const expiresAt = normalizeIsoDate(
    request.expiresAt ?? '9999-12-31T23:59:59Z',
    'expiresAt',
  );
  const now = normalizeIsoDate(
    request.now ?? new Date().toISOString(),
    'now',
  );
  if (expiresAt <= now) {
    throw new TypeError('expiresAt doit être postérieure à now.');
  }

  database.exec('BEGIN IMMEDIATE');

  try {
    database.prepare(`
      DELETE FROM idempotency_requests
      WHERE user_id = ?
        AND route = ?
        AND idempotency_key = ?
        AND expires_at <= ?
    `).run(userId, route, idempotencyKey, now);

    const existing = database.prepare(`
      SELECT request_hash, response_status, response_body
      FROM idempotency_requests
      WHERE user_id = ? AND route = ? AND idempotency_key = ?
    `).get(userId, route, idempotencyKey);

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new IdempotencyConflictError();
      }

      database.exec('COMMIT');
      return {
        replayed: true,
        status: existing.response_status,
        body: JSON.parse(existing.response_body),
      };
    }

    const result = normalizeResponse(operation(database));
    database.prepare(`
      INSERT INTO idempotency_requests (
        user_id, route, idempotency_key, request_hash,
        response_status, response_body, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      route,
      idempotencyKey,
      requestHash,
      result.status,
      result.responseBody,
      expiresAt,
    );
    database.exec('COMMIT');

    return {
      replayed: false,
      status: result.status,
      body: JSON.parse(result.responseBody),
    };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function deleteExpiredIdempotencyRequests(
  database,
  { now, limit = 100 } = {},
) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('Une connexion SQLite valide est nécessaire.');
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw new TypeError('limit doit être un entier compris entre 1 et 1000.');
  }

  const normalizedNow = normalizeIsoDate(now, 'now');
  return database.prepare(`
    DELETE FROM idempotency_requests
    WHERE id IN (
      SELECT id
      FROM idempotency_requests
      WHERE expires_at <= ?
      ORDER BY expires_at, id
      LIMIT ?
    )
    RETURNING id
  `).all(normalizedNow, limit).length;
}
