const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints, MessageFactory } = require('botbuilder');
const { ActivityTypes, CardFactory, ActionTypes } = require('botbuilder-core');
const { LuisRecognizer } = require('botbuilder-ai');
const { MainDialog } = require('./mainDialog');

const NEWS_DIALOG = 'NEWS_DIALOG';
const WEATHER_DIALOG = 'WEATHER_DIALOG';
const JOKE_DIALOG = 'JOKE_DIALOG';

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const WEATHER_PROMPT = 'WEATHER_PROMPT';

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
	
	async returnWeather(stepContext) {
		console.log('returnWeather');
		// await stepContext.context.sendActivity('you wanna get the weather', null, InputHints.IgnoringInput);
		// await stepContext.context.sendActivity(stepContext.options.weatherType, null, InputHints.IgnoringInput);
		
		const weatherCard = CardFactory.adaptiveCard({
				"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
				"type": "AdaptiveCard",
				"version": "1.0",
				"body": [
					{
						"type": "TextBlock",
						"text": "Cherkasy, CK",
						"size": "Large",
						"isSubtle": true
					},
					{
						"type": "TextBlock",
						"text": "01/25/2021 11:24 PM",
						"spacing": "None"
					},
					{
						"type": "TextBlock",
						"text": "The skies will be mostly cloudy",
						"spacing": "None"
					},
					{
						"type": "ColumnSet",
						"columns": [
							{
								"type": "Column",
								"width": "auto",
								"items": [
									{
										"type": "Image",
										"url": "https://www.modlabs.net/uploads/gallery/blogs/the-cloud.jpg",
										"size": "Large"
									}
								]
							},
							{
								"type": "Column",
								"width": "auto",
								"items": [
									{
										"type": "TextBlock",
										"text": "6",
										"size": "ExtraLarge",
										"spacing": "None"
									}
								]
							},
							{
								"type": "Column",
								"width": "stretch",
								"items": [
									{
										"type": "TextBlock",
										"text": "°C",
										"weight": "Bolder",
										"spacing": "Small"
									}
								]
							},
							{
								"type": "Column",
								"width": "stretch",
								"items": [
									{
										"type": "TextBlock",
										"text": "Hi of 8",
										"horizontalAlignment": "Left"
									},
									{
										"type": "TextBlock",
										"text": "Lo of 6",
										"horizontalAlignment": "Left",
										"spacing": "None"
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
		
		console.log('MainDialog.showDataStep: ', stepContext.result);

		if (!this.luisRecognizer.isConfigured) {
			return await stepContext.beginDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		console.log('weather luisResult: ', luisResult);
		switch (LuisRecognizer.topIntent(luisResult)) {
			case 'NewsUpdate_Request':
				return await stepContext.beginDialog(NEWS_DIALOG, { newsType: luisResult.text });
			
			case 'WeatherForecast_Request':
			case 'QR_Weather_suggestion_chips':
				return await stepContext.beginDialog(WEATHER_DIALOG, { weatherType: luisResult.text });
			
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
