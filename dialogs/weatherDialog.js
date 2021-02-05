const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints, MessageFactory } = require('botbuilder');
const { ActivityTypes, CardFactory, ActionTypes } = require('botbuilder-core');
const { LuisRecognizer } = require('botbuilder-ai');
const { MainDialog } = require('./mainDialog');
const request = require('requestretry');
const moment = require('moment-timezone');

const NEWS_DIALOG = 'NEWS_DIALOG';
const WEATHER_DIALOG = 'WEATHER_DIALOG';
const JOKE_DIALOG = 'JOKE_DIALOG';

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WEATHER_PROMPT = 'WEATHER_PROMPT';

const weatherIcons = [
	'',
	'sunny',
	'sunny',
	'partly_sunny',
	'partly_sunny',
	'sunny',
	'partly_sunny',
	'cloudy',
	'dreary',
	'',
	'',
	'fog',
	'showers',
	'mostly_cloudy_with_showers',
	'mostly_cloudy_with_showers',
	'thunderstorms',
	'thunderstorms',
	'thunderstorms',
	'showers',
	'snow',
	'mostly_cloudy_with_showers',
	'mostly_cloudy_with_showers',
	'snow',
	'mostly_cloudy_with_showers',
	'sleer',
	'sleer',
	'showers',
	'showers',
	'sunny',
	'snow',
	'windy',
	'moon',
	'moon',
	'partly_cloudy',
	'partly_cloudy',
	'partly_cloudy',
	'partly_cloudy',
	'partly_cloudy_with_showers',
	'partly_cloudy_with_showers',
	'thunderstorms',
	'thunderstorms',
	'mostly_cloudy_with_flurrie',
	'mostly_cloudy_with_showers'
];

class WeatherDialog extends ComponentDialog {
	constructor(luisRecognizer) {
		super(WEATHER_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		
		this.addDialog(new TextPrompt(WEATHER_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.returnWeather.bind(this),
			this.choiceOptionStep.bind(this),
			this.showDataStep.bind(this)
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}
	
	getWeatherData(coordinates) {
		return request.get({
			url: process.env.CurrentWeatherUrl + coordinates +'&subscription-key=' + process.env.WeatherSubscriptionKey,
			maxAttempts: 3,
			retryDelay: 3000,
			retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
			fullResponse: false
		})
		.then(async function(body){
			if (body) {
				const response = await JSON.parse(body);
				return response.results;
			}
			
			return {};
		});
	}
	
	getWeatherQuarterData(coordinates) {
		// console.log('weather url: ', process.env.QuarterWeatherUrl + coordinates + '&subscription-key=' + process.env.WeatherSubscriptionKey);
		return request.get({
			url: process.env.QuarterWeatherUrl + coordinates + '&subscription-key=' + process.env.WeatherSubscriptionKey,
			maxAttempts: 3,
			retryDelay: 3000,
			retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
			fullResponse: false
		})
		.then(async function(body){
			if (body) {
				const response = await JSON.parse(body);
				return  response.forecasts;
			}
			
			return {};
		});
	}
	
	getCoordinates(city) {
		return request.get({
			url: process.env.CoordinatesUrl + city +'&subscription-key=' + process.env.WeatherSubscriptionKey,
			maxAttempts: 3,
			retryDelay: 3000,
			retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
			fullResponse: false
		})
		.then(async function(body){
			if (body) {
				const response = await JSON.parse(body);
				return  `${response.results[0].position.lat},${response.results[0].position.lon}`;
			}
			
			return {};
		});
	}
	
	async returnWeather(stepContext) {
		// console.log('returnWeather');
		let city = 'Cherkasy';
		
		if (stepContext.options.weatherRequest.geographyV2) {
			city = stepContext.options.weatherRequest.geographyV2[0].location;
		}
		
		const coordinates = await this.getCoordinates(city);
		const weatherCurrentData = await this.getWeatherData(coordinates);
		const weatherQuarterData = await this.getWeatherQuarterData(coordinates);
		
		console.log('City coord: ', city, coordinates);
		console.log('weatherQuarterData: ', weatherQuarterData);
		
		let momentDate = moment(weatherCurrentData[0].dateTime);
		
		// await stepContext.context.sendActivity('you wanna get the weather', null, InputHints.IgnoringInput);
		// await stepContext.context.sendActivity(stepContext.options.weatherType, null, InputHints.IgnoringInput);
		
		const weatherCard = CardFactory.adaptiveCard(
			{
				"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
				"type": "AdaptiveCard",
				"version": "1.0",
				"body": [
					{
						"type": "ColumnSet",
						"columns": [
							{
								"type": "Column",
								"width": 35,
								"items": [
									{
										"type": "Image",
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherCurrentData[0].iconCode]+".svg",
										"size": "Stretch",
										"altText": "Mostly cloudy weather"
									}
								]
							},
							{
								"type": "Column",
								"width": 65,
								"items": [
									{
										"type": "TextBlock",
										"text": city + ", "+ momentDate.format("YYYY-MM-DD HH:mm A"),
										"size": "Small",
										"spacing": "None",
										"horizontalAlignment": "Right"
									},
									{
										"type": "TextBlock",
										"text": `${weatherCurrentData[0].temperature.value}` + "°C",
										"size": "ExtraLarge",
										"height": "stretch"
									},
									{
										"type": "TextBlock",
										"text": weatherCurrentData[0].phrase,
										"spacing": "None",
										"wrap": true,
										"height": "stretch",
										"size": "Small"
									}
								]
							}
						]
					},
					{
						"type": "ColumnSet",
						"columns": [
							{
								"type": "Column",
								"width": 25,
								"items": [
									{
										"type": "TextBlock",
										"horizontalAlignment": "Center",
										"wrap": false,
										"text": "Morning",
										"size": "Small"
									},
									{
										"type": "Image",
										"size": "auto",
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[0].iconCode]+".svg",
										"altText": "Drizzly weather"
									},
									{
										"type": "TextBlock",
										"text": weatherQuarterData[0].dewPoint.value + "°",
										"size": "Large",
										"horizontalAlignment": "Center"
									}
								]
							},
							{
								"type": "Column",
								"width": 25,
								"items": [
									{
										"type": "TextBlock",
										"horizontalAlignment": "Center",
										"wrap": false,
										"text": "Afternoon",
										"size": "Small"
									},
									{
										"type": "Image",
										"size": "auto",
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[1].iconCode]+".svg",
										"altText": "Drizzly weather"
									},
									{
										"type": "TextBlock",
										"text": weatherQuarterData[1].dewPoint.value + "°",
										"size": "Large",
										"horizontalAlignment": "Center"
									}
								]
							},
							{
								"type": "Column",
								"width": 25,
								"items": [
									{
										"type": "TextBlock",
										"horizontalAlignment": "Center",
										"wrap": false,
										"text": "Evening",
										"size": "Small"
									},
									{
										"type": "Image",
										"size": "auto",
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[2].iconCode]+".svg",
										"altText": "Drizzly weather"
									},
									{
										"type": "TextBlock",
										"text": weatherQuarterData[2].dewPoint.value + "°",
										"size": "Large",
										"horizontalAlignment": "Center"
									}
								]
							},
							{
								"type": "Column",
								"width": 25,
								"items": [
									{
										"type": "TextBlock",
										"horizontalAlignment": "Center",
										"wrap": false,
										"text": "Overnight",
										"size": "Small"
									},
									{
										"type": "Image",
										"size": "auto",
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[3].iconCode]+".svg",
										"altText": "Drizzly weather"
									},
									{
										"type": "TextBlock",
										"text": weatherQuarterData[3].dewPoint.value + "°",
										"size": "Large",
										"horizontalAlignment": "Center"
									}
								]
							}
						]
					}
				]
			}
		);
		
		await stepContext.context.sendActivity({ attachments: [weatherCard] });
		
		return await stepContext.next();
	}
	
	async choiceOptionStep(stepContext) {
		const cardActions = [
			{
				type: ActionTypes.ImBack,
				title: 'What about tomorrow?',
				value: 'What about tomorrow?',
			},
			{
				type: ActionTypes.ImBack,
				title: 'Last news',
				value: 'Last news',
			},
			{
				type: ActionTypes.ImBack,
				title: 'Tell me a joke',
				value: 'Tell me a joke',
			}
		];
		
		const reply = MessageFactory.suggestedActions(cardActions);

		return await stepContext.prompt(WEATHER_PROMPT, { prompt: reply });
	}
	
	async showDataStep(stepContext){
		// await MainDialog.showDataStep(stepContext);
		
		// console.log('MainDialog.showDataStep: ', stepContext.result);

		if (!this.luisRecognizer.isConfigured) {
			return await stepContext.beginDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		
		// console.log('weather luisResult: ', luisResult);
		
		switch (LuisRecognizer.topIntent(luisResult)) {
			case 'NewsUpdate_Request':
				return await stepContext.beginDialog(NEWS_DIALOG, { newsType: luisResult.text });
			
			case 'WeatherForecast_Request':
			case 'QR_Weather_suggestion_chips':
				return await stepContext.beginDialog(WEATHER_DIALOG, { weatherRequest: luisResult.entities });
			
			case 'TellJoke_Request':
				return await stepContext.beginDialog(JOKE_DIALOG);
			
			default: {
				const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ stepContext.context.activity.text })`;
				return await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
			}
		}
	}
}

module.exports.WEATHER_DIALOG = WEATHER_DIALOG;
module.exports.WeatherDialog = WeatherDialog;
