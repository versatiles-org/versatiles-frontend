import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';

export interface RollupConfig {
	frontend: string;
	input: string;
	output: string;
	drop: string[];
}

export async function build(input: string) {
	const bundle = await rollup({
		input,
		plugins: [typescript({
			lib: ['dom'],
			target: "es5",
			sourceMap: true,
			declaration: true,
			strict: true,
			noEmitOnError: true,
		})]
	});

	const result = await bundle.generate({

	});

	console.log(result);
}
