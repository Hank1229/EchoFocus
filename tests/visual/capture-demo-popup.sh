#!/bin/sh
# Writes apps/web/public/demo/popup-*.png from the extension build, in the
# Playwright image the visual suite uses (see docker.sh). Rerun it when the
# popup's look or the demo fixtures change, and commit the pictures.
set -e

IMAGE=mcr.microsoft.com/playwright:v1.63.0-noble
ROOT=$(cd "$(dirname "$0")/../.." && pwd)

docker run --rm --platform linux/amd64 --ipc=host \
  -v "$ROOT":/work -w /work \
  -v /work/node_modules \
  -v /work/apps/extension/node_modules \
  -v /work/apps/web/node_modules \
  -v /work/packages/shared/node_modules \
  -v echofocus-vrt-pnpm-store:/pnpm-store \
  -e VRT_IN_DOCKER=1 \
  "$IMAGE" \
  sh -c 'sh tests/visual/setup-container.sh && node tests/visual/build-extension.mjs && pnpm exec playwright test -c tests/visual/capture.config.ts'
