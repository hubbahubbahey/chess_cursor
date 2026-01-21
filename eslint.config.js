import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
    { ignores: ['dist', 'dist-electron', 'release', 'eslint.config.js'] },
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
            ...prettierConfig.rules, // Use prettier config rules directly if possible or just rely on it disabling 
        },
    },
    // To use eslint-config-prettier properly in flat config, typically one just includes it at the end to disable rules
    // But since it's a config object, we can just spread it or add it as an element if it exports a flat config (it doesn't usually).
    // The standard way:
    {
        rules: {
            ...prettierConfig.rules
        }
    }
)
