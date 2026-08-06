#!/bin/sh

set -eu

started_server=0

cleanup() {
	if [ "$started_server" -eq 1 ]; then
		pnpm astro dev stop >/dev/null 2>&1 || true
	fi
}

trap cleanup EXIT

pnpm astro dev --background --port 4325 --strictPort
started_server=1
pnpm playwright test
