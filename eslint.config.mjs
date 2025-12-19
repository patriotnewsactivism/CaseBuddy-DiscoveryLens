import eslintConfigNext from 'eslint-config-next';

/**
 * Next.js 16 no longer ships a built-in `next lint` command.
 * Provide an explicit flat config so we can run ESLint directly.
 */
const config = [
  ...eslintConfigNext,
  {
    rules: {
      // Allow Next.js App Router structure without pages directory constraints
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default config;
