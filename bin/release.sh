#!/bin/bash
cd "$(dirname "$0")"

git push

cd ../dist/frontend

echo " -> list files"
find . -type f -not -name ".*" > ../files.txt

echo " -> tar.gz"
pv ../files.txt | tar -cf - --files-from - | gzip -9 > ../frontend.tar.gz

echo " -> brotli compress"
cat ../files.txt | shuf | parallel -n 16 --bar --eta "brotli -Zfj {}"

echo " -> br.tar.gz"
find . -type f -name "*.br" | tar -cf - --files-from - | gzip -9 > ../frontend.br.tar.gz
