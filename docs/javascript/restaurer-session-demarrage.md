# Restaurer une session au démarrage sans créer de course

Après un rechargement de page, l’application ne sait pas encore si le cookie
`HttpOnly` correspond à une session valide. Afficher immédiatement l’écran anonyme
provoque un clignotement et peut rediriger à tort un utilisateur déjà connecté.

L’état initial doit donc être explicite : `uninitialized` ou `loading`, puis une
lecture du serveur décide entre session authentifiée, session anonyme et erreur.

## Lire la session sans exposer le cookie

Le navigateur joint le cookie à une lecture de session :

```http
GET /session
Cookie: session=...
```

Avec `credentials: 'include'`, JavaScript demande l’envoi du cookie sans pouvoir lire
sa valeur s’il est `HttpOnly`. `GET` ne modifie rien : aucun jeton CSRF n’est requis.

La réponse reste une donnée non fiable. Un parseur en liste blanche doit contrôler
l’état, l’utilisateur et les permissions avant toute mémorisation. Un champ inattendu
comme `accessToken` est ignoré, pas copié aveuglément dans l’état.

## Distinguer absence de session et panne

- une réponse anonyme valide ou un statut `401` établit un état anonyme ;
- une panne réseau, un statut serveur ou un JSON invalide laisse l’état indéterminé et
  remonte une erreur ;
- aucune lecture n’est répétée sans limite.

Présenter une panne comme une déconnexion masquerait le véritable problème et pourrait
déclencher une redirection incorrecte.

## Éviter deux courses asynchrones

Plusieurs composants peuvent demander la session au même démarrage. L’exemple
[`session-bootstrap.js`](../../snippets/javascript/session-bootstrap.js) partage la
même promesse afin de n’envoyer qu’un seul `GET`.

Une autre course est plus discrète : l’utilisateur peut réussir à se connecter avant
que la lecture initiale ne réponde. Si cette ancienne réponse anonyme arrive ensuite,
elle ne doit pas écraser la nouvelle session. La dépendance
`isSessionUninitialized` vérifie donc que l’état est toujours initial avant
`setSession`.

```js
const bootstrapSession = createSessionBootstrap({
  request: sessionRequest,
  parseSession,
  setSession: (session) => { currentSession = session; },
  isSessionUninitialized: () => currentSession.status === 'uninitialized',
});

await bootstrapSession();
```

L’interface doit prévoir des rendus distincts pour le chargement, l’utilisateur
authentifié, l’utilisateur anonyme et l’échec temporaire. Le serveur reste responsable
de la validité, de l’expiration et de la révocation réelles de la session.
