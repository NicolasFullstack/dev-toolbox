export function createInitialProductsState() {
  return {
    status: 'idle',
    products: [],
    error: null,
    requestId: null,
  };
}

function isCurrentRequest(state, requestId) {
  return state.status === 'loading' && state.requestId === requestId;
}

function requireProductId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError('L’identifiant doit être un entier strictement positif.');
  }

  return id;
}

export function productsReducer(state, action) {
  switch (action.type) {
    case 'loadStarted':
      return {
        ...state,
        status: 'loading',
        error: null,
        requestId: action.requestId,
      };

    case 'loadSucceeded':
      if (!isCurrentRequest(state, action.requestId)) {
        return state;
      }

      return {
        status: 'success',
        products: [...action.products],
        error: null,
        requestId: null,
      };

    case 'loadFailed':
      if (!isCurrentRequest(state, action.requestId)) {
        return state;
      }

      return {
        ...state,
        status: 'error',
        error: 'Le chargement a échoué.',
        requestId: null,
      };

    case 'productDeleted': {
      const productId = requireProductId(action.id);

      if (!state.products.some((product) => product.id === productId)) {
        return state;
      }

      return {
        status: 'success',
        products: state.products.filter((product) => product.id !== productId),
        error: null,
        requestId: null,
      };
    }

    default:
      return state;
  }
}

