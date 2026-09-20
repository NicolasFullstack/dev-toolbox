import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindProductForm,
  renderProductFormErrors,
  validateProductInput,
} from '../product-form.js';

class FakeForm extends EventTarget {
  constructor() {
    super();
    this.errorElements = {
      name: { textContent: '', hidden: true },
      price: { textContent: '', hidden: true },
    };
  }

  querySelector(selector) {
    const fieldName = selector.match(/data-error-for="(name|price)"/)?.[1];
    return this.errorElements[fieldName] ?? null;
  }
}

test('normalise un produit valide', () => {
  const result = validateProductInput({
    name: '  Clavier MIDI  ',
    price: '99.999',
  });

  assert.deepEqual(result, {
    value: { name: 'Clavier MIDI', price: 100 },
    errors: {},
  });
});

test('signale un nom et un prix invalides', () => {
  const { errors } = validateProductInput({ name: 'A', price: '' });

  assert.deepEqual(Object.keys(errors), ['name', 'price']);
});

test('affiche puis efface les erreurs avec textContent', () => {
  const form = new FakeForm();

  renderProductFormErrors(form, { name: '<strong>Nom invalide</strong>' });

  assert.equal(
    form.errorElements.name.textContent,
    '<strong>Nom invalide</strong>',
  );
  assert.equal(form.errorElements.name.hidden, false);
  assert.equal(form.errorElements.price.hidden, true);

  renderProductFormErrors(form, {});
  assert.equal(form.errorElements.name.textContent, '');
  assert.equal(form.errorElements.name.hidden, true);
});

test('intercepte submit et transmet uniquement les données valides', () => {
  const form = new FakeForm();
  const submissions = [];
  const unbind = bindProductForm(form, {
    readValues: () => ({ name: 'Pédale', price: '34.50' }),
    onValidSubmit: (product) => submissions.push(product),
  });

  const event = new Event('submit', { cancelable: true });
  form.dispatchEvent(event);

  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(submissions, [{ name: 'Pédale', price: 34.5 }]);

  unbind();
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(submissions.length, 1);
});

test('bloque le traitement lorsque les données sont invalides', () => {
  const form = new FakeForm();
  let wasSubmitted = false;

  bindProductForm(form, {
    readValues: () => ({ name: '', price: '-2' }),
    onValidSubmit: () => {
      wasSubmitted = true;
    },
  });

  form.dispatchEvent(new Event('submit', { cancelable: true }));

  assert.equal(wasSubmitted, false);
  assert.equal(form.errorElements.name.hidden, false);
  assert.equal(form.errorElements.price.hidden, false);
});
