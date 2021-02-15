const { ActionTypes } = require('botbuilder-core');
const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { MessageFactory, InputHints } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { NEWS_DIALOG, NewsDialog } = require('./newsDialog');
const { JOKE_DIALOG, JokeDialog } = require('./jokeDialog');
const { WEATHER_DIALOG, WeatherDialog } = require('./weatherDialog');
const buttons = require('../cardTemplates/buttons');
const OPTIONS_PROMPT = 'optionsPrompt';
const MAIN_WATERFALL_DIALOG = 'optionsDialog';

class MainDialog extends ComponentDialog {
    constructor(luisRecognizer, userState) {
        super('MainDialog');

        this.userState = userState;

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;

        this.addDialog(new TextPrompt(OPTIONS_PROMPT));
	      this.addDialog(new NewsDialog(this.luisRecognizer, this.userState));
	      this.addDialog(new JokeDialog(this.luisRecognizer, this.userState));
	      this.addDialog(new WeatherDialog(this.luisRecognizer, this.userState));
	      this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
		      this.showPossibilities.bind(this),
          this.showDataStep.bind(this)
        ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     * @param {*} userAccessor
     */
    async run(turnContext, accessor, userAccessor) {
	    const dialogSet = new DialogSet(accessor);
	    dialogSet.add(this);
	
	    const dialogContext = await dialogSet.createContext(turnContext);
	    const results = await dialogContext.continueDialog();
	    if (results.status === DialogTurnStatus.empty) {
		    await dialogContext.beginDialog(this.id);
	    }
    }
	
    async showPossibilities(stepContext){
	    const cardActions = [
		    buttons.weatherToday,
		    buttons.defaultNews,
		    buttons.tellJoke
	    ];
	
	    const reply = MessageFactory.suggestedActions(cardActions, '');
	    return await stepContext.prompt(OPTIONS_PROMPT, { prompt: reply });
    }
    
	async showDataStep(stepContext){
		if (!this.luisRecognizer.isConfigured) {
			return await stepContext.beginDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
		
		switch (LuisRecognizer.topIntent(luisResult)) {
			case 'NewsUpdate_Request':
				console.log('Main Dialog: Start News Dialog');
				console.log('----------------------------------------------------');
				console.log('');
				return await stepContext.beginDialog(NEWS_DIALOG, { newsType: luisResult.text });
				
			case 'WeatherForecast_Request':
			case 'QR_Weather_suggestion_chips':
				console.log('Main Dialog: Start Weather Dialog');
				console.log('----------------------------------------------------');
				console.log('');
				return await stepContext.beginDialog(WEATHER_DIALOG, { weatherRequest: luisResult.entities });
			
			case 'TellJoke_Request':
				console.log('Main Dialog: Start Joke Dialog');
				console.log('----------------------------------------------------');
				console.log('');
				return await stepContext.beginDialog(JOKE_DIALOG);
				
			case 'ST_user_greeting':
				await stepContext.context.sendActivity('Hi, Ivy here, how can I help?', 'Hi, Ivy here, how can I help?', InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
				
			case 'ST_What_Your_Name':
				await stepContext.context.sendActivity('I\'m Ivy. Nice to meet you!', 'I\'m Ivy. Nice to meet you!', InputHints.IgnoringInput);
				return stepContext.beginDialog('MainDialog');
				
			case 'ST_How_are_you':
				await stepContext.context.sendActivity("I’m good 🙂 If you are looking for a laugh, try saying ‘’Tell me a joke’’.", "I’m good 🙂 If you are looking for a laugh, try saying ‘’Tell me a joke’’.", InputHints.ExpectingInput);
				return stepContext.next();
				
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

module.exports.MainDialog = MainDialog;
