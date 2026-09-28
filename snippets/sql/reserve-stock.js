export class InsufficientStockError extends Error {
  constructor() {
    super('Le produit est absent, inactif ou son stock est insuffisant.');
    this.name = 'InsufficientStockError';
  }
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} doit être un entier strictement positif.`);
  }
}

export function reserveStock(database, { productId, quantity }) {
  if (!database || typeof database.exec !== 'function') {
    throw new TypeError('Une connexion SQLite valide est nécessaire.');
  }

  requirePositiveInteger(productId, 'productId');
  requirePositiveInteger(quantity, 'quantity');

  const updateStock = database.prepare(`
    UPDATE products
    SET stock = stock - ?
    WHERE id = ?
      AND active = 1
      AND stock >= ?
  `);
  const insertMovement = database.prepare(`
    INSERT INTO stock_movements (product_id, quantity_delta, reason)
    VALUES (?, ?, 'reservation')
  `);

  database.exec('BEGIN IMMEDIATE');

  try {
    const result = updateStock.run(quantity, productId, quantity);

    if (result.changes !== 1) {
      throw new InsufficientStockError();
    }

    insertMovement.run(productId, -quantity);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  return database
    .prepare('SELECT id, stock FROM products WHERE id = ?')
    .get(productId);
}

