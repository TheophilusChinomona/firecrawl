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

# Each image carries an org.opencontainers.image.source label pointing at
# its origin GitHub repo. GHCR uses that label to attach the package to
# the named repo, which lets it inherit the repo's public visibility on
# first push (otherwise local docker push lands the package as private,
# detached from any repo).
build_and_push() {
  local name="$1" context="$2" source_repo="$3" dockerfile="${4:-}"
  local tag="$REGISTRY/$OWNER/$name:latest"
  local source_url="https://github.com/$OWNER/$source_repo"
  bold "Building $tag (source=$source_url)"
  if [ -n "$dockerfile" ]; then
    docker build \
      --label "org.opencontainers.image.source=$source_url" \
      -f "$dockerfile" -t "$tag" "$context"
  else
    docker build \
      --label "org.opencontainers.image.source=$source_url" \
      -t "$tag" "$context"
  fi
  bold "Pushing $tag"
  docker push "$tag"
}

build_and_push cf-access-verifier "$PARENT/fire-enrich/services/cf-access-verifier" fire-enrich
build_and_push fire-enrich-web    "$PARENT/fire-enrich"                              fire-enrich              "$PARENT/fire-enrich/apps/web/Dockerfile"
build_and_push firecrawl-mcp      "$PARENT"                                          firecrawl-mcp-server     "$PARENT/firecrawl-mcp-server/Dockerfile.deploy"

bold "All three sidecar images built and pushed."
