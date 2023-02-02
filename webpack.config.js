const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	mode: 'development',
	entry: './src/pa3.ts',
	output: {
		path: __dirname + '/dist',
		filename: 'bundle.js',
	},
	plugins: [
		new HtmlWebpackPlugin({
			// Also generate a test.html
			filename: __dirname + '/dist/index.html',
			template: __dirname + '/src/index.html',
		}),
	],
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{
				// 打包ts
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node-modules/,
			},
			{
				// 打包obj
				test: /\.(obj)$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'models/[name].[ext]',
						},
					},
				],
			},
		],
	},
};
