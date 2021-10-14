module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'], // Your TypeScript files extension
      parserOptions: {
        project: ['./tsconfig.json'], // Specify it only for TypeScript files
      },
    },
  ],
  env: { es6: true },
  ignorePatterns: ['node_modules', 'build', 'coverage', '.eslintrc.js'],
  plugins: ['import', 'eslint-comments', 'functional'],
  extends: [
    'eslint:recommended',
    'plugin:eslint-comments/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:functional/lite',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  globals: { BigInt: true, console: true, WebAssembly: true },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],
    'eslint-comments/no-unused-disable': 'error',
    'import/order': [
      'error',
      { 'newlines-between': 'always', alphabetize: { order: 'asc' } },
    ],
    'sort-imports': [
      'error',
      { ignoreDeclarationSort: true, ignoreCase: true },
    ],
    'import/order': 'off',
    'sort-imports': 'off',
    'functional/prefer-type-literal': 'off',
    'functional/prefer-readonly-type': 'off',
    'functional/no-class': 'off',
    'functional/no-this-expression': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'functional/no-loop-statement': 'off',
    'functional/immutable-data': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'functional/no-return-void': 'off',
    'functional/no-let': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    'functional/functional-parameters': 'off',
  },
};
