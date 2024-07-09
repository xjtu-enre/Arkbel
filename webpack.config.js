const path =require('path');
module.exports = {
  entry: './packages//babel-parser//lib//index.js',
  output: {
    filename: 'parser.js',
    path: path.resolve(__dirname, 'dist_new'),
    hashFunction: "sha256",
    module: {
      rules: [
          {
              test: /\.css$/,//打包规则运用到以css为结尾的文件上
              use: ['style-loader','css-loader']
          }
      ]
  }
  }
}
