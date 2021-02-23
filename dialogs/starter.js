const { ActionTypes } = require('botbuilder-core');
const { MessageFactory, InputHints } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { NEWS_DIALOG } = require('./newsDialog');
const { JOKE_DIALOG } = require('./jokeDialog');
const { WEATHER_DIALOG } = require('./weatherDialog');
const buttons = require('../cardTemplates/buttons');
const CosmosClient = require("@azure/cosmos").CosmosClient;
const { IVYLuisRecognizer } = require('./luisRecognizer');

const OPTIONS_PROMPT = 'optionsPrompt';
const NEWS_PROMPT = 'NEWS_PROMPT';
const JOKE_PROMPT = 'JOKE_PROMPT';

const client = new CosmosClient({
	endpoint: process.env.CosmosDbEndpoint,
	key: process.env.CosmosDbAuthKey
});

const database = client.database(process.env.CosmosDbDatabaseId);
const container = database.container(process.env.CosmosDbContainerId);

const { LuisAppId, LuisAPIKey, LuisAPIHostName } = process.env;
const luisConfig = { applicationId: LuisAppId, endpointKey: LuisAPIKey, endpoint: `https://${ LuisAPIHostName }` };

const luisRecognizer = new IVYLuisRecognizer(luisConfig);

class StarterDialog {
	constructor() {
		this.luisRecognizer = luisRecognizer;
		this.userDBState = undefined;
	}
	
	async getUserState(userId) {
		if (!this.userDBState) {
			const querySpec = {
				  query: `SELECT * from c WHERE c.userId = "${userId}"`
				};

				const users = await container.items
				.query(querySpec)
				.fetchAll();

				if (!users[0]) {
				  const newItem = {
				    userId: userId,
				    location: {
				      city: '',
				      countryCode: ''
				    }
				  }
					
					this.userDBState = await container.items.create(newItem);
				} else {
					this.userDBState = users[0];
				}
		}
		
		return this.userDBState;
	}
	
	async updateUserCity(city) {
		this.userDBState.resource.location.city = city;
		
		await container
		.item(this.userDBState.item.id, this.userDBState.item.partitionKey)
		.replace(this.userDBState.resource);

		console.log('updatedItem: ', this.userDBState);
	}
	
	async updateUserCountry(countryCode) {
		this.userDBState.resource.location.countryCode = countryCode;
		
		await container
		.item(this.userDBState.item.id, this.userDBState.item.partitionKey)
		.replace(this.userDBState.resource);
		
		console.log('updatedItem: ', this.userDBState);
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
		if (!luisRecognizer.isConfigured) {
			console.log(`\n Luis is not configured properly.`);
			console.log('-------------------------------------------------------');
			return await stepContext.replaceDialog('MainDialog');
		}
		
		const luisResult = await luisRecognizer.executeLuisQuery(stepContext.context);
		
		// console.log(`\nLuis recognized next Dialog as ${LuisRecognizer.topIntent(luisResult)}`);
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
