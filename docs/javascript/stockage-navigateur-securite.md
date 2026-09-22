# Stockage navigateur et sécurité

`localStorage` conserve des chaînes de caractères entre les sessions. `sessionStorage`
utilise la même API, mais limite les données à l'onglet courant. Ces stockages sont
pratiques pour une préférence d'affichage, pas pour une donnée sensible.

## Ce qui peut être enregistré

Une valeur comme le thème de l'interface peut être mémorisée localement. En revanche,
un mot de passe, un jeton d'accès ou une donnée personnelle n'a rien à faire dans
`localStorage` : tout script exécuté sur la page peut le lire. Une faille XSS pourrait
donc l'extraire.

Le navigateur appartient à l'utilisateur. Son contenu peut être modifié depuis les
outils de développement : une donnée relue depuis le stockage est une entrée non fiable,
au même titre qu'un champ de formulaire.

## Sérialiser et valider

L'API stocke uniquement du texte. `JSON.stringify` transforme un objet avant
l'enregistrement et `JSON.parse` le reconstruit à la lecture.

```js
localStorage.setItem('demo:preferences:v1', JSON.stringify({
  theme: 'dark',
  compactMode: true,
}));
```

Trois protections restent nécessaires :

1. entourer la lecture et l'analyse d'une gestion d'erreur ;
2. valider chaque propriété et ignorer celles qui ne figurent pas dans le schéma ;
3. utiliser une clé versionnée pour pouvoir faire évoluer le format.

`setItem` peut aussi échouer, par exemple si le stockage est indisponible ou plein.
L'interface doit alors continuer à fonctionner et informer l'utilisateur si la
persistance était importante.

## Limites de sécurité

- le stockage côté client ne remplace jamais la base de données ni la validation serveur ;
- une autorisation doit toujours être contrôlée par le serveur ;
- les valeurs injectées dans le DOM doivent être affichées avec `textContent`, sauf
  contenu HTML explicitement assaini ;
- les cookies d'authentification nécessitent une stratégie dédiée (`HttpOnly`, `Secure`,
  `SameSite` et protection CSRF) : déplacer simplement un jeton dans un autre stockage
  ne résout pas tous les risques.

L'exemple [`preferences-storage.js`](../../snippets/javascript/preferences-storage.js)
applique une liste blanche, fournit des valeurs par défaut et se teste sans navigateur.

