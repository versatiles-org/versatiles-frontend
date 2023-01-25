#!/bin/bash
cd "$(dirname "$0")"

cd ..

echo " -> prepare folders"
rm -rf dist || true

mkdir -p dist/frontend/
cd dist/frontend/

echo " -> add fonts"
mkdir -p assets/fonts
curl -L --no-progress-meter "https://github.com/versatiles-org/versatiles-fonts/releases/latest/download/fonts.tar.gz" | gzip -d | tar -xf - -C assets/fonts/

echo " -> add styles"
mkdir -p assets/styles
curl -L --no-progress-meter "https://github.com/versatiles-org/versatiles-styles/releases/latest/download/styles.tar.gz" | gzip -d | tar -xf - -C assets/styles/

echo " -> add maplibre"
mkdir -p assets/maplibre
curl -L --no-progress-meter -o maplibre.zip https://github.com/maplibre/maplibre-gl-js/releases/latest/download/dist.zip
unzip -q maplibre.zip
cp dist/*.js assets/maplibre/
cp dist/*.css assets/maplibre/
cp dist/*.map assets/maplibre/
rm -r dist
rm maplibre.zip

echo " -> add frontend"
cp ../../src/* .
