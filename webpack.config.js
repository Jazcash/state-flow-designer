const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    mode: process.env.ENV || 'development',
    devtool: 'inline-source-map',
    entry: {
        app: './src/main.ts',
    },
    output: {
        filename: '[name]-bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: [
                    /node_modules/
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: 'style-loader',
                        options: {
                            insert: 'head',
                            injectType: 'singletonStyleTag'
                        },
                    },
                    "css-loader",
                    "sass-loader"
                ],
            },
            {
                test: /\.mp3$/,
                loader: "file-loader",
                options: {
                    name: '[path][name].[ext]',
                },
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', ".css", ".scss"]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.htm"
        })
    ]
}