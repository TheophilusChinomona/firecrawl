#!/usr/bin/env bash
#
# One-off helper to build and push the three sidecar images that don't
# have CI in this repo (their source lives in sibling repos):
#
#   ghcr.io/theophiluschinomona/cf-access-verifier:latest
#   ghcr.io/theophiluschinomona/firecrawl-mcp:latest
#   ghcr.io/theophiluschinomona/fire-enrich-web:latest
#
# Run this once (or whenever the sibling source changes) until you set up
# CI in those sibling repos. See deploy/sibling-workflows/ for templates.
#
# Expected layout (run from the firecrawl repo root):
#   parent/
#   ├── firecrawl/                  ← this repo
#   ├── fire-enrich/
#   └── firecrawl-mcp-server/

set -euo pipefail

OWNER="${OWNER:-theophiluschinomona}"
REGISTRY="${REGISTRY:-ghcr.io}"
PARENT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
fail()  { printf "\033[31mERROR: %s\033[0m\n" "$*" >&2; exit 1; }

[ -d "$PARENT/fire-enrich" ]            || fail "fire-enrich/ not found at $PARENT — clone it as a sibling first"
[ -d "$PARENT/firecrawl-mcp-server" ]   || fail "firecrawl-mcp-server/ not found at $PARENT — clone it as a sibling first"
command -v docker &>/dev/null            || fail "docker required"

if ! docker info 2>/dev/null | grep -q "Username: "; then
  bold "You may need to: docker login $REGISTRY"
fi

build_and_push() {
  local name="$1" context="$2" dockerfile="${3:-}"
  local tag="$REGISTRY/$OWNER/$name:latest"
  bold "Building $tag"
  if [ -n "$dockerfile" ]; then
    docker build -f "$dockerfile" -t "$tag" "$context"
  else
    docker build -t "$tag" "$context"
  fi
  bold "Pushing $tag"
  docker push "$tag"
}

build_and_push cf-access-verifier "$PARENT/fire-enrich/services/cf-access-verifier"
build_and_push fire-enrich-web    "$PARENT/fire-enrich"                       "$PARENT/fire-enrich/apps/web/Dockerfile"
build_and_push firecrawl-mcp      "$PARENT"                                    "$PARENT/firecrawl-mcp-server/Dockerfile.deploy"

bold "All three sidecar images built and pushed."
