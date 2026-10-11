# Paginer une API avec un curseur SQL

Une pagination `LIMIT ... OFFSET ...` est facile à écrire, mais l'ajout ou la
suppression d'une ligne entre deux requêtes peut déplacer les résultats. Un
élément risque alors d'être affiché deux fois ou ignoré.

## Utiliser un ordre total

Le curseur mémorise la dernière position lue. Le tri doit être déterministe :
`created_at` ne suffit pas, car plusieurs produits peuvent partager la même
date. L'identifiant sert donc de second critère.

```sql
SELECT id, name, price_cents, created_at
FROM products
WHERE active = 1
  AND (
    created_at < :cursor_created_at
    OR (created_at = :cursor_created_at AND id < :cursor_id)
  )
ORDER BY created_at DESC, id DESC
LIMIT :limit_plus_one;
```

Les paramètres sont liés à la requête. Une valeur reçue dans l'URL ne doit
jamais être concaténée au SQL.

## Savoir s'il reste une page

Le serveur demande `taille + 1` lignes :

- au plus `taille` lignes signifie qu'il n'y a pas de page suivante ;
- une ligne supplémentaire signifie qu'un nouveau curseur peut être construit
  avec le dernier élément réellement renvoyé.

Le client ne doit pas fabriquer ce curseur. Dans une API, le serveur peut
encoder puis signer les deux valeurs pour produire un jeton opaque, et doit
toujours les valider après décodage.

## Index associé

L'index suit le filtre et l'ordre de la requête :

```sql
CREATE INDEX idx_products_active_created_id
    ON products (active, created_at DESC, id DESC);
```

L'exemple `list-products-page.js` utilise SQLite en mémoire et vérifie notamment
la stabilité de la deuxième page lorsqu'un produit plus récent est ajouté entre
les deux lectures.
