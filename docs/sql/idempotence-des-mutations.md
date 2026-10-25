# Rendre une mutation idempotente en SQL

Une requête `POST` peut réussir alors que sa réponse se perd. Si le client répète
aveuglément la création, l’API risque d’enregistrer deux ressources.

## Définir l’identité d’une opération

Le client envoie une clé dans `Idempotency-Key`. Le serveur la stocke avec :

- l’utilisateur authentifié ;
- la route appelée ;
- l’empreinte SHA-256 du corps normalisé ;
- le statut et le corps de la première réponse ;
- une date d’expiration permettant le nettoyage.

La contrainte `UNIQUE (user_id, route, idempotency_key)` empêche deux traitements
concurrents de revendiquer la même opération. La clé seule ne suffit pas : sa portée
doit inclure l’utilisateur et la route.

## Première requête, reprise ou conflit

Dans une transaction `BEGIN IMMEDIATE`, le serveur cherche la clé :

1. si elle est absente, il exécute l’écriture métier et mémorise la réponse ;
2. si elle existe avec la même empreinte, il renvoie la réponse mémorisée ;
3. si l’empreinte diffère, il répond par un conflit sans exécuter la mutation.

L’écriture métier et l’enregistrement de la réponse doivent partager la même
transaction. Ainsi, une erreur annule les deux. On évite une ressource créée sans
réponse rejouable, ou une réponse mémorisée pour une création annulée.

## Limites de l’exemple

`idempotent-request.js` illustre ce flux avec SQLite synchrone et une seule base.
Une application distribuée doit aussi définir la durée de conservation, le nettoyage
des clés expirées, le comportement des requêtes encore en cours et l’isolation de la
base utilisée en production.

Les dates sont normalisées en UTC avant stockage afin que leur comparaison textuelle
reste fiable. `deleteExpiredIdempotencyRequests` supprime les entrées expirées par
lots de 1 à 1 000 lignes : une tâche périodique peut ainsi nettoyer la table sans
lancer une suppression non bornée. La durée de conservation reste une décision
métier à documenter selon le risque de reprise tardive.

La lecture vérifie aussi l’expiration dans la transaction : une entrée dépassée est
retirée avant la recherche, puis la mutation est traitée comme une nouvelle opération.
La sécurité du rejeu ne dépend donc pas du passage exact de la tâche de nettoyage.
Une nouvelle entrée doit toujours recevoir une expiration future.

L’empreinte doit être calculée côté serveur à partir d’un corps normalisé. Il ne faut
ni faire confiance à une empreinte fournie par le client, ni utiliser la clé comme
authentification. Les contrôles de session, CSRF, autorisation et validation restent
obligatoires.
