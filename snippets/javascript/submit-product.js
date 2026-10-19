import { parseProductResponse } from './product-api-schema.js';
import { validateProductInput } from './product-form.js';

export function createProductSubmission({ request }) {
  if (typeof request !== 'function') {
    throw new TypeError('Une fonction request est nécessaire.');
  }

  return async function submitProduct(input) {
    const { value, errors } = validateProductInput(input);

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    const response = await request('products', {
      method: 'POST',
      body: value,
    });

    return {
      ok: true,
      product: parseProductResponse(response),
    };
  };
}
