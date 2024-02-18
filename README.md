# VersaTiles Frontend

## generate and package frontend

```bash
git clone git@github.com:versatiles-org/versatiles-frontend.git
cd versatiles-frontend
npm install
npm run build
```

Generate 3 frontends:
- `frontend` complete with all styles, fonts, sprites, ...
- `frontend-rust` like `frontend` but also uses the `versatiles-rs` API. (not finished yet)
- `frontend-minimal` like `frontend` but without developer tools and only noto* fonts. (not finished yet)

For each frontend two files are build:
- `dist/frontend*.tar.gz` with all files in a gzipped Tar.
- `dist/frontend*.br.tar` where all files are precompressed with Brotli and packed in an uncompressed Tar.

You can use the release file with `versatiles-rs`
```bash
curl -L "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend-rust.br.tar" > ./frontend.br.tar
versatiles serve -s ./frontend-rust.br.tar "planet.versatiles"
```

## For Developers

Run the frontend in "developer mode"
```bash
npm run dev frontend
```

This will:
- fetch all assets (fonts, styles, sprites, libs, ...)
- build the selected frontend (you can run other frontends e.g. `npm run dev frontend-minimal`)
- server everything under `http://localhost:8080/`
- proxy tile requests
- and wait for any changes in `/frontends/`

## Content

- HTML and scripts from `src` folder
- fonts from [github.com/…/versatiles-fonts](https://github.com/versatiles-org/versatiles-fonts)
- styles from [github.com/…/versatiles-style](https://github.com/versatiles-org/versatiles-style)
- styles from [github.com/…/versatiles-sprites](https://github.com/versatiles-org/versatiles-sprites)
- maplibre-gl-js from [github.com/maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)
- maplibre-gl-inspect from [github.com/acalcutt/maplibre-gl-inspect](https://github.com/acalcutt/maplibre-gl-inspect)
- batteries are not included
