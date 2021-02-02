let request = require('requestretry');



getRequestData = async (url, queryParams, headers) => {
  return await request.get({
    url,
    ...queryParams,
    json: true,
    maxAttempts: 3,
    retryDelay: 3000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
    headers
  });
}

module.exports = {
  getRequestData
}