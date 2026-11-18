import { PERMISSIONS } from './authorization-ui.js';

export const ROUTE_ACCESS = Object.freeze({
  WAIT: 'wait',
  RETRY: 'retry',
  SIGN_IN: 'sign_in',
  FORBIDDEN: 'forbidden',
  SHOW: 'show',
});

const KNOWN_PERMISSIONS = new Set(Object.values(PERMISSIONS));
const MODES = new Set(['all', 'any']);

function normalizeRequirements(requiredPermissions) {
  if (!Array.isArray(requiredPermissions)) {
    throw new TypeError('Les permissions requises doivent former un tableau.');
  }

  const requirements = [...new Set(requiredPermissions)];

  if (requirements.some((permission) => !KNOWN_PERMISSIONS.has(permission))) {
    throw new TypeError('Permission requise inconnue.');
  }

  return requirements;
}

export function decideRouteAccess({
  session,
  requiredPermissions = [],
  mode = 'all',
}) {
  if (!MODES.has(mode)) {
    throw new TypeError("Le mode doit être 'all' ou 'any'.");
  }

  const requirements = normalizeRequirements(requiredPermissions);

  if (session?.status === 'uninitialized' || session?.status === 'loading') {
    return ROUTE_ACCESS.WAIT;
  }
  if (session?.status === 'error') {
    return ROUTE_ACCESS.RETRY;
  }
  if (session?.authenticated === false) {
    return ROUTE_ACCESS.SIGN_IN;
  }
  if (
    session?.authenticated !== true
    || !Number.isSafeInteger(session.user?.id)
    || session.user.id <= 0
    || !Array.isArray(session.permissions)
  ) {
    throw new TypeError('État de session invalide.');
  }
  if (requirements.length === 0) {
    return ROUTE_ACCESS.SHOW;
  }

  const hasPermission = (permission) => session.permissions.includes(permission);
  const granted = mode === 'all'
    ? requirements.every(hasPermission)
    : requirements.some(hasPermission);

  return granted ? ROUTE_ACCESS.SHOW : ROUTE_ACCESS.FORBIDDEN;
}
