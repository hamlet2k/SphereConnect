const { override } = require('customize-cra');
module.exports = override(
  (config) => {
    config.devServer = {
      ...config.devServer,
      setupMiddlewares: (middlewares, devServer) => {
        return middlewares;
      },
    };
    return config;
  }
);