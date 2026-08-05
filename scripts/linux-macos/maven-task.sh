#!/usr/bin/env sh
set -eu

task="${1:-}"
project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

if ! command -v mvn >/dev/null 2>&1; then
  echo "Maven não encontrado. Instale Maven 3.9+ e confirme que mvn está no PATH." >&2
  exit 1
fi

cd "$project_root"
case "$task" in
  run)      exec mvn spring-boot:run ;;
  test)     exec mvn test ;;
  clean)    exec mvn clean ;;
  build)    exec mvn clean package -DskipTests=true ;;
  coverage) exec mvn clean verify ;;
  *)
    echo "Tarefa inválida: $task" >&2
    exit 2
    ;;
esac
