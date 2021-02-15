const { ActionTypes } = require('botbuilder-core');
const { MessageFactory, InputHints } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { NEWS_DIALOG } = require('./newsDialog');
const { JOKE_DIALOG } = require('./jokeDialog');
const { WEATHER_DIALOG } = require('./weatherDialog');
const buttons = require('../cardTemplates/buttons');

const OPTIONS_PROMPT = 'optionsPrompt';
const NEWS_PROMPT = 'NEWS_PROMPT';
const JOKE_PROMPT = 'JOKE_PROMPT';

class StarterDialog {
	
	constructor(luisRecognizer) {
		this.luisRecognizer = luisRecognizer;
	}
	
	async showPossibilities(stepContext){
		const cardActions = [
			{
				type: ActionTypes.ImBack,
				title: 'What is the weather today?',
				value: 'What is the weather today?',
			},
			{
				type: ActionTypes.ImBack,
				title: 'What is the latest news?',
				value: 'What is the latest news?',
			},
			{
				type: ActionTypes.ImBack,
				title: 'Tell me a joke',
				value: 'Tell me a joke',
			}
		];
		
		const reply = MessageFactory.suggestedActions(cardActions, '');
		return await stepContext.prompt(OPTIONS_PROMPT, { prompt: reply });
	}
	
	async showNewsPossibilities(stepContext) {
		let cardActions;
		
		switch (stepContext.options.newsType) {
			case 'What is the latest news?':
				cardActions = [
					buttons.itNews,
					buttons.healthNews,
					buttons.tellJoke
				];
				break;
			case 'IT Tech news':
				cardActions = [
					buttons.aiNews,
					buttons.worldNews,
					buttons.weatherToday
				];
				break;
			default:
				cardActions = [
					buttons.weatherToday,
					buttons.defaultNews,
					buttons.tellJoke
				];
				break;
		}
		
		const reply = MessageFactory.suggestedActions(cardActions);
		return await stepContext.prompt(NEWS_PROMPT, { prompt: reply });
	}
	
	async showJokePossibilities(stepContext) {
		const cardActions = [
			{
				type: ActionTypes.ImBack,
				title: 'Another One',
				value: 'Another One',
			},
			{
				type: ActionTypes.ImBack,
				title: 'IT news',
				value: 'IT news',
			},
			{
				type: ActionTypes.ImBack,
				title: 'What is the weather tomorrow?',
				value: 'What is the weather tomorrow?',
			}
		];
		
		const reply = MessageFactory.suggestedActions(cardActions);
		return await stepContext.prompt(JOKE_PROMPT, { prompt: reply });
	}
	
	async showDataStep(stepContext){
		if (!this.luisRecognizer.isConfigured) {
			return await stepContext.beginDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		
		switch (LuisRecognizer.topIntent(luisResult)) {
			case 'NewsUpdate_Request':
				return await stepContext.beginDialog(NEWS_DIALOG, { newsType: luisResult.text });
			
			case 'WeatherForecast_Request':
			case 'QR_Weather_suggestion_chips':
				return await stepContext.beginDialog(WEATHER_DIALOG, { weatherRequest: luisResult.entities });
			
			case 'TellJoke_Request':
				return await stepContext.beginDialog(JOKE_DIALOG);
			
			case 'ST_user_greeting':
				await stepContext.context.sendActivity('Hi, Ivy here, how can I help?', 'Hi, Ivy here, how can I help?', InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
			
			case 'ST_What_Your_Name':
				await stepContext.context.sendActivity('I\'m Ivy. Nice to meet you!', 'I\'m Ivy. Nice to meet you!', InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
			
			case 'ST_How_are_you':
				await stepContext.context.sendActivity("I’m good 🙂 If you are looking for a laugh, try saying ‘’Tell me a joke’’.", "I’m good 🙂 If you are looking for a laugh, try saying ‘’Tell me a joke’’.", InputHints.ExpectingInput);
				return stepContext.beginDialog('MainDialog');
			
			case 'ST_Microphone_Check':
				await stepContext.context.sendActivity("🙂 Yes, I'm listening. Go ahead and ask me some of the things you see below:", "🙂 Yes, I'm listening. Go ahead and ask me some of the things you see below:", InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
			
			case 'ST_Repeat':
				await stepContext.context.sendActivity('I\'m Ivy. Nice to meet you!', 'I\'m Ivy. Nice to meet you!', InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
			
			case 'ST_What_can_bot_do':
				await stepContext.context.sendActivity('Just tap on the microphone icon and ask me some of the things you see below:', 'Just tap on the microphone icon and ask me some of the things you see below:', InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
			
			case 'ST_Who_are_you':
				await stepContext.context.sendActivity(
					"I’m an open-source Voice Assistant widget for iOS and Android apps developed by Master of Code Global.\n" +
					"I run on Microsoft Azure cognitive services that let me understand human speech and respond in a natural voice according to programmed scenarios.\n" +
					"Why don’t you ask me some of the things below to see how it works?",
					"I’m an open-source Voice Assistant widget for iOS and Android apps developed by Master of Code Global.\n" +
					"I run on Microsoft Azure cognitive services that let me understand human speech and respond in a natural voice according to programmed scenarios.\n" +
					"Why don’t you ask me some of the things below to see how it works?",
					InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
			
			default: {
				const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ stepContext.context.activity.text })`;
				return await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
			}
		}
	}
}

module.exports.StarterDialog = StarterDialog;
