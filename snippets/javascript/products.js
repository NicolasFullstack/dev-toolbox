/**
 * Retourne les produits actifs triés par prix croissant.
 * Les objets d'origine et le tableau reçu ne sont pas modifiés.
 *
 * @param {Array<{id: number, name: string, price: number, active: boolean}>} products
 * @returns {Array<{id: number, name: string, price: number, active: boolean}>}
 */
export function getActiveProductsByPrice(products) {
  if (!Array.isArray(products)) {
    throw new TypeError('La liste des produits doit être un tableau.');
  }

  return products
    .filter((product) => product.active === true)
    .toSorted((firstProduct, secondProduct) => firstProduct.price - secondProduct.price);
}

/**
 * Calcule le prix total d'une liste sans modifier les produits.
 *
 * @param {Array<{price: number}>} products
 * @returns {number}
 */
export function getTotalPrice(products) {
  if (!Array.isArray(products)) {
    throw new TypeError('La liste des produits doit être un tableau.');
  }

  return products.reduce((total, product) => {
    if (!Number.isFinite(product.price) || product.price < 0) {
      throw new TypeError('Chaque prix doit être un nombre positif.');
    }

    return total + product.price;
  }, 0);
}
