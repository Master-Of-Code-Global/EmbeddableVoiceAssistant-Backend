const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { ActivityTypes } = require('botbuilder-core');
const { LuisRecognizer } = require('botbuilder-ai');

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
	constructor(luisRecognizer,starter) {
		super(JOKE_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		this.starter = starter;
		
		this.addDialog(new TextPrompt(JOKE_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.returnJokes.bind(this),
			starter.showJokePossibilities.bind(this),
			this.showDataStep.bind(this)
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}
	
	async returnJokes(stepContext) {
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
		
		for (let i in usedJokesArr) {
			if(!jokesArr.includes(usedJokesArr[i])) jokesLeft.push(usedJokesArr[i]);
		}
		
		return jokesLeft.sort((a, b) => a - b);
	}
	
	async showDataStep(stepContext){
		if (!this.luisRecognizer.isConfigured) {
			console.log(`\n Luis is not configured properly.`);
			console.log('-------------------------------------------------------');
			return await stepContext.replaceDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		if (LuisRecognizer.topIntent(luisResult) === 'QR_Another_joke') {
			return await stepContext.replaceDialog(JOKE_DIALOG);
		} else {
			return this.starter.showDataStep(stepContext);
		}
	}
}

module.exports.JOKE_DIALOG = JOKE_DIALOG;
module.exports.JokeDialog = JokeDialog;
