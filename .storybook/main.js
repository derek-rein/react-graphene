
const config = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/preset-scss',
    '@chromatic-com/storybook'
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {}
  },

  docs: {
    autodocs: true
  },

  async viteFinal(config) {
    config.plugins = config.plugins.filter(
      (plugin) =>
        !(Array.isArray(plugin) && plugin[0]?.name === "vite:dts") &&
        !(plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === "vite:dts")
    );
    return config;
  },
};

export default config;
