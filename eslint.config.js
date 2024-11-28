import js from '@eslint/js';
import ts from 'typescript-eslint';
import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	{
		ignores: [
			'**/cache/**/*.*',
			'**/dist/**/*.*',
			'**/coverage/**/*.*',
			'**/frontends/**/*.*',
		]
	},
	{
		files: [
			'**/src/**/*.ts',
		],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				browser: false,
				es6: true,
				node: true,
			},
		},
		plugins: {
			'@typescript-eslint': eslint_plugin,
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
					caughtErrorsIgnorePattern: '^_'
				}
			],
		}
	}
];
