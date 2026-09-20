# DOM, événements et formulaires

Le DOM est la représentation JavaScript du document HTML. On peut y sélectionner des éléments, écouter les actions de l'utilisateur et mettre l'interface à jour.

## Écouter l'envoi d'un formulaire

```html
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
```

```js
const form = document.querySelector('#product-form');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  console.log(values);
});
```

L'événement `submit` couvre le clic sur le bouton et l'utilisation de la touche Entrée. Écouter seulement le `click` du bouton oublierait ce second cas.

## Séparer les responsabilités

Une organisation simple consiste à distinguer :

1. la lecture des champs avec `FormData` ;
2. la validation dans une fonction qui ne dépend pas du navigateur ;
3. l'affichage des erreurs dans le DOM ;
4. l'action à exécuter lorsque les données sont valides.

Cette séparation rend la validation réutilisable côté interface et facile à tester.

## Sécurité côté client

Utiliser `textContent` pour afficher une valeur non fiable. Contrairement à `innerHTML`, le texte n'est pas interprété comme du code HTML.

```js
errorElement.textContent = message;
```

La validation JavaScript sert à donner un retour rapide, mais elle peut être contournée. Le serveur doit donc refaire tous les contrôles avant d'utiliser ou d'enregistrer les données.

## À retenir

- sélectionner un élément précis et vérifier qu'il existe ;
- écouter `submit` pour un formulaire et appeler `preventDefault()` lorsque JavaScript gère l'envoi ;
- convertir explicitement les nombres lus avec `FormData` ;
- afficher les données non fiables avec `textContent` ;
- retirer un écouteur devenu inutile pour éviter les doublons ;
- toujours répéter la validation côté serveur.

L'exemple [`product-form.js`](../../snippets/javascript/product-form.js) applique ces règles et renvoie une fonction qui retire son écouteur.
