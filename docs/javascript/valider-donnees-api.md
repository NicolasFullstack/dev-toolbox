# Valider les données reçues d’une API

Une réponse peut avoir le statut `200`, contenir du JSON valide et rester inutilisable.
Le serveur peut avoir changé de contrat, renvoyer `null`, oublier une propriété ou envoyer
un nombre sous forme de chaîne. Le navigateur ne vérifie rien de tout cela automatiquement.

## Les quatre contrôles distincts

1. `fetch` vérifie si le transport a abouti, mais ne rejette pas une promesse pour un statut `404` ou `500`.
2. `response.ok` indique si le statut HTTP est compris entre 200 et 299.
3. `response.json()` vérifie uniquement que le corps contient du JSON syntaxiquement valide.
4. Une fonction dédiée doit encore vérifier la forme et les règles des données.

```js
const data = await fetchJson('/api/products');
const products = parseProductList(data);
```

Cette dernière étape constitue une frontière de confiance : aucune donnée externe ne doit
atteindre l’état de l’application avant d’avoir été contrôlée.

## Exemple de schéma manuel

Pour un produit, l’exemple associé impose :

- un `id` entier strictement positif ;
- un `name` de 2 à 120 caractères après suppression des espaces extérieurs ;
- un `priceCents` entier positif ou nul ;
- un `active` réellement booléen.

La fonction renvoie un nouvel objet ne contenant que ces quatre propriétés. Une propriété
inattendue n’est donc pas propagée dans l’interface, et la valeur d’origine n’est pas modifiée.

## Échouer explicitement

Si un seul produit ne respecte pas le contrat, la liste entière est refusée. L’erreur contient
l’index concerné pour faciliter le diagnostic technique. Ce détail doit être journalisé de
façon contrôlée, pas affiché tel quel à l’utilisateur.

Une validation côté client protège l’état de l’interface et améliore sa robustesse. Elle ne
remplace jamais les contrôles, les autorisations et la validation côté serveur.

L’exemple exécutable se trouve dans
[`snippets/javascript/product-api-schema.js`](../../snippets/javascript/product-api-schema.js).
