const SORTS = Object.freeze({
  recent: 'p.created_at DESC, p.id DESC',
  name: 'p.name COLLATE NOCASE ASC, p.id ASC',
  priceAsc: 'p.price_cents ASC, p.id ASC',
  priceDesc: 'p.price_cents DESC, p.id ASC',
});

function optionalPositiveId(value, label) {
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} doit être un entier strictement positif.`);
  }
  return value;
}

function optionalPrice(value, label) {
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} doit être un entier positif ou nul.`);
  }
  return value;
}

function escapeLike(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

export function searchProducts(database, filters = {}) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('Une connexion SQLite valide est nécessaire.');
  }
  if (filters === null || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new TypeError('Les filtres doivent être un objet.');
  }

  const query = filters.query === undefined ? '' : filters.query;
  if (typeof query !== 'string' || query.trim().length > 80) {
    throw new TypeError('La recherche doit être un texte de 80 caractères maximum.');
  }
  const categoryId = optionalPositiveId(filters.categoryId, 'categoryId');
  const minPriceCents = optionalPrice(filters.minPriceCents, 'minPriceCents');
  const maxPriceCents = optionalPrice(filters.maxPriceCents, 'maxPriceCents');
  if (minPriceCents !== null && maxPriceCents !== null && minPriceCents > maxPriceCents) {
    throw new RangeError('Le prix minimum ne peut pas dépasser le prix maximum.');
  }
  const sort = filters.sort ?? 'recent';
  if (!Object.hasOwn(SORTS, sort)) {
    throw new TypeError('Le tri demandé n’est pas autorisé.');
  }
  const limit = filters.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError('limit doit être un entier compris entre 1 et 100.');
  }

  const conditions = ['p.active = 1'];
  const parameters = {};
  const normalizedQuery = query.trim();
  if (normalizedQuery !== '') {
    conditions.push("p.name LIKE :query ESCAPE '\\' COLLATE NOCASE");
    parameters.query = `%${escapeLike(normalizedQuery)}%`;
  }
  if (categoryId !== null) {
    conditions.push('p.category_id = :categoryId');
    parameters.categoryId = categoryId;
  }
  if (minPriceCents !== null) {
    conditions.push('p.price_cents >= :minPriceCents');
    parameters.minPriceCents = minPriceCents;
  }
  if (maxPriceCents !== null) {
    conditions.push('p.price_cents <= :maxPriceCents');
    parameters.maxPriceCents = maxPriceCents;
  }

  return database.prepare(`
    SELECT p.id, p.name, p.price_cents, c.name AS category_name
    FROM products AS p
    JOIN categories AS c ON c.id = p.category_id
    WHERE ${conditions.join('\n      AND ')}
    ORDER BY ${SORTS[sort]}
    LIMIT :limit
  `).all({ ...parameters, limit }).map((row) => ({ ...row }));
}
