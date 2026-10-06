#!/bin/sh
# Runs the visual regression suite in the Playwright image CI uses (amd64,
# like the CI runner), so local screenshots match CI's pixel for pixel.
# Arguments go to `playwright test`, e.g. --grep popup.
# Updating baselines (--update-snapshots) needs the owner's approval first.
set -e

IMAGE=mcr.microsoft.com/playwright:v1.63.0-noble
ROOT=$(cd "$(dirname "$0")/../.." && pwd)

# The anonymous volumes keep the container's Linux node_modules and .next
# away from the host's macOS ones.
docker run --rm --platform linux/amd64 --ipc=host \
  -v "$ROOT":/work -w /work \
  -v /work/node_modules \
  -v /work/apps/extension/node_modules \
  -v /work/apps/web/node_modules \
  -v /work/packages/shared/node_modules \
  -v /work/apps/web/.next \
  -v echofocus-vrt-pnpm-store:/pnpm-store \
  -e VRT_IN_DOCKER=1 \
  "$IMAGE" \
  sh -c 'sh tests/visual/setup-container.sh && pnpm test:visual:run "$@"' sh "$@"
