# Exemples SQL

Les exemples utilisent SQLite en mémoire pour vérifier réellement les contraintes et
les requêtes, sans installer de serveur ni conserver de fichier de données.

```bash
cd snippets/sql
npm test
```

Node.js 24 ou une version ultérieure est nécessaire pour le module SQLite intégré.

## Exemples disponibles

- `products-schema.sql` : catégories, produits, contraintes et index composite.
- `reserve-stock.js` : transaction atomique de réservation et mouvement de stock.
