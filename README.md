[![Code Coverage](https://codecov.io/gh/versatiles-org/versatiles-frontend/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-frontend)
[![GitHub Workflow Status)](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-frontend/ci.yml)](https://github.com/versatiles-org/versatiles-frontend/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/versatiles-org/versatiles-frontend)](https://github.com/versatiles-org/versatiles-frontend/releases/latest)
[![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/versatiles-org/versatiles-frontend/total)](https://github.com/versatiles-org/versatiles-frontend/releases/latest)

# VersaTiles Frontend

VersaTiles Frontend provides pre-packaged web assets to serve interactive maps, compatible with [`versatiles-rs`](https://github.com/versatiles-org/versatiles-rs) or [`node-versatiles-server`](https://github.com/versatiles-org/node-versatiles-server).

## Available Frontends

1. Standard Frontend

- Files: `frontend.*`
- Features: Includes all assets (styles, sprites, fonts, libraries) required for a standard map server.
- Assumes: Shortbread tiles are served under `/tiles/osm`.

2. Minimal Frontend

- Files: `frontend-min.*`
- Features: Reduced asset footprint, ideal for limited resources.
- Assumes: Shortbread tiles are served under `/tiles/osm`.

3. Development Frontend

- Files: `frontend-dev.*`
- Features: Includes all assets plus additional tools for development.
- index.html: Lists available map sources.
- preview\.html: Previews individual map sources.

## Download the latest release.

You can [download the packaged frontends as the latest release](https://github.com/versatiles-org/versatiles-frontend/releases/latest/). Packages ending with `*.tar.gz` contain the original web frontend files. Packages ending with `*.br.tar.gz` contain the web frontend files pre-compressed with Brotli for faster serving.

## Improve the frontends

### Clone and Build

Clone the repository, install dependencies and build:

```bash
git clone git@github.com:versatiles-org/versatiles-frontend.git
cd versatiles-frontend
npm install
npm run build
```

This will generate all three frontends: `frontend`, `frontend-dev` and `frontend-min`.

- `frontend*.tar.gz`: Standard gzip-compressed container.
- `frontend*.br.tar.gz`: Precompressed with Brotli for fast serving.

## Use a frontend with `versatiles-rs`

```bash
curl -L "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend-dev.br.tar.gz" -o ./frontend.br.tar.gz
versatiles serve -s ./frontend.br.tar.gz "osm.versatiles"
```

## Developer Guide

### Run in Developer Mode

Start the development server:

```bash
npm run dev frontend
# or:
# npm run dev frontend-min
# npm run dev frontend-dev
```

Features:

- Serves at <http://localhost:8080/>.
- Proxies tile requests to tiles.versatiles.org.
- Watches for file changes and auto-rebuilds.
- You can also use a local tile server from a different local port by running:

```sh
versatiles serve -p 8081 osm.versatiles overlay.versatiles
# then run this in another shell
npm run dev -- -l 8081 frontend-dev
```

## Project Structure

- **cache/**: Caches requests, compresses files.
- **frontends/**: Contains static files (HTML, CSS, JS).
- **release/**: Packaged frontend files.
- **src/**: TypeScript code for frontend generation and local serving.

### Dependency Graph

<!--- This chapter is generated automatically --->

```mermaid
---
config:
  layout: elk
---
flowchart TB

subgraph 0["src"]
1["build.ts"]
subgraph 2["files"]
3["filedbs.ts"]
7["filedb-external.ts"]
D["filedb.ts"]
F["file.ts"]
G["filedb-rollup.ts"]
H["filedb-static.ts"]
end
subgraph 4["utils"]
5["async.ts"]
6["progress.ts"]
8["curl.ts"]
9["cache.ts"]
A["utils.ts"]
B["release_notes.ts"]
C["release_version.ts"]
E["parallel.ts"]
end
subgraph I["frontend"]
J["generate.ts"]
K["frontend.ts"]
L["load.ts"]
end
M["dev.ts"]
subgraph N["server"]
O["server.ts"]
end
end
1-->3
1-->J
1-->5
1-->6
1-->B
1-->A
3-->5
3-->6
3-->7
3-->G
3-->H
5-->6
7-->8
7-->B
7-->C
7-->D
8-->9
9-->A
D-->E
D-->F
F-->9
G-->D
H-->D
J-->5
J-->6
J-->K
J-->L
M-->3
M-->K
M-->L
M-->O
M-->5
M-->6

class 0,2,4,I,N subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Resources

VersaTiles Frontend uses several external resources and libraries, including:

- Fonts from [VersaTiles Fonts](https://github.com/versatiles-org/versatiles-fonts)
- Styles and sprites from [VersaTiles Style](https://github.com/versatiles-org/versatiles-style)
- MapLibre GL JS from [MapLibre GL JS GitHub](https://github.com/maplibre/maplibre-gl-js)
- MapLibre GL Inspect from [MapLibre GL Inspect GitHub](https://github.com/maplibre/maplibre-gl-inspect)
