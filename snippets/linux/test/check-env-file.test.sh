#!/usr/bin/env bash

set -euo pipefail

test_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
checker="$test_dir/../check-env-file.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf -- "$fixture_dir"' EXIT

passed=0

expect_success() {
  local description=$1
  shift

  if "$@" >/dev/null 2>&1; then
    passed=$((passed + 1))
    return
  fi

  printf 'Échec : %s devait réussir.\n' "$description" >&2
  exit 1
}

expect_failure() {
  local description=$1
  shift

  if "$@" >/dev/null 2>&1; then
    printf 'Échec : %s devait être refusé.\n' "$description" >&2
    exit 1
  fi

  passed=$((passed + 1))
}

write_valid_env() {
  local path=$1

  printf '%s\n' \
    'APP_ENV=production' \
    'APP_URL=https://example.test' \
    'DB_DSN=sqlite:/srv/example/app.sqlite' \
    'APP_DEBUG=false' > "$path"
  chmod 600 "$path"
}

valid="$fixture_dir/valid.env"
write_valid_env "$valid"
expect_success 'un fichier valide en mode 600' bash "$checker" "$valid"

chmod 640 "$valid"
expect_success 'un fichier valide en mode 640' bash "$checker" "$valid"

chmod 644 "$valid"
expect_failure 'des permissions publiques' bash "$checker" "$valid"

target="$fixture_dir/target.env"
write_valid_env "$target"
ln -s "$target" "$fixture_dir/link.env"
expect_failure 'un lien symbolique' bash "$checker" "$fixture_dir/link.env"

missing="$fixture_dir/missing.env"
printf '%s\n' 'APP_ENV=production' 'APP_URL=https://example.test' > "$missing"
chmod 600 "$missing"
expect_failure 'une clé obligatoire absente' bash "$checker" "$missing"

duplicate="$fixture_dir/duplicate.env"
write_valid_env "$duplicate"
printf '%s\n' 'APP_URL=https://duplicate.test' >> "$duplicate"
expect_failure 'une clé dupliquée' bash "$checker" "$duplicate"

debug="$fixture_dir/debug.env"
write_valid_env "$debug"
sed -i 's/APP_DEBUG=false/APP_DEBUG=true/' "$debug"
expect_failure 'le mode debug actif' bash "$checker" "$debug"

invalid="$fixture_dir/invalid.env"
printf '%s\n' \
  'export APP_ENV=production' \
  'APP_URL=https://example.test' \
  'DB_DSN=sqlite:/srv/example/app.sqlite' > "$invalid"
chmod 600 "$invalid"
expect_failure 'une syntaxe shell ambiguë' bash "$checker" "$invalid"

secret="$fixture_dir/secret.env"
printf '%s\n' \
  'APP_ENV=production' \
  'APP_URL=https://example.test' \
  'DB_DSN=sqlite:/srv/example/app.sqlite' \
  'DB_PASSWORD=marqueur-a-ne-pas-afficher' \
  'APP_DEBUG=true' > "$secret"
chmod 600 "$secret"
set +e
secret_output=$(bash "$checker" "$secret" 2>&1)
secret_status=$?
set -e
if (( secret_status == 0 )); then
  printf 'Échec : le mode debug actif devait être refusé.\n' >&2
  exit 1
fi
if [[ "$secret_output" == *'marqueur-a-ne-pas-afficher'* ]]; then
  printf 'Échec : une valeur secrète a été affichée.\n' >&2
  exit 1
fi
passed=$((passed + 1))

printf '%s\n' "$passed tests réussis."
