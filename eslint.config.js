const js = require('@eslint/js');
const globals = require('globals');
const nextPlugin = require('@next/eslint-plugin-next');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  // Ignore stray files that should never be linted
  // - `test_check.js` and `coverage/**` are generated/test artefacts that
  //   would otherwise pollute lint output during CI.
  // - `.next/**` is the Next.js build cache (regenerated on every build).
  // - `node_modules/**` is third-party code.
  // - `src/declarations.d.ts` holds ambient declarations (no executable code).
  {
    ignores: [
      '**/test_check.js',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/src/declarations.d.ts',
      '**/src/lib/tests/**',
    ],
  },
  // Filter deprecated/removed rules that crash ESLint 10+ (e.g. no-unassigned-vars)
  (() => {
    const unsupported = new Set(['no-unassigned-vars', 'no-useless-assignment', 'preserve-caught-error']);
    const filteredRules = {};
    for (const [key, value] of Object.entries(js.configs.recommended.rules)) {
      if (!unsupported.has(key)) {
        filteredRules[key] = value;
      }
    }
    return { ...js.configs.recommended, rules: filteredRules };
  })(),
  // Next.js recommended rules (from @next/eslint-plugin-next, not the
  // eslint-config-next wrapper which exports an array incompatible with
  // direct plugin registration in flat config).
  {
    name: 'next/recommended',
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
  // TypeScript configuration
  {
    name: 'typescript/rules',
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unassigned-vars': 'off',
      'preserve-caught-error': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  // Shared globals for all source files (browser, Node, Jest, React, JSX)
  {
    name: 'shared/globals',
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
  },
];
