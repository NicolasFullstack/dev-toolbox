# Connecter une session sans exposer les identifiants

Un formulaire de connexion ne doit pas transformer le navigateur en coffre-fort à
mots de passe. Il transmet les identifiants une fois, valide la réponse, puis ne
conserve que l’état de session nécessaire à l’interface.

## Valider sans altérer le mot de passe

La validation côté client améliore le retour utilisateur et borne les entrées avant
le réseau. Elle ne remplace jamais la validation serveur.

- retirer les espaces extérieurs de l’adresse est acceptable ;
- ne pas appliquer `trim`, de normalisation Unicode ou de changement de casse au mot
  de passe : ces caractères peuvent en faire partie ;
- borner la taille des deux champs afin d’éviter des charges accidentellement énormes.

L’exemple [`login.js`](../../snippets/javascript/login.js) construit une charge JSON,
mais ne place jamais le mot de passe dans `localStorage`, une URL, un journal ou un
outil d’analyse.

## Protéger aussi la connexion contre le CSRF

Une attaque CSRF de connexion peut forcer le navigateur de la victime à utiliser la
session d’un autre compte. Les futures actions de la victime peuvent alors être
enregistrées dans ce compte.

Le serveur peut donc fournir un jeton de pré-authentification, puis exiger ce jeton
sur la mutation :

```http
POST /session
Cookie: pre_auth_session=...
X-CSRF-Token: ...
Content-Type: application/json
```

La fonction `createSessionRequest` de l’exemple ajoute le cookie avec
`credentials: 'include'` et remplace tout en-tête CSRF fourni par l’appelant par le
jeton approuvé.

## Valider la réponse avant de la mémoriser

Une réponse HTTP réussie reste une donnée non fiable. Le parseur injecté dans
`createLogin` doit appliquer un schéma en liste blanche : état authentifié, champs
utilisateur nécessaires et permissions connues. Une session anonyme, incomplète ou
contenant des types inattendus est refusée avant `setSession`.

```js
const login = createLogin({
  request: sessionRequest,
  parseSession,
  setSession: (session) => { currentSession = session; },
});

await login({ email, password });
```

Une seconde soumission pendant la première est bloquée. Après un échec, une nouvelle
action explicite peut réessayer, mais une requête `POST` n’est pas rejouée
automatiquement.

## Responsabilités qui restent côté serveur

Le serveur doit comparer un hachage de mot de passe adapté, renvoyer le même message
pour un compte absent ou un mot de passe incorrect, limiter les tentatives, renouveler
l’identifiant de session après connexion et configurer le cookie avec `Secure`,
`HttpOnly` et une politique `SameSite` adaptée. Les journaux ne doivent contenir ni
mot de passe, ni cookie, ni jeton CSRF.

Cet exemple illustre le flux côté client ; il ne suffit pas à qualifier une
authentification complète de prête pour la production.
