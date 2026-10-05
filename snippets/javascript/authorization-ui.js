export const PERMISSIONS = Object.freeze({
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE_OWN: 'products:write:own',
  PRODUCTS_WRITE_ANY: 'products:write:any',
  PRODUCTS_DELETE_ANY: 'products:delete:any',
});

const ACTIONS = new Set(['read', 'edit', 'delete']);

function hasPermission(session, permission) {
  return session?.authenticated === true
    && Array.isArray(session.permissions)
    && session.permissions.includes(permission);
}

function ownsProduct(session, product) {
  return Number.isSafeInteger(session?.user?.id)
    && session.user.id > 0
    && Number.isSafeInteger(product?.ownerId)
    && product.ownerId > 0
    && session.user.id === product.ownerId;
}

export function canUseProductAction(session, action, product) {
  if (!ACTIONS.has(action)) {
    throw new TypeError('Action produit inconnue.');
  }

  if (action === 'read') {
    return hasPermission(session, PERMISSIONS.PRODUCTS_READ);
  }

  if (action === 'edit') {
    return hasPermission(session, PERMISSIONS.PRODUCTS_WRITE_ANY)
      || (
        hasPermission(session, PERMISSIONS.PRODUCTS_WRITE_OWN)
        && ownsProduct(session, product)
      );
  }

  return hasPermission(session, PERMISSIONS.PRODUCTS_DELETE_ANY);
}

