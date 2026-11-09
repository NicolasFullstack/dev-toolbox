# Déconnecter une session sans faux sentiment de sécurité

Effacer le nom de l’utilisateur dans l’interface ne suffit pas à le déconnecter.
Tant que la session reste valide côté serveur, le cookie peut encore authentifier
des requêtes.

## Révoquer la session côté serveur

La déconnexion est une mutation. Une API peut par exemple exposer :

```http
DELETE /session
Cookie: session=...
X-CSRF-Token: ...
```

Le serveur doit invalider la session, vérifier le jeton CSRF et expirer le cookie
avec les mêmes attributs de chemin et de domaine que lors de sa création.

Le client purge ensuite la session et le jeton CSRF conservés en mémoire. Il ne
stocke ni le mot de passe, ni le cookie `HttpOnly`, ni un jeton d’accès dans
`localStorage`.

## Traiter les échecs correctement

- une réponse réussie confirme la révocation : l’état local peut être supprimé ;
- un statut `401` signifie que la session est déjà absente ou expirée : l’état
  local peut également être supprimé ;
- un statut `403`, une erreur serveur ou une panne réseau ne confirme pas la
  révocation : l’erreur doit rester visible et la requête ne doit pas être rejouée
  automatiquement.

Cette dernière règle évite d’afficher « déconnecté » alors que la session serveur
est peut-être encore active.

## Éviter plusieurs révocations simultanées

Un double clic ou deux composants peuvent déclencher la déconnexion presque en
même temps. L’exemple [`logout.js`](../../snippets/javascript/logout.js) partage
la promesse déjà en cours afin de n’envoyer qu’un seul `DELETE` et de ne purger
l’état qu’une fois.

```js
const logout = createLogout({
  request: sessionRequest,
  clearSession: () => {
    currentSession = { status: 'anonymous' };
    csrfTokenKeptInMemory = null;
  },
});

await logout();
```

La dépendance `sessionRequest` ajoute `credentials: 'include'` et le jeton CSRF.
Après un échec, une nouvelle action explicite de l’utilisateur peut relancer la
déconnexion.

## Responsabilités qui restent côté serveur

Le serveur doit notamment limiter la durée des sessions, renouveler leur identifiant
après connexion ou changement de privilège, permettre leur révocation et journaliser
les événements sans enregistrer de mot de passe, de cookie ou de jeton CSRF.
