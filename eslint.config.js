import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Deno Edge Functions and Node build scripts run in different runtimes with
  // their own globals/types; they are linted/typed by their own toolchains.
  { ignores: ['dist', 'supabase/functions', 'scripts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Correctness rules stay hard errors (these catch real bugs).
      'react-hooks/rules-of-hooks': 'error',
      // Existing style debt is surfaced as warnings so it does not block CI while
      // it is paid down incrementally. Unused args/vars prefixed with _ are ignored.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-empty': 'warn',
      'no-useless-catch': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
    },
  }
);
