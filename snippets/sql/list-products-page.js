const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function validateLimit(limit) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new TypeError(`limit doit être un entier entre 1 et ${MAX_LIMIT}.`);
  }
}

function validateCursor(cursor) {
  if (cursor === null) {
    return;
  }

  if (
    typeof cursor !== 'object'
    || typeof cursor.createdAt !== 'string'
    || cursor.createdAt.length === 0
    || !Number.isInteger(cursor.id)
    || cursor.id < 1
  ) {
    throw new TypeError('Le curseur de pagination est invalide.');
  }
}

export function listActiveProductsPage(
  database,
  { limit = DEFAULT_LIMIT, cursor = null } = {},
) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('Une connexion de base de données est requise.');
  }

  validateLimit(limit);
  validateCursor(cursor);

  const cursorFilter = cursor
    ? `AND (
        created_at < ?
        OR (created_at = ? AND id < ?)
      )`
    : '';

  const query = database.prepare(`
    SELECT id, name, price_cents, created_at
    FROM products
    WHERE active = 1
      ${cursorFilter}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `);

  const rows = cursor
    ? query.all(cursor.createdAt, cursor.createdAt, cursor.id, limit + 1)
    : query.all(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((row) => ({ ...row }));
  const lastItem = items.at(-1);

  return {
    items,
    nextCursor: hasMore
      ? { createdAt: lastItem.created_at, id: lastItem.id }
      : null,
  };
}
