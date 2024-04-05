[![Code Coverage](https://codecov.io/gh/versatiles-org/versatiles-frontend/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-frontend)
[![GitHub Workflow Status)](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-frontend/ci.yml)](https://github.com/versatiles-org/versatiles-frontend/actions/workflows/ci.yml)

# VersaTiles Frontend

VersaTiles Frontend is a dynamic, customizable frontend framework designed for interactive map and tile-based applications. It generates tar archives containing frontends that can directly used with e.g. `versatiles-rs` or `node-versatiles-server`.

## Getting Started

### Clone and Build

To get started with VersaTiles Frontend, clone the repository and install dependencies:

```bash
git clone git@github.com:versatiles-org/versatiles-frontend.git
cd versatiles-frontend
npm install
npm run build
```

This process will generate three distinct frontends:
- **frontend**: A complete set with all styles, fonts, sprites, etc.
- **frontend-rust**: Similar to `frontend`, with additional integration for the `versatiles-rs` API. (Work in progress)
- **frontend-minimal**: A lighter version of `frontend`, excluding developer tools and limited to Noto fonts. (Work in progress)

For each frontend, two files are generated:
- `release/frontend*.tar.gz`: Contains all files in a gzipped tar archive.
- `release/frontend*.br.tar`: Contains all files precompressed with Brotli and packed in an uncompressed tar archive.

### Using the Release with `versatiles-rs`

Deploy the frontend with `versatiles-rs` by downloading the latest release and serving it:

```bash
curl -L "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend-rust.br.tar" > ./frontend.br.tar
versatiles serve -s ./frontend.br.tar "planet.versatiles"
```

## Developer Guide

### Run in Developer Mode

To run a frontend in developer mode:

```bash
npm run dev frontend
```

Developer mode activates the following actions:
- Fetches all required assets (fonts, styles, sprites, libraries, etc.)
- Builds the selected frontend (alternative frontends can be run similarly, e.g., `npm run dev frontend-minimal`)
- Serves everything under `http://localhost:8080/`
- Proxies tile requests to facilitate local development
- Watches for any changes in the `/frontends/` directory and automatically rebuilds

## Project Structure

- **cache/**: Used for caching requests, file compression, etc.
- **frontends/**: Contains static files (HTML, CSS, JavaScript) for use in various frontends.
- **release/**: Stores finished release files.
- **src/**: Contains TypeScript code for generating frontends and optionally serving them locally.

## Resources

VersaTiles Frontend utilizes several external resources and libraries, including but not limited to:
- Fonts from [VersaTiles Fonts](https://github.com/versatiles-org/versatiles-fonts)
- Styles and sprites from [VersaTiles Style](https://github.com/versatiles-org/versatiles-style)
- MapLibre GL JS from [MapLibre GL JS GitHub](https://github.com/maplibre/maplibre-gl-js)
- MapLibre GL Inspect from [MapLibre GL Inspect GitHub](https://github.com/maplibre/maplibre-gl-inspect)

Note: Some external dependencies may require separate installations or configurations.
