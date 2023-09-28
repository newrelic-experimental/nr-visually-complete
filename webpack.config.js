const path = require('path');
const webpack = require ('webpack');
const pkg = require("./package.json");

module.exports = {
    entry: './src/index.js',
    output: {
        filename: './nrvcm-' + pkg.version +'.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'nrvcm',
    },
    devtool: "source-map",
    module: {
        rules: [{
            test: /\.js$/,
            use: {
                loader: 'babel-loader'
            },
            include: path.resolve(__dirname, '../src')
        }]
    },
    plugins:[
        new webpack.DefinePlugin({
            "NODE_ENV":  JSON.stringify(process.env.NODE_ENV),
            "CODE_VERSION": JSON.stringify(pkg.version)
        }),
    ]
};
