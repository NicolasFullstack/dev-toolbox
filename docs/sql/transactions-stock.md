# Réserver du stock avec une transaction

Une réservation de stock effectue deux écritures liées : diminuer la quantité disponible
et enregistrer le mouvement correspondant. Si une seule des deux réussit, la base devient
incohérente.

Une transaction garantit l'atomicité de l'opération :

```sql
BEGIN IMMEDIATE;

UPDATE products
SET stock = stock - ?
WHERE id = ?
  AND active = 1
  AND stock >= ?;

INSERT INTO stock_movements (product_id, quantity_delta, reason)
VALUES (?, ?, 'reservation');

COMMIT;
```

En cas d'erreur, `ROLLBACK` annule toutes les écritures réalisées depuis le début de la
transaction.

## Éviter le contrôle séparé

Lire le stock avec un premier `SELECT`, puis décider de le modifier plus tard laisse une
fenêtre pendant laquelle une autre requête peut réserver les mêmes articles. La condition
`stock >= ?` est placée directement dans l'`UPDATE`. Le nombre de lignes modifiées indique
si la réservation a réellement réussi.

## Pourquoi `BEGIN IMMEDIATE` ?

Dans SQLite, `BEGIN IMMEDIATE` prend le verrou d'écriture dès le début. Cela évite que la
transaction découvre trop tard qu'une autre écriture concurrente a pris la main. MySQL
et PostgreSQL utilisent d'autres mécanismes et niveaux d'isolation : il faut adapter cette
partie au moteur choisi.

## Règles d'utilisation

- toujours exécuter `ROLLBACK` dans le chemin d'erreur ;
- garder la transaction courte, sans appel réseau ni traitement lent ;
- lier les paramètres au lieu de concaténer des valeurs dans le SQL ;
- vérifier le nombre de lignes modifiées ;
- conserver une trace métier distincte des journaux techniques.

L'exemple [`reserve-stock.js`](../../snippets/sql/reserve-stock.js) couvre la réussite,
le stock insuffisant et une panne simulée pendant l'écriture du mouvement.

