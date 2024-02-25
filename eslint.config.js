import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/dist/', '**/storybook-static/'],
  },
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      'import/order': [
        'error',
        {
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    },
  },
  prettierConfig,
);
