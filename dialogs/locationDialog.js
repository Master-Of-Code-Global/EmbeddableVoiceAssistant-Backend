const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { countries } = require('../resources/countries');
const { LuisRecognizer } = require('botbuilder-ai');
const { InputHints, MessageFactory } = require('botbuilder');

const LOCATION_DIALOG = 'LOCATION_DIALOG';
const LOCATION_PROMPT = 'LOCATION_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

let asked = false;

class LocationDialog extends ComponentDialog {
	constructor(userState, luisRecognizer) {
		super(LOCATION_DIALOG);
		
		this.userProfile = userState;
		this.luisRecognizer = luisRecognizer;
		
		this.addDialog(new TextPrompt(LOCATION_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			// this.requestCountry.bind(this),
			// this.saveCountry.bind(this),
			this.requestCity.bind(this),
			this.checkCity.bind(this),
			this.saveCity.bind(this),
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}
	
	async requestCountry(stepContext) {
		if (this.userProfile.location && this.userProfile.location.countryCode){
			return await stepContext.next();
		}
		
		return await stepContext.prompt(LOCATION_PROMPT, 'Please share your Country.');
	}
	
	async saveCountry(stepContext) {
		const country = stepContext.result;
		if (country) {
			this.userProfile.location.countryCode = countries[country.toLowerCase()];
			
			this.userProfile.saveChanges(stepContext.context);
		}
		
		return await stepContext.next();
	}
	
	async requestCity(stepContext) {
		if (this.userProfile.location && this.userProfile.location.city){
			return await stepContext.next();
		}
		
		let messageText = 'Sure, what city is the weather forecast for?';
		let msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
		
		return await stepContext.prompt(LOCATION_PROMPT, { prompt: msg });
	}
	
	async checkCity(stepContext) {
		if (this.userProfile.location && this.userProfile.location.city){
			return await stepContext.next();
		}
		
		if (!this.luisRecognizer.isConfigured) {
			console.log(`\n Luis is not configured properly.`);
			console.log('-------------------------------------------------------');
			return await stepContext.replaceDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		
		if (luisResult.entities && luisResult.entities.geographyV2) {
			return await stepContext.next();
		} else {
			let messageText = 'Sorry, I didn’t catch that. Please try saying something like "What’s the weather in Brussels?"';
			let msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
			
			return await stepContext.prompt(LOCATION_PROMPT, { prompt: msg });
		}
	}
	
	async saveCity(stepContext) {
		if (this.userProfile.location && this.userProfile.location.city){
			return await stepContext.next();
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		
		if (luisResult.entities && luisResult.entities.geographyV2) {
			const city = luisResult.entities.geographyV2[0].location;
			
			if (city) {
				this.userProfile.location.city = city;
				this.userProfile.saveChanges(stepContext.context);
				
				return await stepContext.next();
			} else {
				await stepContext.prompt(LOCATION_PROMPT, 'Sorry, I didn’t get that. Please try asking in a different way.');
				return await stepContext.replaceDialog('MainDialog');
			}
		} else {
			await stepContext.prompt(LOCATION_PROMPT, 'Sorry, I didn’t get that. Please try asking in a different way.');
			return await stepContext.replaceDialog('MainDialog');
		}
	}
}

module.exports.LocationDialog = LocationDialog;
module.exports.LOCATION_DIALOG = LOCATION_DIALOG;
