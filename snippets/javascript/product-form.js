const FIELD_NAMES = ['name', 'price'];

export function validateProductInput(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const rawPrice = typeof input.price === 'string' ? input.price.trim() : input.price;
  const price = Number(rawPrice);
  const errors = {};

  if (name.length < 3 || name.length > 100) {
    errors.name = 'Le nom doit contenir entre 3 et 100 caractères.';
  }

  if (rawPrice === '' || !Number.isFinite(price) || price <= 0) {
    errors.price = 'Le prix doit être un nombre strictement positif.';
  }

  return {
    value: {
      name,
      price: Math.round(price * 100) / 100,
    },
    errors,
  };
}

export function renderProductFormErrors(form, errors) {
  for (const fieldName of FIELD_NAMES) {
    const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);

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
