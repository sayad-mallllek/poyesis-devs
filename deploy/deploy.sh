#!/usr/bin/env bash
# Ships the working tree to the VPS and (re)builds the production stack.
#
#   DEPLOY_HOST=ubuntu@82.26.80.238 deploy/deploy.sh            # deploy
#   DEPLOY_HOST=ubuntu@82.26.80.238 deploy/deploy.sh --env       # also upload deploy/.env
#   DEPLOY_HOST=ubuntu@82.26.80.238 deploy/deploy.sh --seed      # also seed the first admin
#
# Secrets are never synced: deploy/.env exists only on the server (see --env).
set -euo pipefail

HOST="${DEPLOY_HOST:?Set DEPLOY_HOST, e.g. ubuntu@82.26.80.238}"
DIR="${DEPLOY_DIR:-/opt/poyesis}"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file deploy/.env"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

upload_env=false
seed=false
for arg in "$@"; do
  case "$arg" in
    --env) upload_env=true ;;
    --seed) seed=true ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

echo "→ Preparing $HOST:$DIR"
ssh "$HOST" "sudo mkdir -p '$DIR/deploy' && sudo chown -R \"\$(id -un):\$(id -gn)\" '$DIR'"

echo "→ Syncing sources"
# Excluded paths are protected from --delete, so the server's deploy/.env survives.
rsync -az --delete --exclude-from="$ROOT/deploy/rsync-exclude" "$ROOT/" "$HOST:$DIR/"

if $upload_env; then
  echo "→ Uploading deploy/.env"
  rsync -az --chmod=F600 "$ROOT/deploy/.env" "$HOST:$DIR/deploy/.env"
fi

echo "→ Building and starting containers"
ssh "$HOST" "cd '$DIR' && test -f deploy/.env || { echo 'deploy/.env missing on server (use --env)'; exit 1; }
  $COMPOSE up -d --build --remove-orphans --wait --wait-timeout 300
  docker image prune -f >/dev/null"

if $seed; then
  echo "→ Seeding the first administrator"
  ssh "$HOST" "cd '$DIR' && $COMPOSE exec -T api node dist/database/seed.js"
fi

echo "✓ Deployed. Health: $(ssh "$HOST" "curl -fsS http://127.0.0.1:4101/v1/health" || echo unavailable)"
