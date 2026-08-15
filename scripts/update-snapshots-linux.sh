#!/usr/bin/env bash
#
# Regenerates the Playwright screenshot snapshots inside a Linux container.
#
# Snapshots are pixel comparisons, so they must be produced by the same browser build that
# CI compares against. Running `npm run test:e2e:browser:update` on macOS would write
# snapshots that CI then rejects.
#
set -euo pipefail

cd "$(dirname "$0")/.."

# Match the image to the Playwright that `npm ci` installs below - the lockfile, not the
# range in package.json, is what actually gets installed.
version=$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")

# The bind mount exposes the repo. The anonymous volume on top of node_modules hides the
# host's copy, so `npm ci` installs Linux binaries without overwriting the ones built for
# this machine.
exec docker run --rm \
	--volume "$PWD":/work \
	--volume /work/node_modules \
	--workdir /work \
	"mcr.microsoft.com/playwright:v${version}-noble" \
	bash -c 'npm ci && npm run test:e2e:browser:update'
