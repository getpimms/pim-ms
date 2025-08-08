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
            background: resolveOwn('src/background/index.ts'),
            contentScript: resolveOwn('src/contentScript/index.tsx'),
            offscreen: resolveOwn('src/offscreen/index.ts'),
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

      // Add polyfills for Node.js modules used by @dub/utils
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
        "vm": require.resolve("vm-browserify")
      };

      // Provide global variables for polyfills
      const webpack = require('webpack');
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        }),
        // Inject env used by logger
        new webpack.DefinePlugin({
          'process.env.REACT_APP_BUILD_ENV': JSON.stringify(process.env.REACT_APP_BUILD_ENV || env),
          'process.env.NODE_ENV': JSON.stringify(env),
        }),
      ];

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

      // Ensure panel.css is available in dev build output (copy on rebuilds)
      webpackConfig.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: resolveOwn('public/panel.css'),
              to: webpackConfig.output.path,
              noErrorOnMissing: true,
              force: true
            }
          ]
        })
      );

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
