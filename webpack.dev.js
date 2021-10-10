const path = require("path");
const common = require('./webpack.common.js');
const merge = require("webpack-merge");

module.exports = merge(common, {
    "mode":"development",
    output:{
        filename: "[name].js",
        path: path.resolve(__dirname,"dist")
    },
    devServer: {
        watchContentBase: true,
    },
  
    module:{
        rules:[
        {
            test: /\.css$/,
            use:['style-loader','css-loader']
        },
        ]
    }

});
