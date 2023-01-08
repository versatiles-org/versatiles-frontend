# frontend

## generate and package frontend

```bash
git clone git@github.com:opencloudtiles/opencloudtiles-frontend.git
cd opencloudtiles-frontend
npm install
npm run generate
npm run release
```

- Generates a `dist/frontend.tar.gz` with all files.
- Generates also `dist/frontend.br.tar.gz` where all files are precompressed with brotli.

You can use the release file e.g. like this:
```bash
mkdir frontend
curl -L "https://github.com/OpenCloudTiles/opencloudtiles-frontend/releases/latest/download/frontend.tar.gz" | gzip -d | tar -xf - -C ./frontend/
```

## content

- HTML and scripts from `src` folder
- fonts from [github.com/…/opencloudtiles-fonts](https://github.com/OpenCloudTiles/opencloudtiles-fonts)
- styles from [github.com/…/opencloudtiles-styles](https://github.com/OpenCloudTiles/opencloudtiles-styles)
- maplibre-gl-js from [github.com/maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)
- batteries are not included
