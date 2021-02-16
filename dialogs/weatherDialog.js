const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints, MessageFactory } = require('botbuilder');
const { CardFactory } = require('botbuilder-core');
const { LocationDialog, LOCATION_DIALOG } = require('./locationDialog');
const moment = require('moment-timezone');
const { getRequestData } = require('../services/request');
const { weatherIcons } = require('../resources/icons');
const { LuisRecognizer } = require('botbuilder-ai');

const WEATHER_DIALOG = 'WEATHER_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WEATHER_PROMPT = 'WEATHER_PROMPT';



class WeatherDialog extends ComponentDialog {
	constructor(luisRecognizer, userState, starter) {
		super(WEATHER_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		this.userProfile = userState;
		
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
			await stepContext.context.sendActivity("It looks like the Weather service is not responding at the moment.", null, InputHints.IgnoringInput);
			await stepContext.context.sendActivity("Please check your Internet connection and try again later.", null, InputHints.IgnoringInput);
			return {};
		}
	}
	
	async getCoordinates(city, countryCode) {
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
		if (this.userProfile.location && this.userProfile.location.city){
			return await stepContext.next();
		}
		
		// console.log('weatherRequest: ', stepContext.options.weatherRequest);
		// console.log('weatherRequest datetime: ', stepContext.options.weatherRequest.datetime);
		if (stepContext.options.weatherRequest.geographyV2) {
			const city = stepContext.options.weatherRequest.geographyV2[0].location;
			
			return stepContext.next({city});
		} else {
			// const messageText = 'Sure, what city is the weather forecast for?';
			// const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
			// return await stepContext.prompt(WEATHER_PROMPT, { prompt: msg });
			
			return await stepContext.replaceDialog(LOCATION_DIALOG);
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
			return await stepContext.replaceDialog(WEATHER_DIALOG);
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
				// "speak": "<s>Weather forecast...</s>",
				"body": [
					{
						"type": "ColumnSet",
						"columns": [
							{
								"type": "Column",
								"width": "auto",
								"items": [
									{
										"type": "Image",
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherCurrentData.iconCode]+".png",
										"size": "Medium",
										"altText": weatherCurrentData.phrase
									}
								],
								"height": "stretch",
								"bleed": true
							},
							{
								"type": "Column",
								"width": 65,
								"items": [
									{
										"type": "TextBlock",
										"text": city + ", "+ momentDate.format("YYYY-MM-DD HH:mm A"),
										"color": "light",
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
										"color": "light",
										"wrap": false,
										"text": "Morning",
										"size": "Small"
									},
									{
										"type": "Image",
										"horizontalAlignment": "Center",
										"size": "Small",
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
										"color": "light",
										"wrap": false,
										"text": "Afternoon",
										"size": "Small"
									},
									{
										"type": "Image",
										"horizontalAlignment": "Center",
										"size": "Small",
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
										"color": "light",
										"wrap": false,
										"text": "Evening",
										"size": "Small"
									},
									{
										"type": "Image",
										"horizontalAlignment": "Center",
										"size": "Small",
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
										"color": "light",
										"wrap": false,
										"text": "Overnight",
										"size": "Small"
									},
									{
										"type": "Image",
										"horizontalAlignment": "Center",
										"size": "Small",
										"url": process.env.WeatherIconsUrl + weatherIcons[weatherQuarterData[3].iconCode]+".png",
										"altText": "Drizzly weather"
									},
									{
										"type": "TextBlock",
										"text": weatherQuarterData[2].dewPoint.value + "°",
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
		
		await stepContext.context.sendActivity('Okay, here’s the weather you can expect:', 'Okay, here’s the weather you can expect:', InputHints.IgnoringInput);
		await stepContext.context.sendActivity({ attachments: [weatherCard] });
		
		return await stepContext.next();
	}
}

module.exports.WEATHER_DIALOG = WEATHER_DIALOG;
module.exports.WeatherDialog = WeatherDialog;
