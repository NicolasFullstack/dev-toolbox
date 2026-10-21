import { parseProductResponse } from './product-api-schema.js';
import { validateProductInput } from './product-form.js';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

function normalizeIdempotencyKey(value) {
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new TypeError(
      'La clé d’idempotence doit contenir 16 à 128 caractères sûrs.',
    );
  }

  return value;
}

export function createProductSubmission({ request }) {
  if (typeof request !== 'function') {
    throw new TypeError('Une fonction request est nécessaire.');
  }

  return async function submitProduct(input, { idempotencyKey } = {}) {
    const { value, errors } = validateProductInput(input);

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    const response = await request('products', {
      method: 'POST',
      headers: {
        'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey),
      },
      body: value,
    });

    return {
      ok: true,
      product: parseProductResponse(response),
    };
  };
}
