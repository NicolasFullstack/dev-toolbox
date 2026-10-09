# Snippets Linux

Petits contrôles conçus pour être lus, testés et adaptés avant un déploiement.

## Vérifier un fichier d'environnement

```bash
bash snippets/linux/check-env-file.sh /etc/mon-app/app.env
```

Le script vérifie la forme du fichier et ses permissions sans le charger dans le
shell. Il ne teste ni la connexion à la base de données ni la validité réelle des
identifiants.

Tests :

```bash
bash snippets/linux/test/check-env-file.test.sh
```
