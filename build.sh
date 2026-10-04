#!/bin/sh
# Rebuilds the production 3D bundle: scene + three.js, tree-shaken and minified (~130 KB gzip vs ~270 KB).
# Needs esbuild once:  npm install --no-save esbuild   (then: npx esbuild ...)
set -e
cd "$(dirname "$0")"
ESBUILD="${ESBUILD:-npx esbuild}"
$ESBUILD assets/js/goshala-3d.js --bundle --minify --format=esm --target=es2020 --legal-comments=none \
  --alias:three=./assets/vendor/three/three.module.js --outfile=assets/js/goshala-3d.bundle.js
echo "built assets/js/goshala-3d.bundle.js"
