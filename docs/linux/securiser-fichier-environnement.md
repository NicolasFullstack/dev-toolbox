# Sécuriser un fichier d'environnement sous Linux

Un fichier d'environnement de production contient souvent des secrets. Il doit
rester hors du dépôt Git, être lisible seulement par le service et être vérifié
avant le démarrage de l'application.

## Emplacement et permissions

Conserver le vrai fichier en dehors du code déployé, par exemple dans
`/etc/mon-app/app.env`. Le dépôt ne contient qu'un `.env.example` avec des
valeurs factices.

Les modes conseillés sont :

- `600` ou `400` lorsque seul l'utilisateur du service doit lire le fichier ;
- `640` ou `440` lorsqu'un groupe dédié au service doit aussi le lire.

Un mode comme `644` expose les secrets à tous les utilisateurs de la machine.
Avec un accès de groupe, il faut également vérifier que ce groupe ne contient
que les comptes qui exécutent ou administrent l'application.

## Contrôle préalable sans charger les secrets

Le snippet associé refuse :

- un lien symbolique ou un fichier absent ;
- des permissions plus ouvertes que `640` ;
- une ligne qui n'utilise pas la forme stricte `CLE=valeur` ;
- une clé dupliquée ou une clé obligatoire absente ;
- un environnement différent de `production` ;
- `APP_DEBUG` lorsqu'il n'est pas désactivé.

Il ne fait jamais `source` du fichier et n'affiche aucune valeur : une
configuration malveillante ne peut donc pas exécuter une commande pendant le
contrôle, et les journaux ne reçoivent pas les secrets.

```bash
bash snippets/linux/check-env-file.sh /etc/mon-app/app.env
```

Le format accepté est volontairement minimal : pas de préfixe `export`, pas
d'expansion de variable et pas de guillemets interprétés. C'est au chargeur de
configuration de l'application de lire les valeurs ensuite.

## Ce que ce contrôle ne garantit pas

La réussite du script ne suffit pas à déclarer un déploiement prêt pour la
production. Il reste notamment à vérifier le propriétaire et le groupe du
fichier, la connexion réelle aux services, la rotation des secrets, les
sauvegardes et la configuration du gestionnaire de services.
