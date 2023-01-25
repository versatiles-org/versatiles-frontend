# frontend

## generate and package frontend

```bash
git clone git@github.com:versatiles-org/versatiles-frontend.git
cd versatiles-frontend
npm install
npm run generate
npm run release
```

- Generates a `dist/frontend.tar.gz` with all files.
- Generates also `dist/frontend.br.tar.gz` where all files are precompressed with brotli.

You can use the release file e.g. like this:
```bash
mkdir frontend
curl -L "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.tar.gz" | gzip -d | tar -xf - -C ./frontend/
```

## content

- HTML and scripts from `src` folder
- fonts from [github.com/…/versatiles-fonts](https://github.com/versatiles-org/versatiles-fonts)
- styles from [github.com/…/versatiles-styles](https://github.com/versatiles-org/versatiles-styles)
- maplibre-gl-js from [github.com/maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)
- batteries are not included
