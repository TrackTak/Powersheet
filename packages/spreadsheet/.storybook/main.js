module.exports = {
  stories: [
    '../src/stories/**/*.stories.mdx',
    '../src/stories/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-docs',
    '@storybook/addon-essentials',
    '@storybook/preset-scss'
  ],
  babel: async options => {
    return {
      ...options,
      plugins: options.plugins.filter(
        x => !(typeof x === 'string' && x.includes('plugin-transform-classes'))
      )
    }
  }
}
