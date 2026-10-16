# DOM, événements et formulaires

Le DOM est la représentation JavaScript du document HTML. On peut y sélectionner
des éléments, écouter les actions de l'utilisateur et mettre l'interface à jour.

## Écouter l'envoi d'un formulaire

    <form id="product-form">
      <label>
        Nom
        <input name="name" required>
        <small data-error-for="name" hidden></small>
      </label>

      <label>
        Prix
        <input name="price" type="number" min="0.01" step="0.01" required>
        <small data-error-for="price" hidden></small>
      </label>

      <button type="submit">Enregistrer</button>
    </form>

L'événement submit couvre le clic sur le bouton et l'utilisation de la touche
Entrée. Écouter seulement le clic oublierait ce second cas.

    const form = document.querySelector('#product-form');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      console.log(values);
    });

## Séparer les responsabilités

Une organisation simple consiste à distinguer :

1. la lecture des champs avec FormData ;
2. la validation dans une fonction indépendante du navigateur ;
3. l'affichage des erreurs dans le DOM ;
4. l'action exécutée uniquement lorsque les données sont valides.

Cette séparation rend la validation réutilisable et facile à tester.

## Convertir un prix sans ambiguïté

Un prix ne devrait pas circuler dans l'API sous forme de nombre décimal. Les
nombres JavaScript utilisent une représentation binaire : certaines valeurs
décimales ne sont donc pas exactes.

Le validateur lit directement les chiffres saisis, limite la partie décimale à
deux positions puis produit un entier en centimes. Par exemple, 0,29 devient 29
et 99.99 devient 9999. Il refuse 99.999 au lieu de l'arrondir silencieusement.

L'entier obtenu facilite les comparaisons, les tests et le contrat avec l'API.
La base de données devrait utiliser un entier de centimes ou un type DECIMAL
adapté, jamais FLOAT pour une valeur monétaire.

## Sécurité côté client

Utiliser textContent pour afficher une valeur non fiable. Contrairement à
innerHTML, le texte n'est pas interprété comme du code HTML.

    errorElement.textContent = message;

La validation JavaScript donne un retour rapide, mais elle peut être contournée.
Le serveur doit refaire tous les contrôles avant d'utiliser ou d'enregistrer les
données.

## À retenir

- écouter submit et appeler preventDefault lorsque JavaScript gère l'envoi ;
- convertir explicitement les données lues avec FormData ;
- transmettre les prix en centimes entiers ;
- refuser une précision inattendue plutôt que l'arrondir implicitement ;
- afficher les données non fiables avec textContent ;
- retirer un écouteur devenu inutile ;
- toujours répéter la validation côté serveur.

L'exemple snippets/javascript/product-form.js applique ces règles, reste
indépendant du navigateur pour la validation et renvoie une fonction qui retire
son écouteur.
