# Supprimer un produit avec ETag, CSRF et autorisation

Une suppression est une mutation irréversible pour l’utilisateur. Elle ne doit
donc pas partir d’une ancienne version du produit ni être répétée automatiquement
après une réponse réseau incertaine.

## Exiger la version affichée

L’API fournit un ETag fort lors de la lecture. Le client le renvoie dans
`If-Match` au moment du `DELETE` :

```http
DELETE /products/7
If-Match: "product-7-v3"
X-CSRF-Token: jeton-de-session
```

Le serveur vérifie la précondition dans la même opération que la suppression :

- `204 No Content` confirme la suppression ;
- `412 Precondition Failed` indique que le produit a changé ;
- `403 Forbidden` indique que la session ne possède pas le droit nécessaire ;
- `404 Not Found` évite de prétendre qu’une ressource connue existe encore.

Le client ne doit retirer le produit de son état local qu’après le `204`. Une
réponse `200` inattendue ou contenant un corps est refusée par l’exemple afin de
garder un contrat API précis.

## Ne pas confondre les protections

L’ETag protège contre une décision prise sur une ancienne version. Il ne remplace
ni le cookie de session, ni le jeton CSRF, ni l’autorisation. La fonction doit donc
recevoir une couche `request` qui ajoute la session et le CSRF aux mutations.

```js
const deleteProduct = createConditionalProductDeleter({
  request: sessionRequest,
});

const deleted = await deleteProduct({
  id: product.id,
  etag: productEtag,
});
```

Une panne réseau laisse le résultat incertain : la requête a pu atteindre le
serveur sans que la réponse revienne. Le client doit recharger la ressource avant
de proposer une nouvelle décision, pas rejouer automatiquement le `DELETE`.

L’exemple testable se trouve dans
[`snippets/javascript/delete-product-with-etag.js`](../../snippets/javascript/delete-product-with-etag.js).
