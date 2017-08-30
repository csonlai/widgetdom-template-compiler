const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const eventName = process.env.npm_lifecycle_event;

const configMap = {
  'build': {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'widgetdom-template-compile.min.js'
    }
  }
}



const config = {
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      }
    ]
  }
};

module.exports = Object.assign(config, configMap[eventName]);