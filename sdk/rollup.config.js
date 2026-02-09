import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import packageJson from './package.json' with { type: 'json' };

function config() {
  return [
    {
      input: 'src/index.ts',
      output: {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: false
      },
      plugins: [
        nodeResolve(),
        replace({
          preventAssignment: true,
          __VERSION__: packageJson.version
        }),
        typescript({
          tsconfig: './tsconfig.json'
        })
      ]
    }
  ];
}

export default config;
