# JavaScript natif

Cette rubrique commence par les bases du langage avant d'aborder le DOM, `fetch` ou React.

## Première étape : tableaux, objets et fonctions

Un tableau regroupe plusieurs valeurs ordonnées. Un objet décrit une entité avec des propriétés nommées.

```js
const products = [
  { id: 1, name: 'Clavier MIDI', price: 99.9, active: true },
  { id: 2, name: 'Casque', price: 59.9, active: false },
];
```

Préférer `const` tant que la variable n'est pas réassignée. L'objet ou le tableau peut néanmoins rester modifiable : `const` protège la référence, pas son contenu.

Les méthodes de tableau les plus utiles sont :

- `filter` pour conserver certains éléments ;
- `map` pour transformer chaque élément ;
- `find` pour récupérer le premier élément correspondant ;
- `reduce` pour ramener une liste à une seule valeur.

Une fonction pure ne modifie pas les données reçues et renvoie toujours le même résultat pour les mêmes arguments. Elle est plus simple à comprendre et à tester.

```js
export function getActiveProductNames(products) {
  return products
    .filter((product) => product.active)
    .map((product) => product.name);
}
```

## Points d'attention

- `map` renvoie un nouveau tableau ; ne pas l'utiliser uniquement pour ses effets de bord.
- `find` peut renvoyer `undefined` : prévoir ce cas.
- Les données reçues d'un formulaire ou d'une API doivent être validées.
- Une validation JavaScript améliore l'expérience utilisateur, mais ne remplace jamais la validation côté serveur.
- Éviter `innerHTML` avec une valeur non fiable : ce point sera détaillé dans la fiche consacrée au DOM et à la sécurité côté client.

L'exemple exécutable se trouve dans [`snippets/javascript/products.js`](../../snippets/javascript/products.js), avec des tests automatisés sans dépendance externe.

## Suite du parcours

- [`fetch`, promesses et `async`/`await`](fetch-et-async.md)
