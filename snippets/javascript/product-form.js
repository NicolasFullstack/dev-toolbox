const FIELD_NAMES = ['name', 'price'];
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

function parsePriceCents(value) {
  const rawValue = typeof value === 'number' ? String(value) : value;

  if (typeof rawValue !== 'string') {
    return null;
  }

  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(rawValue.trim());
  if (!match) {
    return null;
  }

  const cents = (BigInt(match[1]) * 100n)
    + BigInt((match[2] ?? '').padEnd(2, '0') || '0');

  if (cents <= 0n || cents > MAX_SAFE_CENTS) {
    return null;
  }

  return Number(cents);
}

export function validateProductInput(input) {
  const source = input !== null && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {};
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const priceCents = parsePriceCents(source.price);
  const errors = {};

  if (name.length < 3 || name.length > 100) {
    errors.name = 'Le nom doit contenir entre 3 et 100 caractères.';
  }

  if (priceCents === null) {
    errors.price = 'Le prix doit être positif et contenir au maximum deux décimales.';
  }

  return {
    value: {
      name,
      priceCents,
    },
    errors,
  };
}

export function renderProductFormErrors(form, errors) {
  for (const fieldName of FIELD_NAMES) {
    const errorElement = form.querySelector('[data-error-for="' + fieldName + '"]');

    if (!errorElement) {
      continue;
    }

    const message = errors[fieldName] ?? '';
    errorElement.textContent = message;
    errorElement.hidden = message === '';
  }
}

function readFormValues(form) {
  return Object.fromEntries(new FormData(form));
}

export function bindProductForm(
  form,
  { onValidSubmit, readValues = readFormValues },
) {
  if (!form || typeof form.addEventListener !== 'function') {
    throw new TypeError('Un formulaire valide est nécessaire.');
  }

  if (typeof onValidSubmit !== 'function') {
    throw new TypeError('Le traitement des données valides est nécessaire.');
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    const { value, errors } = validateProductInput(readValues(form));
    renderProductFormErrors(form, errors);

    if (Object.keys(errors).length === 0) {
      onValidSubmit(value);
    }
  };

  form.addEventListener('submit', handleSubmit);

  return () => form.removeEventListener('submit', handleSubmit);
}
