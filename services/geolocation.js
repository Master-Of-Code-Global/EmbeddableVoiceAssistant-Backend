const { getRequestData } = require('./request');

getCountryCodeByCoordinates = async (location) => {
  const params = `${ process.env.ReverseAddressSearch }&query=${ location }&subscription-key=${ process.env.WeatherSubscriptionKey }&language=en-US&number=1`;
  const addressResponse = await getRequestData(params);
  if (addressResponse.body.error) {
    return false;
  } else {
    return {
      countryCode: addressResponse.body.addresses[0].address.countryCode,
      city: addressResponse.body.addresses[0].address.municipality
    };
  }
};

module.exports = {
  getCountryCodeByCoordinates
};
