const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints, MessageFactory } = require('botbuilder');
const { CardFactory, ActionTypes } = require('botbuilder-core');
const { LuisRecognizer } = require('botbuilder-ai');
const { LocationDialog, LOCATION_DIALOG } = require('./locationDialog');
const moment = require('moment-timezone');
const { getRequestData } = require('../services/request');

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
	constructor(luisRecognizer, userState, starter) {
		super(WEATHER_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		this.userProfile = userState;
		
		this.addDialog(new TextPrompt(WEATHER_PROMPT));
		this.addDialog(new LocationDialog(this.userProfile));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.getLocation.bind(this),
			this.returnWeather.bind(this),
			starter.showPossibilities.bind(this),
			starter.showDataStep.bind(this)
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}
	
	
	async getWeatherData(coordinates) {
		const url = process.env.CurrentWeatherUrl + coordinates +'&subscription-key=' + process.env.WeatherSubscriptionKey;
		const options = {
			fullResponse: false
		};
		const responseData = await getRequestData(url, options);
		
		if (responseData.results && responseData.results.length > 0) {
			return responseData.results[0];
		} else {
			return {};
		}
	}
	
	async getWeatherQuarterData(coordinates, stepContext) {
		
		const url = process.env.QuarterWeatherUrl + coordinates + '&subscription-key=' + process.env.WeatherSubscriptionKey;
		const options = {
			fullResponse: false
		};
		const responseData = await getRequestData(url, options);
		
		if (responseData.forecasts && responseData.forecasts.length > 0) {
			return responseData.forecasts;
		} else {
			await stepContext.context.sendActivity("Unfortunately, the Weather service is unavailable at the moment. Please try again later.", null, InputHints.IgnoringInput);
			return {};
		}
	}
	
	async getCoordinates(city, countryCode, stepContext) {
		let withCountry = countryCode ? '&countrySet='+countryCode : '';
		
		const url = process.env.CoordinatesUrl + city +'&subscription-key=' + process.env.WeatherSubscriptionKey + withCountry;
		const options = {
			fullResponse: false
		};
		const responseData = await getRequestData(url, options);
		
		if (responseData.results.length > 0) {
			return  `${responseData.results[0].position.lat},${responseData.results[0].position.lon}`;
		} else {
			return {};
		}
	}
	
	async getLocation(stepContext) {
		if (stepContext.options.weatherRequest.geographyV2) {
			const city = stepContext.options.weatherRequest.geographyV2[0].location;
			
			return stepContext.next({city});
		} else {
			return await stepContext.beginDialog(LOCATION_DIALOG);
		}
	}
	
	async returnWeather(stepContext) {
		let city = undefined;
		let countryCode = undefined;
		
		if (stepContext.result !== undefined && stepContext.result.city) {
			city = stepContext.result.city;
		} else if (this.userProfile.location && this.userProfile.location.city){
			city = this.userProfile.location.city;
			if (this.userProfile.location.countryCode) {
				countryCode = this.userProfile.location.countryCode;
			}
		} else {
			return await stepContext.beginDialog(WEATHER_DIALOG);
		}
		
		const coordinates = await this.getCoordinates(city, countryCode, stepContext);
		const weatherCurrentData = await this.getWeatherData(coordinates, stepContext);
		const weatherQuarterData = await this.getWeatherQuarterData(coordinates, stepContext);
		
		let momentDate = moment(weatherCurrentData.dateTime);
		
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
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherCurrentData.iconCode]+".png",
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
										"text": `${weatherCurrentData.temperature.value}` + "°C",
										"size": "ExtraLarge",
										"height": "stretch"
									},
									{
										"type": "TextBlock",
										"text": weatherCurrentData.phrase,
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
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[0].iconCode]+".png",
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
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[1].iconCode]+".png",
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
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[2].iconCode]+".png",
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
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[3].iconCode]+".png",
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
}

module.exports.WEATHER_DIALOG = WEATHER_DIALOG;
module.exports.WeatherDialog = WeatherDialog;
