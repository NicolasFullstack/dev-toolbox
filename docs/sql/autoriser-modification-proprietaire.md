# Autoriser la modification du propriétaire en SQL

Masquer un bouton dans l’interface ne protège pas une ressource. Le serveur doit retrouver
l’utilisateur depuis sa session, puis vérifier son droit au moment exact de la modification.

## Un seul `UPDATE` pour vérifier et modifier

Une approche fragile consiste à lire d’abord le produit, vérifier `owner_id` en JavaScript ou
PHP, puis lancer un second appel SQL. Entre les deux requêtes, l’état peut changer.

La condition de propriété peut être placée directement dans la modification :

```sql
UPDATE products
SET name = ?, price_cents = ?
WHERE id = ? AND owner_id = ?
RETURNING id, owner_id, name, price_cents;
```

La modification ne réussit que si le produit existe et appartient à l’utilisateur authentifié.
L’identifiant du propriétaire doit venir de la session serveur, jamais d’un champ envoyé par le
navigateur.

## Ne pas révéler inutilement l’existence d’une ressource

Si aucune ligne n’est modifiée, l’exemple renvoie la même erreur lorsque le produit est absent ou
appartient à quelqu’un d’autre. Cette réponse uniforme évite de transformer l’API en outil
d’énumération des identifiants existants.

Le serveur pourra traduire cette erreur en `404 Not Found` pour ne pas confirmer l’existence de la
ressource. Une politique différente peut choisir `403 Forbidden`, mais elle doit rester cohérente
dans toute l’API.

## Ce que SQL ne décide pas seul

La requête applique ici une règle « le propriétaire peut modifier ». Le serveur doit encore :

- authentifier la session avant d’ouvrir l’opération ;
- valider le nom et le prix ;
- décider séparément si une permission globale autorise un administrateur ;
- journaliser les refus sans données sensibles ;
- tester les accès croisés entre plusieurs utilisateurs.

L’exemple complet se trouve dans
[`update-owned-product.js`](../../snippets/sql/update-owned-product.js). Ses tests prouvent qu’un
autre utilisateur ne modifie aucune donnée.
