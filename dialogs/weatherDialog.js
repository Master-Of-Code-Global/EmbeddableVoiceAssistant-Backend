const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints } = require('botbuilder');
const { CardFactory } = require('botbuilder-core');
const { LocationDialog, LOCATION_DIALOG } = require('./locationDialog');
const moment = require('moment-timezone');
const { getRequestData } = require('../services/request');
const { weatherIcons } = require('../resources/icons');

const WEATHER_DIALOG = 'WEATHER_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WEATHER_PROMPT = 'WEATHER_PROMPT';
const MAIN_DIALOG = 'MainDialog';

class WeatherDialog extends ComponentDialog {
  constructor(luisRecognizer, userState, starter) {
    super(WEATHER_DIALOG);

    this.luisRecognizer = luisRecognizer;
    this.userProfile = userState.createProperty('userProfile');

    this.addDialog(new TextPrompt(WEATHER_PROMPT));
    this.addDialog(new LocationDialog(this.userProfile, this.luisRecognizer));
    this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
      this.getLocation.bind(this),
      this.returnWeather.bind(this),
      starter.showWeatherPossibilities.bind(this),
      starter.showDataStep.bind(this)
    ]));

    this.initialDialogId = WATERFALL_DIALOG;
  }

  async getWeatherDailyData(coordinates, duration, stepContext) {
    const url = process.env.DailyWeatherUrl + coordinates + '&duration=' + duration + '&subscription-key=' + process.env.WeatherSubscriptionKey;
    const options = {
      fullResponse: false
    };
    const responseData = await getRequestData(url, options);

    if (responseData.forecasts && responseData.forecasts.length > 0) {
      return responseData.forecasts;
    } else {
      await stepContext.context.sendActivity('It looks like the Weather service is not responding at the moment.', null, InputHints.IgnoringInput);
      await stepContext.context.sendActivity('Please check your Internet connection and try again later.', null, InputHints.IgnoringInput);
      return await stepContext.replaceDialog(MAIN_DIALOG);
    }
  }

  async getWeatherData(coordinates, stepContext) {
    const url = process.env.CurrentWeatherUrl + coordinates + '&subscription-key=' + process.env.WeatherSubscriptionKey;
    const options = {
      fullResponse: false
    };
    const responseData = await getRequestData(url, options);

    if (responseData.results && responseData.results.length > 0) {
      return responseData.results[0];
    } else {
      return await stepContext.replaceDialog(MAIN_DIALOG);
    }
  }

  async getWeatherQuarterData(coordinates, stepContext, duration) {
    const withDuration = duration ? `&duration=${ duration }` : '';
    const url = process.env.QuarterWeatherUrl + coordinates + '&subscription-key=' + process.env.WeatherSubscriptionKey + withDuration;
    const options = {
      fullResponse: false
    };
    const responseData = await getRequestData(url, options);

    if (responseData.forecasts && responseData.forecasts.length > 0) {
      return responseData.forecasts;
    } else {
      await stepContext.context.sendActivity('It looks like the Weather service is not responding at the moment.', null, InputHints.IgnoringInput);
      await stepContext.context.sendActivity('Please check your Internet connection and try again later.', null, InputHints.IgnoringInput);
      return await stepContext.replaceDialog(MAIN_DIALOG);
    }
  }

  async getCoordinates(city, countryCode, stepContext) {
    const withCountry = countryCode ? '&countrySet=' + countryCode : '';

    const url = process.env.CoordinatesUrl + city + '&subscription-key=' + process.env.WeatherSubscriptionKey + withCountry;
    const urlWithoutCountry = process.env.CoordinatesUrl + city + '&subscription-key=' + process.env.WeatherSubscriptionKey;
    const options = {
      fullResponse: false
    };
    const responseData = await getRequestData(url, options);

    if (responseData.results.length > 0) {
      return `${ responseData.results[0].position.lat },${ responseData.results[0].position.lon }`;
    } else {
      const cityData = await getRequestData(urlWithoutCountry, options);
      if (cityData.results.length > 0) {
        return `${ cityData.results[0].position.lat },${ cityData.results[0].position.lon }`;
      } else {
	      return await stepContext.replaceDialog(MAIN_DIALOG);
      }
    }
  }

  async getLocation(stepContext) {
    let userLocation = await this.userProfile.get(stepContext.context);
    if (!userLocation || (userLocation && !userLocation.location)) {
      userLocation = {
        location: {
          countryCode: undefined,
          city: undefined
        }
      };
      this.userProfile.set(stepContext.context, userLocation);
    }

    if (stepContext.options.weatherRequest.geographyV2) {
      const city = stepContext.options.weatherRequest.geographyV2[0].location;

      return stepContext.next({ city });
    } else {
      return await stepContext.beginDialog(LOCATION_DIALOG);
    }
  }

  async returnWeather(stepContext) {
    const userLocation = await this.userProfile.get(stepContext.context);

    let city;
    let countryCode;
    let weatherCard = {};

    if (stepContext.result !== undefined && stepContext.result.city) {
      const cityWords = stepContext.result.city.split(' ');
      for (let i = 0; i < cityWords.length; i++) {
        cityWords[i] = cityWords[i][0].toUpperCase() + cityWords[i].substr(1).toLowerCase();
      }
      city = cityWords.join(' ');
    } else if (userLocation.location && userLocation.location.city) {
      const cityWords = userLocation.location.city.split(' ');
      for (let i = 0; i < cityWords.length; i++) {
        cityWords[i] = cityWords[i][0].toUpperCase() + cityWords[i].substr(1).toLowerCase();
      }
      city = cityWords.join(' ');
      if (userLocation.location.countryCode) {
        countryCode = userLocation.location.countryCode;
      }
    } else {
      return await stepContext.replaceDialog(WEATHER_DIALOG);
    }

    const coordinates = await this.getCoordinates(city, countryCode, stepContext);

    if (stepContext.options && stepContext.options.weatherRequest && stepContext.options.weatherRequest.datetime) {
      const datetime = stepContext.options.weatherRequest.datetime[0];
      if (datetime.type === 'daterange') {
        // if (datetime.type === 'daterange' && datetime.timex.substr(4, 2) === '-W') {
        // const dailyWeather = await this.getWeatherDailyData(coordinates, 5);
        // weatherCard = await this.createDailyCard(city, dailyWeather);

        await stepContext.prompt(WEATHER_PROMPT, 'Sorry, I didn’t get that. Please try asking in a different way.');
        return await stepContext.replaceDialog(MAIN_DIALOG);
      } else if (datetime.type === 'date') {
        const weatherData = moment(datetime.timex[0]).format('YYYY-MM-DD');
        const today = moment().format('YYYY-MM-DD');
        const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD');

        if (weatherData === today) {
          const weatherCurrentData = await this.getWeatherData(coordinates, stepContext);
          const weatherQuarterData = await this.getWeatherQuarterData(coordinates, stepContext);

          weatherCard = await this.createCurrentCard(city, weatherCurrentData, weatherQuarterData);
        } else if (weatherData === tomorrow) {
          const tomorrowWeather = await this.getWeatherDailyData(coordinates, 5);
          const weatherQuarterData = await this.getWeatherQuarterData(coordinates, stepContext, 5);

          weatherCard = await this.createTomorrowCard(city, tomorrowWeather[1], weatherQuarterData);
        }
      }
    } else {
      const weatherCurrentData = await this.getWeatherData(coordinates, stepContext);
      const weatherQuarterData = await this.getWeatherQuarterData(coordinates, stepContext, undefined);

      weatherCard = await this.createCurrentCard(city, weatherCurrentData, weatherQuarterData);
    }

    await stepContext.context.sendActivity('Okay, here’s the weather you can expect:', 'Okay, here’s the weather you can expect:', InputHints.IgnoringInput);
    await stepContext.context.sendActivity({ attachments: [weatherCard] });

    return await stepContext.next();
  }

  createTomorrowCard(city, tomorrowWeather, weatherQuarterData) {
    const momentDate = moment(tomorrowWeather.date).format('YYYY-MM-DD');

    return CardFactory.adaptiveCard(
      {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.1',
        // "speak": "<s>Weather forecast...</s>",
        body: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: '25',
                items: [
                  {
                    type: 'Image',
                    url: process.env.WeatherIconsUrl + weatherIcons[tomorrowWeather.day.iconCode] + '.png',
                    size: 'Medium',
                    altText: tomorrowWeather.day.iconPhrase
                  }
                ]
              },
              {
                type: 'Column',
                width: 65,
                items: [
                  {
                    type: 'TextBlock',
                    text: city + ', ' + momentDate,
                    color: 'light',
                    size: 'Small',
                    spacing: 'None',
                    horizontalAlignment: 'Right'
                  },
                  {
                    type: 'TextBlock',
                    text: `${ Math.round(tomorrowWeather.temperature.minimum.value) } °C ... ${ Math.round(tomorrowWeather.temperature.maximum.value) } °C`,
                    size: 'Large',
                    spacing: 'None',
                    height: 'stretch'
                  },
                  {
                    type: 'TextBlock',
                    text: tomorrowWeather.day.shortPhrase,
                    spacing: 'None',
                    wrap: true,
                    height: 'stretch',
                    size: 'Small'
                  }
                ]
              }
            ]
          },
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Morning',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[4].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[4].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Afternoon',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[5].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[5].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Evening',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[6].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[6].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Overnight',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[7].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[7].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              }
            ],
            spacing: 'Medium'
          }
        ]
      }
    );
  }

  async createDailyCard(city, dailyWeather) {
    const momentDate = moment(dailyWeather.dateTime);

    return CardFactory.adaptiveCard(
      {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.0',
        // "speak": "<s>Weather forecast...</s>",
        body: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: '25',
                items: [
                  {
                    type: 'Image',
                    url: process.env.WeatherIconsUrl + weatherIcons[dailyWeather[0].iconCode] + '.png',
                    size: 'Medium',
                    altText: dailyWeather[0].phrase
                  }
                ],
                height: 'stretch',
                bleed: true
              },
              {
                type: 'Column',
                width: 65,
                items: [
                  {
                    type: 'TextBlock',
                    text: city + ', ' + momentDate.format('YYYY-MM-DD HH:mm A'),
                    color: 'light',
                    size: 'Small',
                    spacing: 'None',
                    horizontalAlignment: 'Right'
                  },
                  {
                    type: 'TextBlock',
                    text: `${ Math.round(dailyWeather[0].temperature.value) }` + '°C',
                    size: 'Large',
                    height: 'stretch'
                  },
                  {
                    type: 'TextBlock',
                    text: dailyWeather[0].phrase,
                    spacing: 'None',
                    wrap: true,
                    height: 'stretch',
                    size: 'Small'
                  }
                ]
              }
            ]
          },
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Morning',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[dailyWeather[1].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(dailyWeather[1].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Afternoon',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[dailyWeather[2].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(dailyWeather[2].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Evening',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[dailyWeather[3].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(dailyWeather[3].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Overnight',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[dailyWeather[4].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(dailyWeather[4].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              }
            ],
            spacing: 'Medium'
          }
        ]
      }
    );
  }

  async createCurrentCard(city, weatherCurrentData, weatherQuarterData) {
    const momentDate = moment(weatherCurrentData.dateTime);
    return CardFactory.adaptiveCard(
      {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.0',
        // "speak": "<s>Weather forecast...</s>",
        body: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: '25',
                items: [
                  {
                    type: 'Image',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherCurrentData.iconCode] + '.png',
                    size: 'Medium',
                    altText: weatherCurrentData.phrase
                  }
                ],
                height: 'stretch',
                bleed: true
              },
              {
                type: 'Column',
                width: 65,
                items: [
                  {
                    type: 'TextBlock',
                    text: city + ', ' + momentDate.format('YYYY-MM-DD HH:mm A'),
                    color: 'light',
                    size: 'Small',
                    spacing: 'None',
                    horizontalAlignment: 'Right'
                  },
                  {
                    type: 'TextBlock',
                    text: `${ Math.round(weatherCurrentData.temperature.value) }` + '°C',
                    size: 'Large',
                    spacing: 'None',
                    height: 'stretch'
                  },
                  {
                    type: 'TextBlock',
                    text: weatherCurrentData.phrase,
                    spacing: 'None',
                    wrap: true,
                    height: 'stretch',
                    size: 'Small'
                  }
                ]
              }
            ]
          },
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Morning',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[0].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[0].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Afternoon',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[1].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[1].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Evening',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[2].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[2].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              },
              {
                type: 'Column',
                width: 25,
                items: [
                  {
                    type: 'TextBlock',
                    horizontalAlignment: 'Center',
                    color: 'light',
                    wrap: false,
                    text: 'Overnight',
                    size: 'Small'
                  },
                  {
                    type: 'Image',
                    horizontalAlignment: 'Center',
                    size: 'Small',
                    url: process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[3].iconCode] + '.png',
                    altText: 'Drizzly weather'
                  },
                  {
                    type: 'TextBlock',
                    text: Math.round(weatherQuarterData[3].dewPoint.value) + '°',
                    size: 'Large',
                    horizontalAlignment: 'Center'
                  }
                ]
              }
            ],
            spacing: 'Medium'
          }
        ]
      }
    );
  }
}

module.exports.WEATHER_DIALOG = WEATHER_DIALOG;
module.exports.WeatherDialog = WeatherDialog;
