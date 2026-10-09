#!/usr/bin/env bash

set -euo pipefail

if (( $# != 1 )); then
  printf 'Usage : %s /chemin/vers/app.env\n' "${0##*/}" >&2
  exit 64
fi

env_file=$1

if [[ -L "$env_file" ]]; then
  printf 'Erreur : le fichier de configuration ne doit pas être un lien symbolique.\n' >&2
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  printf 'Erreur : fichier de configuration introuvable ou non régulier.\n' >&2
  exit 1
fi

mode=$(stat -c '%a' -- "$env_file")

case "$mode" in
  400|440|600|640) ;;
  *)
    printf 'Erreur : permissions trop ouvertes (attendu : 400, 440, 600 ou 640).\n' >&2
    exit 1
    ;;
esac

awk '
  function fail(message) {
    failed = 1
    print "Erreur : " message > "/dev/stderr"
    exit 1
  }

  BEGIN {
    required["APP_ENV"] = 1
    required["APP_URL"] = 1
    required["DB_DSN"] = 1
  }

  /^[[:space:]]*($|#)/ { next }

  {
    separator = index($0, "=")
    if (separator == 0) {
      fail("syntaxe invalide à la ligne " NR ".")
    }

    key = substr($0, 1, separator - 1)
    value = substr($0, separator + 1)

    if (key !~ /^[A-Za-z_][A-Za-z0-9_]*$/) {
      fail("clé invalide à la ligne " NR ".")
    }

    if (seen[key]++) {
      fail("clé dupliquée : " key ".")
    }

    if (key in required) {
      found[key] = 1
      if (value ~ /^[[:space:]]*$/) {
        fail("valeur vide pour " key ".")
      }
    }

    if (key == "APP_ENV" && value != "production") {
      fail("APP_ENV doit valoir production.")
    }

    if (key == "APP_DEBUG") {
      debug = tolower(value)
      if (debug != "0" && debug != "false") {
        fail("APP_DEBUG doit être désactivé en production.")
      }
    }
  }

  END {
    if (failed) {
      exit 1
    }

    for (key in required) {
      if (!found[key]) {
        fail("clé obligatoire absente : " key ".")
      }
    }
  }
' "$env_file"

printf 'Configuration valide.\n'
