# Retenter une lecture réseau sans multiplier les effets de bord

Une reprise automatique peut absorber une panne brève, mais elle ne doit pas
masquer une erreur permanente ni répéter une opération qui modifie des données.

## Quelles erreurs retenter ?

Pour une lecture `GET`, l’exemple retente uniquement :

- une panne réseau clairement identifiée ;
- `429 Too Many Requests` ;
- `502 Bad Gateway` ;
- `503 Service Unavailable` ;
- `504 Gateway Timeout`.

Une réponse `400`, `401`, `403` ou `404` demande généralement une correction,
une authentification ou une décision utilisateur. La répéter immédiatement ne
résout rien. Une réponse au mauvais format n’est pas non plus une panne réseau.

## Attendre entre les tentatives

Sans indication du serveur, le délai double après chaque échec : 200 ms, puis
400 ms, par exemple. Si la réponse fournit `Retry-After`, le client respecte sa
valeur en secondes ou sa date HTTP, avec une limite de 30 secondes.

Le nombre total de tentatives reste borné. En production, un léger aléa peut
être ajouté au délai afin que de nombreux clients ne repartent pas exactement
au même instant.

## Annulation et écritures

Le même `AbortSignal` est transmis à la requête et à l’attente. Une annulation
arrête immédiatement la séquence et n’est jamais transformée en panne réseau.

L’exemple expose volontairement seulement une lecture `GET`. Retenter un
`POST`, un paiement ou une autre mutation peut produire deux effets. Une telle
API doit d’abord définir une clé d’idempotence vérifiée côté serveur.

L’implémentation testée se trouve dans
[`fetch-json-with-retry.js`](../../snippets/javascript/fetch-json-with-retry.js).
