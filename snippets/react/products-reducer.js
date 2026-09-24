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

    default:
      return state;
  }
}

