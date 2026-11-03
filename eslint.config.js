import js from '@eslint/js';
import { vueTsConfigs, withVueTs } from '@vue/eslint-config-typescript';
import prettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

/**
 * Flat ESLint config for the whole monorepo.
 *
 * We deliberately run the *type-checked* rule sets: the project asks for strict
 * linting, and the rules that actually catch bugs (no-floating-promises,
 * no-misused-promises, no-unnecessary-condition) all need type information.
 *
 * `withVueTs` wires the same typescript-eslint rules into `.vue` files, so a
 * component's `<script setup>` and its template expressions are held to the
 * same standard as a plain `.ts` module.
 */
export default withVueTs(
  { rootDir: import.meta.dirname },

  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.ts',
      /*
       * The first iteration of the API, kept for reference while the new
       * `apps/` + `packages/` layout takes over. It predates this lint setup and
       * is not part of the workspace build - see README, "Migration".
       */
      'backend/**',
    ],
  },

  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.strictTypeChecked,
  vueTsConfigs.stylisticTypeChecked,

  {
    rules: {
      /* Allow `_`-prefixed throwaways - the convention is explicit enough. */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      /* Interfaces and type aliases are both fine; consistency here is noise. */
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  /* Node-side packages. */
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  /* Browser-side package. */
  {
    files: ['apps/web/**/*.{ts,vue}'],
    languageOptions: { globals: globals.browser },
    rules: {
      /* Props are typed with `defineProps<...>()`; runtime defaults would duplicate them. */
      'vue/require-default-prop': 'off',
      /* Every component is a page or a feature, named by its file. */
      'vue/multi-word-component-names': 'off',
    },
  },

  /* Tests may be looser: assertions and non-null access are idiomatic there. */
  {
    files: ['**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  prettier,
);
