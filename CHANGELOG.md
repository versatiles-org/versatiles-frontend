# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.15.3] - 2026-09-22

### Code Refactoring

- update package dependencies for maplibre-svg-export and release-tool ([6937463](https://github.com/versatiles-org/versatiles-frontend/commit/69374635f87c77bb2cb35ebdf93e2eb878f2ec26))

### Chores

- update dependencies for release-tool, dotenv, and typescript-eslint ([1fcd110](https://github.com/versatiles-org/versatiles-frontend/commit/1fcd110f8012ff87c2b065166bab9cfd704f98f8))

## [3.15.2] - 2026-09-20

### Code Refactoring

- update map initialization to improve zoom handling and container reference ([2e4cf1b](https://github.com/versatiles-org/versatiles-frontend/commit/2e4cf1b32e1f8b0d708d0282aa62bb52b1af0435))
- update ESLint ignores to include Playwright and test results directories ([f3a9210](https://github.com/versatiles-org/versatiles-frontend/commit/f3a9210b3ae40642d4be0b59ab7ba93734a67357))
- adjust VersaTilesStylerControl visibility based on mobile screen size ([33861a2](https://github.com/versatiles-org/versatiles-frontend/commit/33861a219f031926a76b2fa88780d8675052674d))
- update Playwright snapshot images for Chromium on Darwin and Linux ([2aa17e9](https://github.com/versatiles-org/versatiles-frontend/commit/2aa17e98c81d1ff8a2b04f4218dc53a55055373e))

## [3.15.1] - 2026-09-20

### Code Refactoring

- remove italic faces from font families and update related tests ([73ed2bc](https://github.com/versatiles-org/versatiles-frontend/commit/73ed2bc3b44d28236ae67820c466bb167fc2b43f))

## [3.15.0] - 2026-09-20

### Features

- add metadata panel for tile source information in preview, close #69 ([0b5bec1](https://github.com/versatiles-org/versatiles-frontend/commit/0b5bec12dadabeef6071336d0fc20782be4d8aa4))
- implement hardlink support for tarball entries to reduce duplication, close #84 ([4cc29eb](https://github.com/versatiles-org/versatiles-frontend/commit/4cc29eb8650ebd3cb23873797de55f817bc00d10))
- add limitFontFamiliesCodeblocks function to filter codeblocks by maxCodepoint and update related tests ([66eea1d](https://github.com/versatiles-org/versatiles-frontend/commit/66eea1d7d425efa2222027b441fe33ac0131ff49))
- add support for zstd-compressed tarballs and update related configurations and tests ([75bb22a](https://github.com/versatiles-org/versatiles-frontend/commit/75bb22a20be3324ecb0fb0e38d9ded549a6fa593))
- add support for Zstandard-compressed tarballs, update related functions and tests ([df3cc98](https://github.com/versatiles-org/versatiles-frontend/commit/df3cc98771295924b0aed9cc44341f69ba5e6c3d))
- update README and tests to clarify hardlink usage in tarball bundles ([63d3050](https://github.com/versatiles-org/versatiles-frontend/commit/63d305055ccc46ee8eb14bf7c13bfcfac188cbbe))
- refactor emptyGlyphPbf function to remove parameters and update related tests, close #85 ([2150e12](https://github.com/versatiles-org/versatiles-frontend/commit/2150e12b54a8e6914b1ead5747d9ee2f44e8cd50))
- update sprite tests to reflect new structure in versatiles-style v6 ([b6f6f7f](https://github.com/versatiles-org/versatiles-frontend/commit/b6f6f7f3e42355e05b388ef10ceeb8a3b8e3269e))
- enhance zstd compression settings with long-distance matching and window log configuration, close #86 ([533cd58](https://github.com/versatiles-org/versatiles-frontend/commit/533cd58076b8f59d4aa5524613d9804cfed82deb))
- add maplibre-gl-compare to bundles and update related tests ([ad0b42c](https://github.com/versatiles-org/versatiles-frontend/commit/ad0b42c0df24177f6eba1bf20ed1945605fc93f5))
- enhance tag verification in release workflow to ensure package.json version matches pushed tag ([bac08c9](https://github.com/versatiles-org/versatiles-frontend/commit/bac08c94d58bbb641cf8015ea7e75cbbaca06dde))
- add cache management commands and tests ([5ae9afb](https://github.com/versatiles-org/versatiles-frontend/commit/5ae9afb079ca95b0034c9a692d65115dca67a0e8))

### Bug Fixes

- improve version resolution logic to handle GitHub API rate limits and enhance warning messages ([1d9642c](https://github.com/versatiles-org/versatiles-frontend/commit/1d9642ccc25bf79f0bd2beca17c7587e2cd8a5ef))
- update cache key generation to ensure distinct filenames for similar keys and improve sanitization logic ([08bf856](https://github.com/versatiles-org/versatiles-frontend/commit/08bf8567dad1be6b92bbb29ccdac18062d7e37a0))
- update coverage include pattern to only target TypeScript files ([192b60a](https://github.com/versatiles-org/versatiles-frontend/commit/192b60ac4beaa94c5dc4b723dab8b8749f06c0fb))
- update package description and repository information in package.json ([68aacf9](https://github.com/versatiles-org/versatiles-frontend/commit/68aacf98e2e300e190df1894db0bbc8d09ea25ba))

### Code Refactoring

- update File class to use content-based hashing and improve cache handling in compression ([d08c255](https://github.com/versatiles-org/versatiles-frontend/commit/d08c255a91f18059c8630ad600bc87d176c9f187))
- improve error handling in server request processing and update ESLint configuration for better type awareness ([8e95edf](https://github.com/versatiles-org/versatiles-frontend/commit/8e95edf0113b999ec36b477ef6b0ecc5aa96b567))
- enhance cache cleanup logging for better clarity ([0b8b4e5](https://github.com/versatiles-org/versatiles-frontend/commit/0b8b4e51319cb37b4c912c2f9e51d337b01d3d69))
- replace hard assertions with soft assertions in bundle contents tests ([b054948](https://github.com/versatiles-org/versatiles-frontend/commit/b0549485a3902a6862abd9b3ed61add26da76616))
- update cache folder path definition to support environment variable ([e5f5370](https://github.com/versatiles-org/versatiles-frontend/commit/e5f5370ef253fd7bfc2295de2eb0e4ec772f0290))
- improve test cleanup and organization in frontend and server tests ([3e91e4a](https://github.com/versatiles-org/versatiles-frontend/commit/3e91e4a35561571ccdbe0418a1686a47e52904d9))
- remove hasRelease check and improve error handling for missing release files ([23066d9](https://github.com/versatiles-org/versatiles-frontend/commit/23066d94bb98318df17d293acf92395453927429))
- improve progress display handling by replacing screen clearing with relative redraws ([32bfc3c](https://github.com/versatiles-org/versatiles-frontend/commit/32bfc3c3210c63883b9ee42dfbbddff933af72e8))
- implement progress failure handling and update build error reporting ([4e0276b](https://github.com/versatiles-org/versatiles-frontend/commit/4e0276b5099c06073c1f73d49011b5aeb037faa8))
- enhance content type handling for file responses in server ([ca8ff15](https://github.com/versatiles-org/versatiles-frontend/commit/ca8ff15473eaf0b1515a8d40641eac497c2c68c8))
- improve port allocation tests to enhance reliability and clarity ([b56d61b](https://github.com/versatiles-org/versatiles-frontend/commit/b56d61bad44edd6e3c0f3b23ab4dbc77e413d9c5))
- update VersaTilesStylerControl to start collapsed for better UX ([5c7f317](https://github.com/versatiles-org/versatiles-frontend/commit/5c7f3173635e4ec9ba54f9521068a3a9848f0f0c))

### Documentation

- Add dependency graph SVG and update README ([c55137f](https://github.com/versatiles-org/versatiles-frontend/commit/c55137f4fb485a890fc7b4bef618f82945317234))
- add 'frontend-blank' option to available frontends in README ([3d619ba](https://github.com/versatiles-org/versatiles-frontend/commit/3d619ba5368a12b0def20a0190e1e4fb5f33ace4))

### Tests

- add README validation tests to ensure frontend configurations are accurately documented ([803cdbd](https://github.com/versatiles-org/versatiles-frontend/commit/803cdbd2215368289fafa7d4b47704edae8a9027))
- replace random wait with deterministic tick function in async tests ([8a05d16](https://github.com/versatiles-org/versatiles-frontend/commit/8a05d16eefe13efc9b4977f8878c5c7f09acc744))
- add tests for esbuild bundling step in NpmFileDB.build ([54860e1](https://github.com/versatiles-org/versatiles-frontend/commit/54860e1a1ab43508eb172938f0cf2ce82cde86a2))

### Chores

- add security update groups for GitHub Actions and npm in dependabot configuration ([de49ae9](https://github.com/versatiles-org/versatiles-frontend/commit/de49ae9cb6c127798746335563c2b82a1f5fc5b9))
- update dependencies in package.json ([55b912e](https://github.com/versatiles-org/versatiles-frontend/commit/55b912e3878e5712c71f4bddfe2cd244a8ab5269))
- update qs package to version 6.16.0 ([83330cf](https://github.com/versatiles-org/versatiles-frontend/commit/83330cfa160ed3090f8c17b8c9e2928a286b4cd3))
- update dependencies in package.json ([00c10c0](https://github.com/versatiles-org/versatiles-frontend/commit/00c10c0b3dc487b119e9f1c8254009e2a1e9e5fa))
- update dependencies to latest versions ([b80c8a6](https://github.com/versatiles-org/versatiles-frontend/commit/b80c8a6c1c0e055bd413f1da67bc6ea7b02784a9))
- update screenshot snapshots for Chromium on Darwin and Linux ([540330e](https://github.com/versatiles-org/versatiles-frontend/commit/540330ee6b09ac0ce528ca052584fa4fbd9a612e))

## [3.14.0] - 2026-08-15

### Features

- implement ESM bundling for MapLibre GL and update source configuration
- implement shared geocoder functionality and update frontend assets
- enhance server start method to return actual listening port and log URL
- implement landing page for development server to list active frontends and their ports
- replace MapLibre geocoder with custom VersaTiles geocoder and update related tests
- enhance cache functionality with maxAgeMs support and add related tests
- implement caching for GitHub release version retrieval with key differentiation for stable and prerelease
- add documentation check to CI workflow to ensure README is up to date
- add tests for file serving with spaces and non-ASCII characters, and improve path decoding logic
- update end-to-end snapshot update script for Linux compatibility
- add tests for pinned version handling in ExternalFileDB and enhance fetch response mock

### Bug Fixes

- ensure GH_TOKEN is set in the environment for workflow execution
- update funding information to reflect organization details
- simplify package resolution logic in NpmFileDB
- update SVG renderer configuration in sourceConfigs
- update @versatiles/svg-renderer to version 1.1.0 in package.json and package-lock.json
- replace URL constructor with path.resolve for consistent folder path resolution
- skip draft releases in getLatestGithubReleaseVersion function
- replace deprecated url.resolve with posix.join for path handling in server
- update playwright docker image versioning in test:e2e:browser:update-linux script
- enhance typecheck script to include Playwright configuration
- add typecheck step to CI workflow and update lint script
- add engines field to specify required Node.js version
- update compress method to return compressed buffer and improve tarball handling
- defer script loading for improved performance and ensure DOM readiness
- add log level to prettier commands for better output control
- correct releaseDir path resolution to use resolve instead of URL

### Code Refactoring

- remove unused code
- move geocoder
- remove MapLibre GL Geocoder from source and frontend configurations
- remove bin entry for versatiles-frontend from package.json
- update diagram structure in README for improved clarity and organization

### Tests

- update geocoder tests to reflect frontend changes and clarify conditions
- optimize brotli bundle tests by reusing regular bundle file lists

### Chores

- **deps:** bump actions/setup-node from 6 to 7 in the action group
- update dependencies in package.json

## [3.13.1] - 2026-07-08

### Features

- adjust VersaTilesStylerControl visibility based on mobile screen size

### Bug Fixes

- ensure release is a draft during asset upload and handle re-runs

### Styles

- update geocoder position and responsiveness for better layout on narrow screens

## [3.13.0] - 2026-07-08

### Features

- add styling for location search bar positioning in map view
- implement file transformation logic in Frontend class and add tests for emptyGlyphPbf
- improve fetchRetry to clear timeout timer and prevent uncaught exceptions

### Tests

- update expected count for noto_sans files in bundle contents test

### Chores

- update Playwright screenshot snapshots for Chromium on Darwin and Linux
- update dependencies in package.json

## [3.12.0] - 2026-07-02

### Features

- implement fetchRetry utility for enhanced fetch handling with retries and timeouts
- implement safeJoinDest utility to prevent path traversal vulnerabilities
- implement atomic file writes in cache function to prevent data corruption
- update getLatestGithubReleaseVersion to fetch up to 100 releases and handle tags without 'v' prefix
- ensure progress label ends even when wrapped functions throw errors
- limit concurrency in parallel execution using forEachAsync to prevent unbounded connections
- add deduplication of overlapping filenames in Frontend class
- add support for maplibre-gl-geocoder in bundle contents and configuration, close #74
- add maplibre-gl-geocoder support for location search in frontend files, close #71

### Bug Fixes

- update npm audit command to check full dependency tree for vulnerabilities
- remove redundant progress end call in generateFrontend function
- update playwright version in test:e2e:browser:update-linux script

### Code Refactoring

- simplify mapping of frontend configurations in generateFrontends function
- improve handling of asynchronous file writes in ungzipUntar and unzip methods
- enhance file change handling in StaticFileDB with robust update logic
- simplify folder creation logic in ensureFolder function
- remove unused TypeScript compiler options from tsconfig.json
- update flowchart structure in README.md for better clarity

### Tests

- add proxy error handling tests for upstream responses
- update expected counts and sizes for glyph assets in bundle-contents test, because of new font release
- update e2e and screenshots

### Chores

- **deps-dev:** bump the npm group with 7 updates
- update Docker release workflow inputs to include build_planetiler
- **deps:** bump the action group with 2 updates
- update dependencies in package.json
- remove pre-commit hook for formatting and linting checks

## [3.11.4] - 2026-05-30

### Chores

- remove build cache restoration step from workflow

## [3.11.3] - 2026-05-30

### Chores

- update Docker release trigger inputs for more granular control
- update dependencies to latest versions

## [3.11.2] - 2026-05-24

### Chores

- update maplibre-versatiles-styler to version 1.3.0
- update maplibre-versatiles-styler to version 1.3.1

## [3.11.1] - 2026-05-22

### Chores

- **deps:** bump the action group with 2 updates
- **deps-dev:** bump the npm group with 5 updates
- update dependencies to latest versions

## [3.11.0] - 2026-04-27

### Features

- add build cache restoration step in CI and release workflows
- implement build-and-test workflow and refactor CI and release workflows

### Bug Fixes

- create release as draft if it doesn't exist

### Code Refactoring

- simplify File class hash generation and update related tests

### Chores

- **deps:** update dependencies to latest versions

### Other Changes

- added locate me button in frontends added tests

## [3.10.2] - 2026-04-05

### Bug Fixes

- adjust map bounds for better visibility in frontend previews

## [3.10.1] - 2026-04-05

### Chores

- **deps:** bump codecov/codecov-action from 5 to 6 in the action group
- update dependencies in package.json

## [3.10.0] - 2026-03-03

### Features

- **frontend:** add 'frontend-blank' configuration and update related tests

## [3.9.1] - 2026-03-02

### Chores

- **deps:** bump actions/upload-artifact in the action group
- **deps-dev:** bump the npm group with 7 updates
- **deps:** update dependencies for improved compatibility and performance
- **deps:** remove unused Rollup and TS dependencies from package.json and package-lock.json
- **scripts:** add typecheck command to the check script

## [3.9.0] - 2026-02-22

### Features

- add descriptions to frontend configurations and update generation notes
- update bundle names to use frontend configurations dynamically
- update frontend-tiny configuration and add tests
- implement file caching for tile proxy requests
- integrate SCREENSHOT_LOCATION into frontend tests and use it for all screenshots

### Bug Fixes

- update npm audit command to omit dev dependencies
- update glyphs folder grouping in overview generation
- update formatSize function to handle zero and small values correctly
- update generateOverview to include compressed archive sizes when dstFolder is provided
- remove frontend-min configuration and associated HTML file
- remove rename configuration for fonts.json in sourceConfigs
- add filter functionality to FrontendConfig and update ignoreFilter logic
- add frontend-tiny configuration and update related tests
- refactor ignoreFilter initialization to use buildFilter method
- enhance file verification and counting in Bundles and PrefixedBundles classes
- refactor bundle tests to improve structure and assertions
- refactor size assertions in bundle tests to use expectMinSizes function
- refactor maplibre-gl tests to improve file assertions and structure
- make frontend-tiny even smaller
- remove external-maplibre-versatiles-styler from frontendConfigs
- remove ignored patterns from frontendConfigs
- add frontend-min assertions for sprite counts and sizes
- update lint script to include TypeScript check and add exclude pattern in tsconfig
- make notes optional in ExternalSourceConfig and wrap notes handling in a conditional
- add external-sprites and external-versatiles-style to sourceConfigs and frontendConfigs
- update generateOverview to return ASCII table, and print file sizes in KB
- replace notes with source object in external source configurations
- update release notes format to include version in labels
- update bundle contents tests to reflect absence of styles and remove external-styles configuration
- update type casting for __mapIdle in frontend tests feat: add tsconfig.json for TypeScript configuration in Playwright tests

### Documentation

- update frontend descriptions in README and clarify available options

### Chores

- update dependencies in package.json

## [3.8.0] - 2026-02-19

### Features

- add SVG renderer and export control to preview and index pages

### Chores

- update npm-check-updates to version 19.4.0

## [3.7.2] - 2026-02-18

### Bug Fixes

- update @versatiles/svg-renderer to version 0.5.2

## [3.7.1] - 2026-02-18

### Chores

- update dependencies and devDependencies in package.json

## [3.7.0] - 2026-02-16

### Features

- add overview generation for frontend assets and update bundling process
- add coverage configuration to Vitest setup
- add append method to ReleaseNotes and update generateFrontend to use it
- update asset overview header to use ## for consistency
- add external SVG renderer configuration and update dependencies

### Bug Fixes

- update markdown headings in release notes and overview generation for consistency
- update external SVG renderer configuration for correct file inclusion and renaming

### Tests

- add unit tests for formatSize and generateOverview functions
- improve Bundles and PrefixedBundles classes for better file handling and verification

### Chores

- update badge formatting in README.md for consistency
- update dotenv and maplibre-versatiles-styler dependencies to latest versions

## [3.6.1] - 2026-02-11

### CI/CD

- verify tag before releasing

### Chores

- update version to 3.6.0 in package.json and package-lock.json, and add changelog
- update dependencies for @versatiles/release-tool, maplibre-gl, and maplibre-versatiles-styler

## [3.6.0] - 2026-02-10

### Features

- add source configuration interfaces and functions
- refactor source configuration to use dynamic sources and improve asset management
- refactor ExternalFileDB to use ExternalSourceConfig and streamline asset fetching
- rename loadFileDBConfigs to loadSourceConfigs
- add external source configurations for various assets in tests
- add end-to-end tests for bundle contents and utility functions
- enhance bundle content tests with new utility functions for file grouping and filtering
- update bundle content tests to reflect new theme and sprite set expectations
- add build and e2e test steps to CI and release workflows
- implement NpmFileDB for handling npm package assets and update related configurations
- update maplibre configuration to use npmSource and enhance package version check
- switch maplibre-versatiles-styler to npmSource and update package references
- update husky hooks to run tests and add pre-commit checks for formatting and linting
- enhance CI workflow by adding formatting checks and improving vulnerability audit level
- improve release workflow by enhancing step names and adding caching for node modules
- optimize CI and release workflows by enabling npm caching for node modules
- update type definitions for Frontend constructor parameters in build tests
- update mock calls to use vi.mocked for getLatestGithubReleaseVersion
- refactor ungzipUntar method to improve error handling and buffer management
- enhance error handling in proxy request to include 502 response on failure
- improve error handling in getLatestGithubReleaseVersion for API response validation
- enhance error handling in getLatestGithubReleaseVersion for unexpected API responses
- allow configurable port for server start method
- add configurable port option for development server start
- integrate Playwright for end-to-end testing with browser support
- improve Playwright tests with map instance interception and screenshot capabilities
- add initial screenshot for Playwright test on Chromium
- update frontend-min
- update tile metadata and improve map initialization in Playwright tests
- update viewport size for screenshots and adjust Playwright config for device scaling
- add Playwright snapshot update scripts for browser testing in Docker
- update dependencies for @versatiles/style, maplibre-versatiles-styler, and typescript-eslint

### Bug Fixes

- update tsconfig settings and adjust import paths for consistency
- correct module and moduleResolution settings in tsconfig
- reorder check script to ensure proper execution sequence
- correct equality check in unzip method to use strict comparison
- update Docker command for Playwright snapshot updates to include node_modules volume
- ensure ANSI color support only when output is a TTY

### Code Refactoring

- update mockFetchResponse to accept status parameter
- consolidate cache mocking across test files and remove unused mock files
- consolidate fs mocking into frontend.test.ts and remove unused mock files
- add mocks for release_version, release_notes, and utils modules; remove unused mock files
- replace progress module mocking with additional spies and constructors
- remove progress module mock file and integrate mocking directly in async.test.ts
- enhance progress module mocking in filedb-external.test.ts
- remove unused mock files for load, server, and express modules
- migrate the FileDB mocking modules
- move FileDB mocking from separate file to frontend test file
- integrate curl module mocking directly in filedb-external.test.ts
- consolidate Frontend mocking into build.test.ts and remove separate mock file
- enhance curl module mocking with filter callbacks and add comprehensive tests
- simplify bundle content tests and remove unused utility function
- remove RollupFileDB implementation and related tests.
- streamline file handling in Playwright fixtures by removing temporary directory usage
- update map initialization by removing hash option in index.html

### Tests

- add unit tests for curl, parallel, release_notes and release_version
- add unit tests for parseDevConfig and Server functionality

### Build System

- **deps:** bump actions/cache from 4 to 5 in the action group
- **deps-dev:** bump tar from 7.5.3 to 7.5.4

### Chores

- add .claude to .gitignore
- update dependencies in package.json
- upgrade dependencies
- update dependencies to latest versions
- update dependencies to latest versions
- update dependencies in package.json
- update dependencies for @types/node, @typescript-eslint, @versatiles/style, and maplibre-versatiles-styler

### Styles

- update format

