module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/preset-scss',
  ],
  babel: async (options) => ({
    ...options,
    plugins: ['@babel/plugin-transform-typescript', ...options.plugins],
  }),
};
