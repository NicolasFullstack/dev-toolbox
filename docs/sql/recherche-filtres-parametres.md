# Rechercher et filtrer sans construire du SQL dangereux

Les valeurs fournies par un formulaire ou une URL ne doivent jamais être concaténées dans
une requête SQL. Les paramètres nommés protègent les textes et les nombres, mais ils ne
peuvent pas remplacer un identifiant ou une direction de tri.

L’exemple [`search-products.js`](../../snippets/sql/search-products.js) sépare donc deux
responsabilités :

- la recherche, la catégorie, les prix et la limite sont validés puis liés comme paramètres ;
- le tri est choisi dans une liste blanche de fragments SQL écrits par l’application.

## Les jokers de `LIKE`

Même paramétrée, une recherche `LIKE` donne un sens spécial à `%` et `_`. Si le besoin est
une recherche littérale, il faut échapper ces caractères ainsi que le caractère d’échappement,
puis déclarer `ESCAPE '\\'` dans la requête. Une saisie `%` cherche alors le signe pourcentage
au lieu de retourner tout le catalogue.

## Une requête à composition bornée

Chaque filtre accepté ajoute une condition connue et un paramètre : aucun texte utilisateur
ne devient du SQL. La liste blanche de tris évite aussi une injection par `ORDER BY`, clause
pour laquelle un paramètre préparé ne peut pas représenter un nom de colonne.

Les règles métier restent présentes dans la requête : les produits inactifs sont toujours
exclus, même si le client omet ce filtre. La validation serveur impose également des bornes
aux prix, à la catégorie et à la taille de page.

Pour un gros catalogue, `LIKE '%texte%'` ne profite généralement pas d’un index B-tree
classique. Il faut mesurer avec des données réalistes puis envisager la recherche plein texte
du moteur choisi. Cet exemple vise la sûreté et la composition des filtres, pas une promesse
de performances universelle.
