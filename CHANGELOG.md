# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

