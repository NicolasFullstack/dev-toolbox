# Réagir à une session expirée : `401` ou `403` ?

Une session peut expirer pendant que l’application reste ouverte. L’API ne doit pas
renvoyer le même statut lorsqu’elle ne reconnaît plus l’utilisateur et lorsqu’un
utilisateur connecté n’a pas le droit d’effectuer une action.

## Distinguer les statuts

- `401 Unauthorized` signifie ici que la requête exige une authentification valide :
  la session est absente, expirée ou révoquée ;
- `403 Forbidden` signifie que l’identité est connue, mais que l’action est interdite ;
- une panne réseau ne dit rien sur l’état de la session.

Sur `401`, le client peut supprimer la session et le jeton CSRF conservés en mémoire,
puis afficher l’écran de connexion. Sur `403`, il doit conserver la session et expliquer
que l’action n’est pas autorisée.

## Éviter une tempête d’invalidation

Une page peut charger plusieurs ressources en parallèle. Si la session a expiré, chaque
requête peut répondre `401`. Le client ne doit pas déclencher plusieurs déconnexions ou
redirections concurrentes.

Le garde [`session-guard.js`](../../snippets/javascript/session-guard.js) mémorise la
première notification. Il propage néanmoins chaque erreur d’origine à son appelant :

```js
const authenticatedRequest = createSessionGuard({
  request: sessionRequest,
  onSessionExpired: () => {
    currentSession = { status: 'anonymous' };
    csrfTokenKeptInMemory = null;
  },
});

await authenticatedRequest('me');
```

Le rappel reste volontairement synchrone et limité à la purge de l’état en mémoire.
La navigation, l’affichage d’un message ou une nouvelle connexion appartiennent à
l’interface.

Après une authentification réussie, le garde est réarmé explicitement :

```js
authenticatedRequest.reset();
```

## Ne pas rejouer automatiquement la requête

Une requête refusée par `401` ne doit pas être répétée aveuglément, surtout s’il s’agit
d’une mutation. Une reconnexion peut avoir changé le compte actif, les permissions ou
le contenu du formulaire. L’utilisateur ou une orchestration dédiée doit décider de la
suite.

Le serveur reste responsable de l’expiration réelle, de la révocation, de la rotation
de l’identifiant de session et de l’autorisation de chaque requête. Le garde côté client
n’est qu’une réaction d’interface à un statut HTTP fiable.
