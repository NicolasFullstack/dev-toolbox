# Autorisations côté client : rôles, permissions et propriété

L’authentification indique qui utilise l’application. L’autorisation détermine ensuite si
cette personne peut effectuer une action précise sur une ressource précise.

## Du rôle vers la permission

Un rôle regroupe généralement plusieurs permissions. Par exemple, un rôle `editor` peut
recevoir `products:read` et `products:write:own`. Le code métier gagne à vérifier ces
permissions plutôt que le nom du rôle : la politique reste explicite et peut évoluer sans
multiplier les conditions sur `admin`, `editor` ou `member`.

Une permission globale et une permission limitée ne doivent pas être confondues :

- `products:read` permet d’afficher un produit ;
- `products:write:own` permet de modifier uniquement ses propres produits ;
- `products:write:any` permet de modifier tous les produits ;
- `products:delete:any` permet de supprimer tous les produits.

La propriété complète donc la permission. Un utilisateur qui possède `products:write:own`
ne peut modifier la ressource que si son identifiant correspond à `ownerId`.

## Adapter l’interface sans créer une fausse sécurité

Le client peut masquer ou désactiver une action inutile :

```js
const canEdit = canUseProductAction(session, 'edit', product);

editButton.hidden = !canEdit;
```

Ce contrôle améliore l’expérience utilisateur, mais il n’empêche aucune attaque. Une personne
peut modifier le JavaScript, réafficher le bouton ou appeler directement l’API.

Pour chaque requête, le serveur doit donc :

1. retrouver la session authentifiée ;
2. charger la ressource demandée ;
3. vérifier la permission et, si nécessaire, sa propriété ;
4. refuser avec `403 Forbidden` si l’action n’est pas autorisée ;
5. ne renvoyer que les données que l’utilisateur peut consulter.

Un `401 Unauthorized` signifie en pratique que l’authentification est absente ou invalide.
Un `403 Forbidden` signifie que l’identité est connue, mais que l’action reste interdite.

## Échouer de façon restrictive

Une action inconnue, une session incomplète ou une ressource sans propriétaire valide ne doit
jamais accorder un droit par défaut. Le helper d’exemple renvoie `false` dans ces situations et
rejette les noms d’action inconnus, qui représentent une erreur de programmation.

L’exemple testable se trouve dans
[`snippets/javascript/authorization-ui.js`](../../snippets/javascript/authorization-ui.js).

