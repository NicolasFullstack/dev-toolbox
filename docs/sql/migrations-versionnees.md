# Appliquer des migrations SQL versionnées

Une modification de schéma doit être reproductible sur une base vide comme sur
une base déjà utilisée. Modifier directement un ancien fichier SQL masque
l’historique et peut laisser deux environnements avec des structures différentes.

Une migration possède donc une version croissante, un nom stable et du SQL
immuable :

```js
{
  version: 2,
  name: 'add_products_active',
  sql: 'ALTER TABLE products ADD COLUMN active INTEGER NOT NULL DEFAULT 1',
}
```

## Déroulement sûr

L’exemple [`run-migrations.js`](../../snippets/sql/run-migrations.js) :

1. valide tout le catalogue avant d’ouvrir une transaction ;
2. prend un verrou d’écriture avec `BEGIN IMMEDIATE` sous SQLite ;
3. compare les migrations connues à l’historique `schema_migrations` ;
4. applique uniquement les versions absentes, dans l’ordre ;
5. mémorise une empreinte SHA-256 du SQL ;
6. valide le lot entier ou l’annule avec `ROLLBACK`.

L’empreinte détecte une ancienne migration modifiée après son application. Dans
ce cas, il faut créer une nouvelle version corrective : réécrire le passé ne
répare pas les bases déjà déployées.

## Limites à connaître

- toujours sauvegarder la base et tester la restauration avant une migration
  sensible ;
- certains moteurs ou certaines instructions DDL ne sont pas transactionnels de
  la même manière que SQLite ;
- une grosse transformation de données doit être découpée et observée pour ne
  pas bloquer durablement les écritures ;
- les migrations doivent être exécutées une seule fois par pipeline de
  déploiement, avec les droits minimaux nécessaires ;
- ne jamais placer de secret ni de donnée personnelle dans un fichier de
  migration.

Cet exemple montre le contrat et ses tests ; il ne remplace pas l’outil de
migration adapté au moteur et au framework choisis pour une application réelle.
