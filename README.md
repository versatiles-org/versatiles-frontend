[![GitHub release](https://img.shields.io/github/v/release/versatiles-org/versatiles-frontend)](https://github.com/versatiles-org/versatiles-frontend/releases/latest)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/versatiles-frontend/total)](https://github.com/versatiles-org/versatiles-frontend/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/versatiles-frontend/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-frontend)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-frontend/ci.yml)](https://github.com/versatiles-org/versatiles-frontend/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# VersaTiles Frontend

VersaTiles Frontend provides pre-packaged web assets to serve interactive maps, compatible with [`versatiles-rs`](https://github.com/versatiles-org/versatiles-rs) or [`node-versatiles-server`](https://github.com/versatiles-org/node-versatiles-server). It follows the [VersaTiles Frontend Specification](https://docs.versatiles.org/compendium/specification_frontend.html)

## Available Frontends

- **frontend**: Full standard frontend with all fonts, sprites, and libraries.
- **frontend-dev**: Full standard frontend but with development-specific UI.
- **frontend-min**: Full standard frontend but with only Noto Sans fonts.
- **frontend-tiny**: Minimal frontend with sprites, MapLibre, VersaTiles style and Noto Sans fonts supporting only Latin characters.

See the [latest release notes](https://github.com/versatiles-org/versatiles-frontend/releases/latest) for details on included components and asset sizes.

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

This will generate all four frontends: `frontend`, `frontend-dev`, `frontend-min` and `frontend-tiny`.

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
subgraph 1["async_progress"]
2["async.ts"]
5["progress.ts"]
6["index.ts"]
end
subgraph 3["utils"]
4["parallel.ts"]
B["curl.ts"]
C["cache.ts"]
D["utils.ts"]
E["fetch.ts"]
F["release_notes.ts"]
G["release_version.ts"]
end
7["build.ts"]
subgraph 8["files"]
9["filedbs.ts"]
A["filedb-external.ts"]
H["filedb.ts"]
I["file.ts"]
J["safe-path.ts"]
K["filedb-npm.ts"]
L["filedb-static.ts"]
U["source_config.ts"]
end
subgraph M["frontend"]
N["generate.ts"]
O["frontend.ts"]
P["load.ts"]
Q["overview.ts"]
end
R["dev.ts"]
subgraph S["server"]
T["server.ts"]
end
end
2-->4
2-->5
6-->2
6-->5
7-->6
7-->9
7-->N
7-->F
7-->D
9-->6
9-->A
9-->K
9-->L
A-->B
A-->F
A-->G
A-->H
A-->J
B-->C
B-->E
C-->D
G-->E
H-->4
H-->I
I-->C
K-->F
K-->H
K-->J
L-->H
N-->6
N-->F
N-->O
N-->P
N-->Q
R-->6
R-->9
R-->O
R-->P
R-->T

class 0,1,3,8,M,S subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Resources

VersaTiles Frontend uses several external resources and libraries, including:

- Fonts from [VersaTiles Fonts](https://github.com/versatiles-org/versatiles-fonts)
- Styles and sprites from [VersaTiles Style](https://github.com/versatiles-org/versatiles-style)
- MapLibre GL JS from [MapLibre GL JS GitHub](https://github.com/maplibre/maplibre-gl-js)
- MapLibre GL Inspect from [MapLibre GL Inspect GitHub](https://github.com/maplibre/maplibre-gl-inspect)
