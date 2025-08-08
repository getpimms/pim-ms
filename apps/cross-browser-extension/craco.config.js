const path = require('path');
const { addPlugins } = require('@craco/craco');
const CopyPlugin = require('copy-webpack-plugin');

const resolveOwn = relativePath => path.resolve(__dirname, relativePath);

module.exports = {
  style: {
    postcss: {
      loaderOptions: {
        postcssOptions: {
          config: resolveOwn('postcss.config.js'),
        },
      },
    },
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
                // Configure multiple entry points for extension
          webpackConfig.entry = {
            main: webpackConfig.entry, // Use original CRA entry point
            popup: resolveOwn('src/popup/index.tsx'),
            background: resolveOwn('src/background/index.ts'),
            contentScript: resolveOwn('src/contentScript/index.ts'),
          };

      // Configure output for multiple bundles
      webpackConfig.output.filename = 'static/js/[name].bundle.js';
      webpackConfig.output.chunkFilename = 'static/js/[name].[chunkhash:8].chunk.js';
      
      // Set output path for development
      if (env === 'development') {
        webpackConfig.output.path = resolveOwn('dev');
      }

      // Disable code splitting for extension bundles
      webpackConfig.optimization.splitChunks = {
        cacheGroups: {
          default: false,
        },
      };
      webpackConfig.optimization.runtimeChunk = false;

       addPlugins(webpackConfig, [
        new CopyPlugin({
          patterns: [
            // Copy public files
            {
              from: resolveOwn('public'),
              to: webpackConfig.output.path,
              globOptions: {
                ignore: ['**/index.html']
              }
            }
            ]
        })
      ]);

      return webpackConfig;
    }
  },
  /**
   * Disable HMR for extension development
   */
  devServer: {
    hot: false,
    liveReload: false,
    devMiddleware: {
      writeToDisk: true
    },
    static: {
      directory: resolveOwn('dev')
    }
  }
};
