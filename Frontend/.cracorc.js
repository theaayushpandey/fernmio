const { CracoAliasPlugin } = require('react-app-alias')
const path = require('path')
const webpack = require('webpack')

/**
 * @type {import("@craco/types").CracoConfig}
 */
module.exports = {
  plugins: [
    {
      plugin: CracoAliasPlugin,
      options: {},
    },
  ],
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      })

      return webpackConfig
    },
  },
  style: {
    postcss: {
      mode: 'file',
    },
  },
  devServer: {
    allowedHosts: 'all',
  },
}
