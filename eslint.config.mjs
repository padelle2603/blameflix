import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'www/**',
            'dist/**',
            'android/**',
            'electron/source/**',
            'node_modules/**'
        ]
    },
    {
        files: ['src/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser
            }
        }
    },
    {
        files: ['src/js/**/*.js'],
        rules: {
            ...js.configs.recommended.rules,
            // The codebase has zero console calls: keep it that way.
            'no-console': 'error',
            // Error handling intentionally swallows exceptions behind an
            // optional catch binding, so letting the caught error go unused
            // is an explicit pattern rather than a mistake.
            'no-unused-vars': ['error', { caughtErrors: 'none' }]
        }
    }
];