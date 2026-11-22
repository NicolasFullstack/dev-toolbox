const STRONG_ETAG_PATTERN = /^"[A-Za-z0-9._:-]{1,128}"$/;

export class ProductDeletionConflictError extends Error {
  constructor() {
    super('Le produit a été modifié depuis son chargement.');
    this.name = 'ProductDeletionConflictError';
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

export function createConditionalProductDeleter({ request }) {
  if (typeof request !== 'function') {
    throw new TypeError('Une fonction request est nécessaire.');
  }

  return async function deleteProduct({ id, etag }) {
    const productId = normalizeId(id);
    const currentEtag = normalizeStrongEtag(etag);

    let response;
    try {
      response = await request(`products/${productId}`, {
        method: 'DELETE',
        headers: { 'If-Match': currentEtag },
        includeResponseMetadata: true,
      });
    } catch (error) {
      if (error?.status === 412) {
        throw new ProductDeletionConflictError();
      }

      throw error;
    }

    if (!response || response.status !== 204 || response.data !== null) {
      throw new TypeError('La suppression doit renvoyer une réponse 204 vide.');
    }

    return { id: productId };
  };
}
