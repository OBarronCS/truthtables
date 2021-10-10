const path = require("path");
const common = require('./webpack.common.js');
const merge = require("webpack-merge");
const { CleanWebpackPlugin} = require('clean-webpack-plugin')
const MiniCSSExtractPlugin = require("mini-css-extract-plugin")

module.exports = merge(common, {
    "mode":"production",

    // I'm using this to speed up builds for testing
    optimization: {
        minimize: false,
    },

    output:{
        filename: "[name].[contentHash].js",
        path: path.resolve(__dirname,"dist")
    },
    plugins:[
        new MiniCSSExtractPlugin({ filename: "main.[contentHash].css" }),
        new CleanWebpackPlugin()
    ],
    module:{
        rules:[
            {
                test: /\.css$/,
                use:[MiniCSSExtractPlugin.loader,'css-loader']
            },
        ]
    }
});
