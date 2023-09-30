# VersaTiles Frontend

## generate and package frontend

```bash
git clone git@github.com:versatiles-org/versatiles-frontend.git
cd versatiles-frontend
npm install
npm run generate
npm run release
```

- Generates a `dist/frontend.tar.gz` with all files.
- Generates also `dist/frontend.br.tar` where all files are precompressed with brotli.

You can use the release file e.g. like this:
```bash
mkdir frontend
wget "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.tar.gz"
gzip -dc frontend.tar.gz | tar -xf - -C ./frontend/
```

Or you can use the release file in `versatiles serve`
```bash
curl -L "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.br.tar" > ./frontend.br.tar
versatiles serve -s ./frontend.br.tar "planet.versatiles"
```

## develop

```bash
versatiles serve -i 127.0.0.1 -s ../versatiles-frontend/dist/frontend --minimal-recompression extract.versatiles hitzekarte.tar planet-latest.versatiles points.versatiles test.versatiles unfaelle_png.mbtiles vg250_gem_20201231.versatiles vg250_krs_20201231.versatiles
```

## content

- HTML and scripts from `src` folder
- fonts from [github.com/…/versatiles-fonts](https://github.com/versatiles-org/versatiles-fonts)
- styles from [github.com/…/versatiles-styles](https://github.com/versatiles-org/versatiles-styles)
- maplibre-gl-js from [github.com/maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)
- batteries are not included
