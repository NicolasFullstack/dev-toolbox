# Authentification par cookie et protection CSRF

Une application peut conserver la session dans un cookie plutôt que placer un jeton
d’accès dans `localStorage`. Cette solution limite le vol direct du secret par JavaScript
si le cookie est `HttpOnly`, mais elle demande une protection contre les requêtes CSRF.

## Le rôle du cookie de session

Après une connexion réussie, le serveur crée un identifiant de session imprévisible et
l’envoie dans un cookie. Les attributs importants sont :

- `HttpOnly` pour empêcher JavaScript de lire le cookie ;
- `Secure` pour ne l’envoyer qu’en HTTPS ;
- `SameSite=Lax` ou `Strict` lorsque le fonctionnement de l’application le permet ;
- un chemin et une durée de vie aussi limités que possible.

Le serveur doit renouveler l’identifiant après la connexion ou un changement de privilège,
invalider la session à la déconnexion et ne jamais placer d’information sensible directement
dans la valeur du cookie.

## Pourquoi une attaque CSRF reste possible

Le navigateur joint automatiquement les cookies aux requêtes concernées. Un site malveillant
peut donc tenter de provoquer une action vers l’application pendant que l’utilisateur y est
connecté. Il ne connaît pas forcément la réponse, mais l’action pourrait tout de même être
exécutée.

Les méthodes qui modifient des données (`POST`, `PUT`, `PATCH`, `DELETE`) doivent recevoir un
jeton CSRF que le site attaquant ne peut pas deviner. Le serveur compare ce jeton à la valeur
associée à la session avant d’exécuter l’action.

```js
await fetch('/api/profile', {
  method: 'PATCH',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfTokenKeptInMemory,
  },
  body: JSON.stringify({ displayName: 'Nicolas' }),
});
```

Le jeton CSRF n’est pas le cookie de session. Il peut être fourni par une réponse dédiée puis
conservé en mémoire par l’application. Il ne doit pas être écrit dans `localStorage` par simple
commodité.

## Défense en profondeur côté serveur

Le serveur doit également :

1. refuser une mutation sans jeton CSRF valide ;
2. contrôler les en-têtes `Origin` ou `Referer` lorsque c’est applicable ;
3. limiter précisément les origines autorisées par CORS ;
4. vérifier l’autorisation de l’utilisateur sur chaque ressource ;
5. traiter la déconnexion comme une mutation protégée.

`SameSite` réduit le risque mais ne remplace pas à lui seul le jeton CSRF. CORS ne constitue
pas non plus un système d’autorisation : il encadre ce que le navigateur laisse lire ou envoyer
depuis une autre origine.

## Authentification, autorisation et XSS

- l’authentification répond à « qui est connecté ? » ;
- l’autorisation répond à « cette personne peut-elle réaliser cette action sur cette ressource ? » ;
- la protection CSRF vérifie que la mutation vient bien de l’application attendue.

Un cookie `HttpOnly` empêche la lecture du secret, mais une faille XSS peut encore exécuter des
actions au nom de l’utilisateur. Il faut donc continuer à valider les données, éviter
`innerHTML` avec du contenu non fiable et appliquer une politique de sécurité du contenu adaptée.
