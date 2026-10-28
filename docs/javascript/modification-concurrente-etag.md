# Éviter l’écrasement d’une modification avec ETag

Deux personnes peuvent charger la même version d’un produit, la modifier puis
l’enregistrer à quelques secondes d’intervalle. Sans contrôle de concurrence,
la dernière requête écrase silencieusement la première : c’est une mise à jour
perdue.

## Le contrat HTTP

Lors de la lecture, l’API renvoie une version forte dans l’en-tête `ETag` :

```http
ETag: "product-7-v3"
```

Le client conserve cette valeur avec les données affichées. Au moment du
`PATCH`, il la renvoie dans `If-Match` :

```http
PATCH /products/7
If-Match: "product-7-v3"
Content-Type: application/json

{"name":"Clavier maître"}
```

Le serveur compare cette précondition à la version courante dans la même
transaction que l’écriture :

- si les versions correspondent, il applique le patch et renvoie le nouvel
  `ETag` ;
- si la ressource a changé, il n’écrit rien et répond `412 Precondition Failed`.

## Réagir au conflit

Une réponse `412` n’est pas une panne temporaire à retenter automatiquement.
Le client doit recharger la version courante et permettre à l’utilisateur de
comparer ou de ressaisir ses changements. Renvoyer le même patch sans décision
humaine recréerait précisément l’écrasement que le contrôle cherchait à éviter.

L’exemple `update-product-with-etag.js` :

- exige un ETag fort et correctement cité ;
- construit un patch à partir d’une liste blanche ;
- exclut notamment `ownerId`, qui doit rester déterminé par le serveur ;
- transforme uniquement le statut `412` en conflit métier ;
- valide le produit et le nouvel ETag avant de les remettre dans l’état client.

## Ce que l’ETag ne remplace pas

La précondition empêche une mise à jour perdue, mais ne prouve ni l’identité ni
le droit de modifier le produit. Le serveur doit toujours vérifier la session,
le jeton CSRF, les permissions, la propriété de la ressource et le contenu du
patch. Un ETag n’est pas un secret et ne doit jamais servir d’autorisation.

Pour une ressource modifiable, préférer un ETag fort. Un ETag faible commençant
par `W/` convient à certains usages de cache, mais pas à une comparaison forte
avec `If-Match`.
