const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/sdk/PaymentGateway.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'checkout.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
