module.exports = {
  // ...existing configuration...
  module: {
    rules: [
      // ...existing rules...
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
        exclude: [/node_modules\/plotly.js/],
      },
    ],
  },
  // ...existing configuration...
};
