# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

