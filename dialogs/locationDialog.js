const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { countries } = require('../resources/countries');

const LOCATION_DIALOG = 'LOCATION_DIALOG';
const LOCATION_PROMPT = 'LOCATION_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class LocationDialog extends ComponentDialog {
	constructor(userState) {
		super(LOCATION_DIALOG);
		
		this.userProfile = userState;
		
		this.addDialog(new TextPrompt(LOCATION_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.requestCountry.bind(this),
			this.saveCountry.bind(this),
			this.requestCity.bind(this),
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
			this.userProfile.location = {
				countryCode: countries[country.toLowerCase()]
			};
			
			this.userProfile.saveChanges(stepContext.context);
		}
		
		return await stepContext.next();
	}
	
	async requestCity(stepContext) {
		if (this.userProfile.location && this.userProfile.location.city){
			return await stepContext.next();
		}
		
		return await stepContext.prompt(LOCATION_PROMPT, 'Please share your City.');
	}
	
	async saveCity(stepContext) {
		const city = stepContext.result;
		if (city) {
			this.userProfile.location.city = city;
			
			this.userProfile.saveChanges(stepContext.context);
		}
		
		return await stepContext.next();
	}
}

module.exports.LocationDialog = LocationDialog;
module.exports.LOCATION_DIALOG = LOCATION_DIALOG;
