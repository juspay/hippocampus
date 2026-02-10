import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Ignore build output and config files
  {
    ignores: ['dist/', 'node_modules/', 'rollup.config.js'],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...ts.configs.recommended,

  // Prettier — disables ESLint rules that conflict with Prettier
  prettier,

  // Project-specific rules
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // Unused imports — auto-fixable
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Require curly braces for all control statements
      curly: ['error', 'all'],

      // TypeScript — no-undef not needed with TS
      'no-undef': 'off',

      // Allow explicit any for SDK flexibility (warn, not error)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
