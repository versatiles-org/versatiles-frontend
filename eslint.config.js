import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(
	{
		ignores: ['cache/**/*.*', 'coverage/**/*.*', 'dist/**/*.*', 'frontends/**/*.js', 'release/**/*.*'],
	},
	js.configs.recommended,
	{
		// Type-aware linting, scoped to the sources that belong to a tsconfig. `projectService`
		// picks the nearest one, so e2e/playwright is checked against its own. Without type
		// information the rules that matter most here - no-floating-promises, await-thenable,
		// no-misused-promises - cannot run at all, and this codebase is almost entirely async.
		files: ['src/**/*.ts', 'frontends/**/*.ts', 'e2e/**/*.ts'],
		extends: [ts.configs.recommendedTypeChecked],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				browser: false,
				es6: true,
				node: true,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {
			'no-unused-vars': 'off', // Disable ESLint's no-unused-vars for TS
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			// An async function with no await is normal here: PromiseFunction's init/run pair and
			// the FileDB hooks are Promise-returning by contract, not because they all need to be.
			'@typescript-eslint/require-await': 'off',
			// forEachAsync re-propagates whatever a task threw. Wrapping a caught value in an
			// Error would replace the rejection reason the caller is entitled to see.
			'@typescript-eslint/prefer-promise-reject-errors': 'off',
		},
	},
	{
		// Test doubles are `any` by construction - vi.fn() stubs, partial fixture objects, and
		// `expect(mod.method)` assertions. These rules fire on the mocking, not on the code under
		// test, so they are waived here rather than papered over with casts.
		files: ['**/*.test.ts', 'e2e/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/unbound-method': 'off',
			// The rule and tsc disagree about `importOriginal()` in a vi.mock factory: the rule
			// reads its result as already typed, tsc as `unknown`. Removing the casts it calls
			// redundant makes `npm run typecheck` fail, so the compiler wins here.
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
		},
	},
	{
		// Config files and plain JS belong to no tsconfig, so type-aware rules cannot run there.
		files: ['**/*.js', '*.config.ts'],
		extends: [ts.configs.disableTypeChecked],
	}
);
