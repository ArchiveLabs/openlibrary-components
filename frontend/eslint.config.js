import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        location: 'readonly',
        history: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        customElements: 'readonly',
        CustomEvent: 'readonly',
        localStorage: 'readonly',
        AbortController: 'readonly',
        Promise: 'readonly',
        requestAnimationFrame: 'readonly',
        DOMException: 'readonly',
      },
    },
    rules: {
      'quotes': ['error', 'single', { avoidEscape: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Test files can use vitest globals
    files: ['src/**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
];
