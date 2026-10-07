export class ProductUpdateDeniedError extends Error {
  constructor() {
    super('Le produit est absent ou sa modification n’est pas autorisée.');
    this.name = 'ProductUpdateDeniedError';
  }
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} doit être un entier strictement positif.`);
  }
}

function normalizeName(value) {
  if (typeof value !== 'string') {
    throw new TypeError('name doit être une chaîne de caractères.');
  }

  const name = value.trim();

  if (name.length < 2 || name.length > 120) {
    throw new TypeError('name doit contenir entre 2 et 120 caractères.');
  }

  return name;
}

export function updateOwnedProduct(
  database,
  { productId, actorId, name, priceCents },
) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('Une connexion SQLite valide est nécessaire.');
  }

  requirePositiveInteger(productId, 'productId');
  requirePositiveInteger(actorId, 'actorId');
  const normalizedName = normalizeName(name);

  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new TypeError('priceCents doit être un entier positif ou nul.');
  }

  const product = database.prepare(`
    UPDATE products
    SET name = ?, price_cents = ?
    WHERE id = ? AND owner_id = ?
    RETURNING id, owner_id, name, price_cents
  `).get(normalizedName, priceCents, productId, actorId);

  if (!product) {
    throw new ProductUpdateDeniedError();
  }

  return product;
}
