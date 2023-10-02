# VersaTiles Frontend

## generate and package frontend

```bash
git clone git@github.com:versatiles-org/versatiles-frontend.git
cd versatiles-frontend
npm install
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

## For Developers

Run the frontend in "watch mode"
```bash
npm run watch
```
This will build the frontend, wait for any changes in `/src/`, and automatically update the frontend in `/dist/frontend/`.

In a second terminal run the versatiles server locally. (change the filenames of the tiles sources)
```bash
versatiles serve -i 127.0.0.1 -s ../versatiles-frontend/dist/frontend --minimal-recompression map1.versatiles map2.tar map3.mbtiles
```

Now you can open `http://localhost:8080/` in a web browser. All changes in `/src/` will also be updated in the browser (after refresh, of course).

## Content

- HTML and scripts from `src` folder
- fonts from [github.com/…/versatiles-fonts](https://github.com/versatiles-org/versatiles-fonts)
- styles from [github.com/…/versatiles-styles](https://github.com/versatiles-org/versatiles-styles)
- maplibre-gl-js from [github.com/maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)
- batteries are not included
