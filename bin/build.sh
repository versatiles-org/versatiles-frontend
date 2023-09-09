#!/bin/bash
cd "$(dirname "$0")/.."
set -e

echo " -> prepare folders"
if [ -d "dist" ]; then
	rm -rf dist || true
fi
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
	curl -Ls "https://github.com/versatiles-org/versatiles-fonts/releases/latest/download/$fontname.tar.gz" | gzip -d | tar -xf - -C $assets/fonts/
done

echo " -> add styles"
mkdir -p $assets/styles
curl -Ls "https://github.com/versatiles-org/versatiles-styles/releases/latest/download/styles.tar.gz" | gzip -d | tar -xf - -C $assets/styles/
../bin/process_styles.js $assets/styles/

echo " -> add maplibre"
mkdir -p $assets/maplibre
curl -Lso maplibre.zip https://github.com/maplibre/maplibre-gl-js/releases/latest/download/dist.zip
unzip -q maplibre.zip
mv dist/*.js $assets/maplibre/
mv dist/*.css $assets/maplibre/
mv dist/*.map $assets/maplibre/
rm -r dist
rm maplibre.zip

echo " -> add maplibre-inspect"
mkdir -p $assets/maplibre-inspect
curl -Lso $assets/maplibre-inspect/maplibre-gl-inspect.min.js https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.4.6/maplibre-gl-inspect.min.js
curl -Lso $assets/maplibre-inspect/maplibre-gl-inspect.css https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.4.6/maplibre-gl-inspect.css

echo " -> add frontend"
cp -r ../src/* frontend/

echo " -> make release notes"

echo "   -> get version: frontend"
V_FRONTEND=v$(jq -r '.version' ../package.json)

echo "   -> get version: fonts"
V_FONTS=$(curl -s 'https://api.github.com/repos/versatiles-org/versatiles-fonts/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "   -> get version: styles"
V_STYLES=$(curl -s 'https://api.github.com/repos/versatiles-org/versatiles-styles/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "   -> get version: sprites"
V_SPRITES=$(curl -s 'https://api.github.com/repos/versatiles-org/versatiles-sprites/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "   -> get version: maplibre"
V_MAPLIBRE=$(curl -s 'https://api.github.com/repos/maplibre/maplibre-gl-js/tags' | jq -r 'first(.[] | .name | select(startswith("v")))')

echo "" > notes.md
echo "## VersaTiles Frontend *$V_FRONTEND*" >> notes.md
echo "" >> notes.md
echo "also includes:" >> notes.md
echo "- MapLibre GL JS *$V_MAPLIBRE*" >> notes.md
echo "- VersaTiles Fonts *$V_FONTS*" >> notes.md
echo "- VersaTiles Sprites *$V_SPRITES*" >> notes.md
echo "- VersaTiles Styles *$V_STYLES*" >> notes.md
