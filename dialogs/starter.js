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
		let cardActions;
		
		cardActions = [
			buttons.weatherToday,
			buttons.defaultNews,
			buttons.tellJoke
		];
		
		const reply = MessageFactory.suggestedActions(cardActions, '');
		return await stepContext.prompt(OPTIONS_PROMPT, { prompt: reply });
	}
	
	async showWeatherPossibilities(stepContext){
		let cardActions;
		
		cardActions = [
			buttons.weatherTomorrow,
			buttons.breakingNews,
			buttons.tellJoke
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
		let cardActions;
		
		cardActions = [
			buttons.anotherJoke,
			buttons.weatherToday,
			buttons.defaultNews
		];
		
		const reply = MessageFactory.suggestedActions(cardActions);
		return await stepContext.prompt(JOKE_PROMPT, { prompt: reply });
	}
	
	async showDataStep(stepContext){
		if (!this.luisRecognizer.isConfigured) {
			console.log(`\n Luis is not configured properly.`);
			console.log('-------------------------------------------------------');
			return await stepContext.replaceDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		
		console.log(`\nLuis recognized next Dialog as ${LuisRecognizer.topIntent(luisResult)}`);
		switch (LuisRecognizer.topIntent(luisResult)) {
			case 'NewsUpdate_Request':
				// return await stepContext.replaceDialog(NEWS_DIALOG, { newsType: luisResult.text });
				return await stepContext.replaceDialog(NEWS_DIALOG, { newsType: luisResult.text });
			
			case 'WeatherForecast_Request':
			case 'QR_Weather_suggestion_chips':
				// return await stepContext.replaceDialog(WEATHER_DIALOG, { weatherRequest: luisResult.entities });
				return await stepContext.replaceDialog(WEATHER_DIALOG, { weatherRequest: luisResult.entities });
			
			case 'TellJoke_Request':
				// return await stepContext.replaceDialog(JOKE_DIALOG);
				return await stepContext.replaceDialog(JOKE_DIALOG);
			
			case 'ST_user_greeting':
				await stepContext.context.sendActivity('Hi, Ivy here, how can I help?', 'Hi, Ivy here, how can I help?', InputHints.IgnoringInput);
				// return stepContext.replaceDialog('MainDialog');
				return stepContext.replaceDialog('MainDialog');
			
			case 'ST_What_Your_Name':
				await stepContext.context.sendActivity('I’m Ivy. Nice to meet you!', 'I’m Ivy. Nice to meet you!', InputHints.IgnoringInput);
				// return stepContext.replaceDialog('MainDialog');
				return stepContext.replaceDialog('MainDialog');
			
			case 'ST_How_are_you':
				await stepContext.context.sendActivity(
					'I’m good! If you are looking for a laugh, try saying ‘’Tell me a joke’’.',
					'I’m good! If you are looking for a laugh, try saying ‘’Tell me a joke’’.',
					InputHints.IgnoringInput);
				// return stepContext.replaceDialog('MainDialog');
				return stepContext.replaceDialog('MainDialog');
			
			case 'ST_Microphone_Check':
				await stepContext.context.sendActivity('Yes, I’m listening.', 'Yes, I’m listening.', InputHints.IgnoringInput);
				await stepContext.context.sendActivity('Go ahead and ask me some of the things you see below:', 'Go ahead and ask me some of the things you see below:', InputHints.IgnoringInput);
				return stepContext.replaceDialog('MainDialog');
			
			case 'ST_Repeat':
				await stepContext.context.sendActivity('I’m Ivy. Nice to meet you!', 'I’m Ivy. Nice to meet you!', InputHints.IgnoringInput);
				return stepContext.replaceDialog('MainDialog');
			
			case 'ST_What_can_bot_do':
				await stepContext.context.sendActivity(
					'Just tap on the microphone icon and ask me some of the things you see below:',
					'Just tap on the microphone icon and ask me some of the things you see below:',
					InputHints.IgnoringInput);
				return stepContext.replaceDialog('MainDialog');
			
			case 'ST_ThankYou':
				await stepContext.context.sendActivity('I’m always here if you need me.', 'I’m always here if you need me.', InputHints.IgnoringInput);
				return stepContext.replaceDialog('MainDialog');
			
			case 'ST_Who_are_you':
				await stepContext.context.sendActivity(
					'I’m Ivy, an open-source Voice Assistant widget for iOS and Android apps.',
					'I’m Ivy, an open-source Voice Assistant widget for iOS and Android apps.',
					InputHints.IgnoringInput);
				await stepContext.context.sendActivity(
					'I run on Microsoft Azure cognitive services to understand human speech and respond in a natural voice.',
					'I run on Microsoft Azure cognitive services to understand human speech and respond in a natural voice.',
					InputHints.IgnoringInput
				);
				
				return stepContext.replaceDialog('MainDialog');
			
			default: {
				const didntUnderstandMessageText = 'Sorry, I didn’t get that. Please try asking in a different way.';
				await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
				return stepContext.replaceDialog('MainDialog');
			}
		}
	}
}

module.exports.StarterDialog = StarterDialog;
