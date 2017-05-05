const webpack = require('webpack');
module.exports = {

    devtool: 'cheap-module-source-map',

    entry: './web/main.js',

    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: 'babel'
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.(ttf|eot|svg|gif|woff(2)?)(\?[a-z0-9=&.]+)?$/,
                loader: 'url-loader'
            },
            {
                test: /\.html$/,
                loader: 'html'
            }]
    },
    resolve: {
        modulesDirectories: ['web', 'node_modules'],
        extensions: ['', '.js']
    },
    output: {
        path: __dirname + '/dist',
        filename: 'main.js',
        library: 'powergrid',
        libraryTarget: 'amd'
    },
    plugins: [
      new webpack.DefinePlugin({
          'process.env': {
              'NODE_ENV': JSON.stringify('production')
          }
      }),
      new webpack.optimize.UglifyJsPlugin()
    ]
};
