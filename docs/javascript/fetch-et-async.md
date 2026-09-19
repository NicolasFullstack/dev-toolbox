# `fetch`, promesses et `async`/`await`

Une promesse représente un résultat qui sera disponible plus tard. Une fonction déclarée avec `async` renvoie toujours une promesse et `await` permet d'attendre son résultat sans enchaîner plusieurs appels à `.then()`.

```js
async function loadProducts() {
  const response = await fetch('/api/products');
  const products = await response.json();
  return products;
}
```

## Le piège principal de `fetch`

`fetch` rejette sa promesse lorsqu'il ne peut pas obtenir de réponse, par exemple après une coupure réseau. En revanche, une réponse HTTP `404` ou `500` résout normalement la promesse.

Il faut donc contrôler `response.ok` :

```js
const response = await fetch('/api/products');

if (!response.ok) {
  throw new Error(`Erreur HTTP ${response.status}`);
}
```

## Gérer l'erreur au bon niveau

La fonction qui dialogue avec l'API détecte et décrit l'erreur. Le composant ou le gestionnaire d'événement décide ensuite de ce qui doit être affiché.

```js
try {
  const products = await fetchJson('/api/products');
  renderProducts(products);
} catch (error) {
  showError('Impossible de charger les produits.');
  console.error(error);
}
```

Ne pas afficher directement au visiteur un message technique reçu du serveur : il peut révéler des détails internes. Une validation effectuée dans le navigateur améliore l'expérience, mais l'API doit toujours valider elle-même les données.

## À retenir

- `await` suspend seulement la fonction `async` courante, pas toute l'application.
- vérifier `response.ok` avant de considérer la requête comme réussie ;
- prévoir les réponses sans contenu, notamment le statut `204` ;
- distinguer l'erreur destinée aux journaux du message compréhensible affiché à l'utilisateur ;
- utiliser `try`/`catch` là où une réaction utile est possible ;
- ne jamais placer de secret dans le code JavaScript envoyé au navigateur.

L'exemple [`fetch-json.js`](../../snippets/javascript/fetch-json.js) applique ces règles et accepte une fonction `fetch` injectée afin d'être testé sans réseau.
