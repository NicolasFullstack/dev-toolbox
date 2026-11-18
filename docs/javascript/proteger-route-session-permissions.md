# Protéger une route après la restauration de session

Une route privée ne doit pas décider trop tôt. Au démarrage, l’application ignore encore si
le cookie de session correspond à un utilisateur connecté. Rediriger immédiatement vers la
connexion provoque alors un affichage trompeur, voire un aller-retour visible entre deux pages.

## Séparer les cinq résultats

Une décision de navigation claire distingue :

- `wait` : la restauration de session n’est pas terminée ;
- `retry` : la vérification a échoué temporairement ;
- `sign_in` : aucune session authentifiée n’existe ;
- `forbidden` : l’utilisateur est connu, mais n’a pas la permission demandée ;
- `show` : la route peut être affichée.

```js
import { PERMISSIONS } from '../../snippets/javascript/authorization-ui.js';
import { decideRouteAccess, ROUTE_ACCESS } from '../../snippets/javascript/route-access.js';

const access = decideRouteAccess({
  session,
  requiredPermissions: [PERMISSIONS.PRODUCTS_READ],
});

if (access === ROUTE_ACCESS.WAIT) {
  showLoadingScreen();
} else if (access === ROUTE_ACCESS.SIGN_IN) {
  redirectToSignIn();
} else if (access === ROUTE_ACCESS.FORBIDDEN) {
  showForbiddenPage();
}
```

Une panne réseau ne prouve pas que l’utilisateur est déconnecté. Elle conduit donc à un écran
réessayable, pas à une suppression de session ni à une redirection vers la connexion.

## Toutes les permissions ou au moins une

Le mode `all` convient lorsqu’une route exige chaque permission déclarée. Le mode `any` sert
lorsque plusieurs droits équivalents peuvent ouvrir la même page. Les permissions inconnues
sont rejetées comme des erreurs de programmation afin d’éviter une règle silencieusement
mal orthographiée.

La décision côté client ne constitue jamais une barrière de sécurité : elle adapte seulement
l’interface. L’API doit authentifier chaque requête, contrôler les permissions et la propriété
de la ressource, puis répondre `401` si la session manque ou `403` si l’action est interdite.

L’exemple exécutable se trouve dans
[`snippets/javascript/route-access.js`](../../snippets/javascript/route-access.js).
