
const config = {
  stories: ['../src/**/*.mdx', './src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    '@storybook/addon-links',
    '@storybook/preset-scss',
    '@chromatic-com/storybook',
    '@storybook/addon-docs'
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {}
  },

  async viteFinal(config) {
    // Remove vite:dts plugin to avoid conflicts
    config.plugins = config.plugins.filter(
      (plugin) =>
        !(Array.isArray(plugin) && plugin[0]?.name === "vite:dts") &&
        !(plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === "vite:dts")
    );
    
    // Configure base path for GitHub Pages
    if (process.env.GITHUB_PAGES) {
      config.base = '/react-graphene/';
    }
    
    return config;
  }
};

export default config;
