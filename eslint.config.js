import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'android',
    '*.mjs',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The app predates React Compiler lint rules and intentionally performs
      // state synchronization inside effects in many screens. Refactoring all
      // of those flows only to satisfy a new compiler recommendation would be
      // release-risky; keep correctness-oriented hook rules enabled instead.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',

      // Fast Refresh restrictions are development ergonomics, not a production
      // correctness gate. Existing provider/entry files intentionally export
      // helpers alongside components.
      'react-refresh/only-export-components': 'warn',

      // Legacy Supabase/third-party payload adapters still contain narrow any
      // casts. Surface them for cleanup without blocking a production release.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
])
