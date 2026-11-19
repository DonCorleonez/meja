#!/usr/bin/env bash
# Rebuild the bundled games from local clones and copy their dist/ into games/<repo>/.
# Usage: scripts/build-games.sh ../meja-hotstreak ../meja-splendor ../meja-skyteam
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
[ "$#" -gt 0 ] || { echo "usage: $0 <path-to-game-repo>..." >&2; exit 2; }
for repo in "$@"; do
  name="$(basename "$(cd "$repo" && pwd)")"
  case "$name" in meja-*) ;; *) echo "skip $repo: folder must be named meja-*" >&2; exit 2 ;; esac
  echo "==> $name"
  (cd "$repo" && { [ -f package-lock.json ] && npm ci || npm install; } && npm run lint && npm run typecheck && npm test && npm run build)
  rm -rf "${here:?}/games/${name:?}"
  mkdir -p "$here/games/$name"
  cp -R "$repo/dist/." "$here/games/$name/"
  (cd "$repo" && echo "$name $(git rev-parse --short HEAD 2>/dev/null || echo unknown)") >> "$here/games/BUILD_INFO.tmp"
done
sort -u "$here/games/BUILD_INFO.tmp" > "$here/games/BUILD_INFO.txt" && rm "$here/games/BUILD_INFO.tmp"
echo "Done. Commit games/ and redeploy with: docker compose up -d --build"
