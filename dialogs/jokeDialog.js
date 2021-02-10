const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints, MessageFactory } = require('botbuilder');
const { ActivityTypes, ActionTypes,  } = require('botbuilder-core');
const { LuisRecognizer } = require('botbuilder-ai');
const { MainDialog } = require('./mainDialog');

const NEWS_DIALOG = 'NEWS_DIALOG';
const WEATHER_DIALOG = 'WEATHER_DIALOG';
const JOKE_DIALOG = 'JOKE_DIALOG';

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const JOKE_PROMPT = 'JOKE_PROMPT';

const jokes = [
	['What do clouds wear under their shorts?', '👖 Thunderpants!'] ,
	['What do you call a shoe made out of a banana?', 'A slipper 🍌'],
	['Did you hear about the two antennas that got married?', 'The ceremony was okay, but the reception was great! 📺 💛'],
	['Why didn’t the melons get married? 💍', 'Because they cantaloupe']
];

let usedJokes = [];

class JokeDialog extends ComponentDialog {
	constructor(luisRecognizer, userState) {
		super(JOKE_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		
		this.addDialog(new TextPrompt(JOKE_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.returnJokes.bind(this),
			this.choiceOptionStep.bind(this),
			this.showDataStep.bind(this)
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}
	
	async returnJokes(stepContext) {
		// await stepContext.context.sendActivity('What do clouds wear under their shorts?', null, InputHints.IgnoringInput);
		
		const joke = this.getJoke();
		
		await stepContext.context.sendActivities([
			{ type: ActivityTypes.Message, text: joke[0] },
			{ type: 'delay', value: 2000 },
			{ type: ActivityTypes.Message, text: joke[1] }
		]);
		
		return await stepContext.next();
	}
	
	getJoke(){
		let freshJokes = this.getDifferentJokes(jokes, usedJokes);
		if (freshJokes.length < 1){
			freshJokes = jokes;
			usedJokes = [];
		}
		const random = Math.floor(Math.random()*freshJokes.length);
		const joke  = freshJokes[random];
		usedJokes.push(freshJokes[random]);
		
		return joke;
	}
	
	getDifferentJokes(jokesArr, usedJokesArr) {
		const jokesLeft = [];
		
		for (let i in jokesArr) {
			if (!usedJokesArr.includes(jokesArr[i])) jokesLeft.push(jokesArr[i]);
		}
		
		for(let i in usedJokesArr) {
			if(!jokesArr.includes(usedJokesArr[i])) jokesLeft.push(usedJokesArr[i]);
		}
		
		return jokesLeft.sort((a, b) => a - b);
	}
	
	async choiceOptionStep(stepContext) {
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
		// return await stepContext.context.sendActivity(reply);
		
		return await stepContext.prompt(JOKE_PROMPT, { prompt: reply });
	}
	
	async showDataStep(stepContext){
		// await MainDialog.showDataStep(stepContext);
		
		console.log('MainDialog.showDataStep: ', stepContext.result);
		// await stepContext.context.sendActivity(stepContext.result.value, stepContext.result.value, InputHints.IgnoringInput);
		
		if (!this.luisRecognizer.isConfigured) {
			// LUIS is not configured, we just run the BookingDialog path.
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
			case 'QR_Another_joke':
				return await stepContext.beginDialog(JOKE_DIALOG);
			
			default: {
				const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ stepContext.context.activity.text })`;
				return await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
			}
		}
	}
}

module.exports.JOKE_DIALOG = JOKE_DIALOG;
module.exports.JokeDialog = JokeDialog;
