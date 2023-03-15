#!/bin/bash
cd "$(dirname "$0")"
set -e

cd ..

echo " -> prepare folders"
rm -rf dist
mkdir -p dist
cd dist

assets="frontend/assets"
mkdir -p $assets

echo " -> add fonts"
mkdir -p $assets/fonts
font_names=(noto_sans)
for i in "${font_names[@]}"
do
	fontname=${font_names[$i]}
	echo "    -> add $fontname"
	curl -L --no-progress-meter "https://github.com/versatiles-org/versatiles-fonts/releases/latest/download/$fontname.tar.gz" | gzip -d | tar -xf - -C $assets/fonts/
done

echo " -> add styles"
mkdir -p $assets/styles
curl -L --no-progress-meter "https://github.com/versatiles-org/versatiles-styles/releases/latest/download/styles.tar.gz" | gzip -d | tar -xf - -C $assets/styles/
../bin/process_styles.js $assets/styles/

echo " -> add maplibre"
mkdir -p $assets/maplibre
curl -L --no-progress-meter -o maplibre.zip https://github.com/maplibre/maplibre-gl-js/releases/latest/download/dist.zip
unzip -q maplibre.zip
mv dist/*.js $assets/maplibre/
mv dist/*.css $assets/maplibre/
mv dist/*.map $assets/maplibre/
rm -r dist
rm maplibre.zip

echo " -> add frontend"
cp -r ../src/* frontend/
