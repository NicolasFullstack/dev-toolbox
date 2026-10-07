# Contraintes et index d’un catalogue de produits

La validation applicative améliore les messages affichés, mais la base de données doit
aussi protéger ses propres règles. Une contrainte empêche qu'un autre script, un import
ou une future version de l'application enregistre une donnée incohérente.

L'exemple utilise SQLite afin de pouvoir être exécuté sans serveur. Les principes sont
les mêmes avec MySQL ou PostgreSQL, mais la syntaxe des identifiants automatiques et
certaines fonctions doit être adaptée au moteur choisi.

## Règles du schéma

- `NOT NULL` rend une valeur obligatoire ;
- `UNIQUE` empêche les doublons ;
- `CHECK` limite les valeurs acceptées par une règle métier ;
- `FOREIGN KEY` garantit que la catégorie associée existe ;
- `owner_id` relie chaque produit à un utilisateur existant ;
- `ON DELETE RESTRICT` interdit de supprimer une catégorie encore utilisée ;
- le prix est stocké en centimes dans un entier pour éviter les approximations des
  nombres à virgule flottante.

La valeur `active` vaut `0` ou `1`. Cette contrainte est explicite dans le schéma, car
SQLite n'impose pas un véritable type booléen.

## Indexer une requête réelle

L'index composite porte sur `(category_id, active, name)` parce que la requête visée
filtre d'abord par catégorie et état, puis trie par nom :

```sql
SELECT id, name, price_cents
FROM products
WHERE category_id = ? AND active = 1
ORDER BY name
LIMIT ?;
```

Les `?` sont des paramètres à lier avec le pilote de base de données. Il ne faut jamais
construire cette requête en concaténant une saisie utilisateur.

Un index accélère les lectures ciblées, mais occupe de l'espace et ralentit les
écritures. Il doit répondre à une requête observée, pas être ajouté à chaque colonne par
habitude. `EXPLAIN QUERY PLAN` permet ici de vérifier que SQLite utilise bien l'index.

Le fichier [`products-schema.sql`](../../snippets/sql/products-schema.sql) contient le
schéma complet et ses tests exécutent les contraintes sur une base en mémoire.
