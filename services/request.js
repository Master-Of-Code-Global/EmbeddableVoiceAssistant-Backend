const request = require('requestretry');

getRequestData = async (uri, queryParams = {}, headers = {}) => {
  return await request.get({
    uri,
    ...queryParams,
    json: true,
    maxAttempts: 3,
    retryDelay: 3000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
    headers
  });
};

module.exports = {
  getRequestData
};
