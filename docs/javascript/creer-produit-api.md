# Relier un formulaire à une API

Une soumission fiable ne consiste pas seulement à appeler fetch. Elle relie
plusieurs contrôles qui gardent chacun une responsabilité précise :

1. lire les champs du formulaire ;
2. valider et normaliser les saisies ;
3. construire un payload limité aux propriétés autorisées ;
4. envoyer la mutation avec la session et le jeton CSRF ;
5. valider la réponse de l’API avant de mettre à jour l’interface.

## Injecter la requête

L’exemple submit-product.js reçoit une fonction request. Elle peut donc être
remplacée dans les tests et, dans l’application, correspondre à la couche qui
gère déjà le cookie de session, le jeton CSRF et les erreurs HTTP.

    const submitProduct = createProductSubmission({
      request: sessionRequest,
    });

    const idempotencyKey = crypto.randomUUID();
    const result = await submitProduct(values, { idempotencyKey });

    if (!result.ok) {
      renderProductFormErrors(form, result.errors);
      return;
    }

    addProductToInterface(result.product);

Le module ne lit jamais ownerId depuis le formulaire. Le serveur doit déduire le
propriétaire de la session authentifiée et vérifier l’autorisation.

## Trois familles d’erreurs

- Une erreur de champ renvoie ok: false et empêche l’appel réseau.
- Une erreur HTTP reste une erreur technique ; elle ne doit pas être affichée
  directement avec des détails sensibles.
- Une réponse 2xx dont les données ne respectent pas le contrat est également
  rejetée avant d’entrer dans l’état de l’application.

## Éviter une création en double

La réponse d’un `POST` peut être perdue alors que le serveur a bien créé la
ressource. Relancer la requête avec une nouvelle identité risquerait alors de
créer un doublon.

La clé d’idempotence représente une opération précise :

- elle est créée au début de la soumission ;
- elle est conservée tant que le résultat reste incertain ;
- elle est réutilisée uniquement pour reprendre cette même opération ;
- une nouvelle saisie reçoit une nouvelle clé.

L’exemple accepte uniquement une clé de 16 à 128 caractères sûrs et l’envoie dans
`Idempotency-Key`. Il ne relance jamais le `POST` automatiquement. Le serveur doit
encore associer la clé à l’utilisateur et à la route, mémoriser le premier résultat
et renvoyer ce résultat lors d’une répétition.

Une clé d’idempotence ne remplace ni le jeton CSRF, ni l’authentification, ni le
contrôle des permissions.

## Ce que le serveur doit encore garantir

La validation JavaScript améliore l’expérience utilisateur, mais elle est
contournable. L’API doit refaire la validation, vérifier le CSRF et les
permissions, imposer ses limites métier et construire elle-même les champs
fiables tels que le propriétaire.
