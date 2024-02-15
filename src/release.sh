#!/bin/bash
cd "$(dirname "$0")"
set -e

cd ../dist/frontend

echo " -> list files"
find . -type f -not -name ".*" > ../files.txt

echo " -> tar.gz"
cat ../files.txt | tar -cf - --files-from - | gzip -9 > ../frontend.tar.gz

echo " -> brotli compress"
cat ../files.txt | shuf | parallel -n 16 "brotli -Zfj {}"

echo " -> br.tar"
find . -type f -name "*.br" | tar -cf - --files-from - > ../frontend.br.tar
