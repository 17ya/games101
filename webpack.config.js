const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
	mode: 'development',
	entry: './src/pa3.js',
	output: {
		path: __dirname + '/dist',
		filename: 'build.js',
	},
	plugins: [
		new HtmlWebpackPlugin({
			// Also generate a test.html
			filename: __dirname + '/dist/index.html',
			template: __dirname + '/src/index.html',
		}),
	],
};
