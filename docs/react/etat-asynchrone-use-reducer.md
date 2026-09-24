# Gérer un état asynchrone avec `useReducer`

Un composant qui charge des données doit distinguer plusieurs situations : avant la
requête, pendant le chargement, après une réussite et après une erreur. Plusieurs
appels à `useState` peuvent fonctionner, mais ils permettent aussi des combinaisons
incohérentes, comme `loading === true` avec une ancienne erreur encore affichée.

`useReducer` rassemble les transitions dans une fonction pure : elle reçoit l'état
actuel et une action, puis renvoie le nouvel état sans modifier l'ancien.

```jsx
const [state, dispatch] = useReducer(
  productsReducer,
  undefined,
  createInitialProductsState,
);
```

Une action décrit ce qui vient de se passer :

```js
dispatch({ type: 'loadStarted', requestId: 'products-2' });
dispatch({
  type: 'loadSucceeded',
  requestId: 'products-2',
  products,
});
```

## Pourquoi identifier les requêtes ?

Deux requêtes peuvent se croiser : l'utilisateur lance une recherche, change le filtre,
puis la première réponse arrive après la seconde. Sans contrôle, cette réponse ancienne
remplace le résultat le plus récent.

Le reducer mémorise l'identifiant du chargement courant. Une réussite ou une erreur dont
l'identifiant ne correspond plus est ignorée. Un `AbortController` reste utile pour
annuler la requête précédente, mais le contrôle dans le reducer constitue une seconde
protection contre les courses asynchrones.

## Règles à retenir

- ne jamais modifier directement `state` ou ses tableaux ;
- garder les effets de bord (`fetch`, stockage, journalisation) hors du reducer ;
- afficher un message utilisateur maîtrisé et journaliser l'erreur technique ailleurs ;
- prévoir explicitement les états `idle`, `loading`, `success` et `error` ;
- tester chaque transition comme une simple fonction JavaScript.

L'exemple [`products-reducer.js`](../../snippets/react/products-reducer.js) est utilisable
avec `useReducer`, tout en restant testable avec Node.js sans lancer de navigateur.

