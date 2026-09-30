export class ApiDataError extends TypeError {
  constructor(message, { index = null } = {}) {
    super(message);
    this.name = 'ApiDataError';
    this.index = index;
  }
}

function invalidProduct(index, detail) {
  return new ApiDataError(`Produit ${index} invalide : ${detail}`, { index });
}

function parseProduct(value, index) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidProduct(index, 'un objet est attendu.');
  }

  if (!Number.isSafeInteger(value.id) || value.id <= 0) {
    throw invalidProduct(index, 'id doit être un entier strictement positif.');
  }

  if (typeof value.name !== 'string') {
    throw invalidProduct(index, 'name doit être une chaîne de caractères.');
  }

  const name = value.name.trim();

  if (name.length < 2 || name.length > 120) {
    throw invalidProduct(index, 'name doit contenir entre 2 et 120 caractères.');
  }

  if (!Number.isSafeInteger(value.priceCents) || value.priceCents < 0) {
    throw invalidProduct(index, 'priceCents doit être un entier positif ou nul.');
  }

  if (typeof value.active !== 'boolean') {
    throw invalidProduct(index, 'active doit être un booléen.');
  }

  return {
    id: value.id,
    name,
    priceCents: value.priceCents,
    active: value.active,
  };
}

export function parseProductList(value) {
  if (!Array.isArray(value)) {
    throw new ApiDataError('La réponse doit être un tableau de produits.');
  }

  return value.map(parseProduct);
}
