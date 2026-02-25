import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import packageJson from './package.json' with { type: 'json' };

function config() {
  return [
    {
      input: 'src/index.ts',
      output: {
        dir: 'dist',
        format: 'esm',
        sourcemap: false,
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
      external: [
        '@juspay/neurolink',
        'better-sqlite3',
        'redis',
        '@aws-sdk/client-s3',
        'path',
        'fs',
      ],
      plugins: [
        nodeResolve(),
        replace({
          preventAssignment: true,
          __VERSION__: packageJson.version,
        }),
        typescript({
          tsconfig: './tsconfig.json',
        }),
      ],
    },
  ];
}

export default config;
