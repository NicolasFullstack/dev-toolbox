import { parseProductResponse } from './product-api-schema.js';

const STRONG_ETAG_PATTERN = /^"[A-Za-z0-9._:-]{1,128}"$/;

export class ProductConflictError extends Error {
  constructor() {
    super('Le produit a été modifié depuis son chargement.');
    this.name = 'ProductConflictError';
  }
}

function normalizeId(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError('L’identifiant doit être un entier strictement positif.');
  }

  return value;
}

function normalizeStrongEtag(value) {
  if (typeof value !== 'string' || !STRONG_ETAG_PATTERN.test(value)) {
    throw new TypeError('Un ETag fort, entre guillemets, est nécessaire.');
  }

  return value;
}

function normalizePatch(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Les modifications doivent être un objet.');
  }

  const patch = {};

  if (Object.hasOwn(input, 'name')) {
    if (typeof input.name !== 'string') {
      throw new TypeError('name doit être une chaîne de caractères.');
    }

    const name = input.name.trim();
    if (name.length < 2 || name.length > 120) {
      throw new TypeError('name doit contenir entre 2 et 120 caractères.');
    }
    patch.name = name;
  }

  if (Object.hasOwn(input, 'priceCents')) {
    if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0) {
      throw new TypeError('priceCents doit être un entier positif ou nul.');
    }
    patch.priceCents = input.priceCents;
  }

  if (Object.hasOwn(input, 'active')) {
    if (typeof input.active !== 'boolean') {
      throw new TypeError('active doit être un booléen.');
    }
    patch.active = input.active;
  }

  if (Object.keys(patch).length === 0) {
    throw new TypeError('Au moins une modification autorisée est nécessaire.');
  }

  return patch;
}

export function createConditionalProductUpdater({ request }) {
  if (typeof request !== 'function') {
    throw new TypeError('Une fonction request est nécessaire.');
  }

  return async function updateProduct({ id, changes, etag }) {
    const productId = normalizeId(id);
    const currentEtag = normalizeStrongEtag(etag);
    const body = normalizePatch(changes);

    let response;
    try {
      response = await request(`products/${productId}`, {
        method: 'PATCH',
        headers: { 'If-Match': currentEtag },
        body,
      });
    } catch (error) {
      if (error?.status === 412) {
        throw new ProductConflictError();
      }
      throw error;
    }

    if (response === null || typeof response !== 'object' || Array.isArray(response)) {
      throw new TypeError('La réponse de modification doit être un objet.');
    }

    return {
      product: parseProductResponse(response.data),
      etag: normalizeStrongEtag(response.etag),
    };
  };
}
