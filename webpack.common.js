const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

module.exports = {
    entry: {
        main:"./src/index.ts",
    },
    plugins:[
        new HtmlWebpackPlugin({
            template:"./src/template.html",
            favicon: "./src/favicon.png",
            chunks: ["main"]
        }),
        new HtmlWebpackPlugin({
            filename: "debugger.html",
            template:"./src/template.html",
            chunks: ["debugger"]
        })
    ],
    resolve:{
    
        extensions:['.ts','.js'],
        // allows webpack to use TypeScript relative paths using baseUrl
        modules:[
            path.join(__dirname, "../"),
            "node_modules"
        ]
    },
    module:{
        rules:[
            // { 
            //     test: /\.ts$/,
            //     use:"ts-loader",
            //     exclude: /node_modules/
            // },
            { // https://github.com/privatenumber/esbuild-loader This is so much faster!
                test: /\.ts$/,
                loader: 'esbuild-loader',
                options: {
                    loader: 'ts',
                    target: 'es2020'
                }
            },
            { // making this seperate for some reason made Webpack not produce an error
                test: /\.json$/,
                loader: 'file-loader',
                type: 'javascript/auto',
                options: {
                    name: '[path][name].[ext]',
                    context: 'src'
                },
            },
            { // if later want to hash, look here for examples  https://webpack.js.org/loaders/file-loader/
                test: /\.(png|jpe?g|gif)$/,
                loader: 'file-loader',
                // outputs it to where it got it from!
                options: {
                    name: '[path][name].[ext]',
                    context: 'src'
                },
            },
        ],
        
    },
};
