// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const { ActivityTypes, CardFactory, ActionTypes } = require('botbuilder-core');
const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { MessageFactory, InputHints, UserState } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog, ChoicePrompt } = require('botbuilder-dialogs');
const { NEWS_DIALOG, NewsDialog } = require('./newsDialog');
const { JOKE_DIALOG, JokeDialog } = require('./jokeDialog');
const { WEATHER_DIALOG, WeatherDialog } = require('./weatherDialog');
// const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const OPTIONS_PROMPT = 'optionsPrompt';
const MAIN_WATERFALL_DIALOG = 'optionsDialog';

class MainDialog extends ComponentDialog {
    constructor(luisRecognizer, userState) {
        super('MainDialog');

        this.userState = userState;

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;

        // if (!assistantDialog) throw new Error('[MainDialog]: Missing parameter \'assistantDialog\' is required');

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        // this.addDialog(new ChoicePrompt(OPTIONS_PROMPT));
        this.addDialog(new TextPrompt(OPTIONS_PROMPT));
	      this.addDialog(new NewsDialog(this.luisRecognizer, this.userState));
	      this.addDialog(new JokeDialog(this.luisRecognizer));
	      this.addDialog(new WeatherDialog(this.luisRecognizer));
	      this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
		      this.showPossibilities.bind(this),
          this.showDataStep.bind(this)
                // this.introStep.bind(this),
                // this.actStep.bind(this),
                // this.finalStep.bind(this)
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

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    async introStep(stepContext) {
        if (!this.luisRecognizer.isConfigured) {
            const messageText = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await stepContext.context.sendActivity(messageText, null, InputHints.IgnoringInput);
            return await stepContext.next();
        }

        const messageText = stepContext.options.restartMsg ? stepContext.options.restartMsg : 'What can I help you with today?\nSay something like "Book a flight from Paris to Berlin on March 22, 2020"';
        const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt('TextPrompt', { prompt: promptMessage });
    }

    /**
     * Second step in the waterfall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    async actStep(stepContext) {
        const bookingDetails = {};

        if (!this.luisRecognizer.isConfigured) {
            // LUIS is not configured, we just run the BookingDialog path.
            return await stepContext.beginDialog('assistantDialog', bookingDetails);
        }

        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        switch (LuisRecognizer.topIntent(luisResult)) {
        case 'BookFlight': {
            // Extract the values for the composite entities from the LUIS result.
            const fromEntities = this.luisRecognizer.getFromEntities(luisResult);
            const toEntities = this.luisRecognizer.getToEntities(luisResult);

            // Show a warning for Origin and Destination if we can't resolve them.
            await this.showWarningForUnsupportedCities(stepContext.context, fromEntities, toEntities);

            // Initialize BookingDetails with any entities we may have found in the response.
            bookingDetails.destination = toEntities.airport;
            bookingDetails.origin = fromEntities.airport;
            bookingDetails.travelDate = this.luisRecognizer.getTravelDate(luisResult);
            console.log('LUIS extracted these booking details:', JSON.stringify(bookingDetails));

            // Run the BookingDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
            return await stepContext.beginDialog('assistantDialog', bookingDetails);
        }

        case 'GetWeather': {
            // We haven't implemented the GetWeatherDialog so we just display a TODO message.
            const getWeatherMessageText = 'TODO: get weather flow here';
            await stepContext.context.sendActivity(getWeatherMessageText, getWeatherMessageText, InputHints.IgnoringInput);
            break;
        }

        default: {
            // Catch all for unhandled intents
            const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ LuisRecognizer.topIntent(luisResult) })`;
            await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
        }
        }

        return await stepContext.next();
    }

    /**
     * Shows a warning if the requested From or To cities are recognized as entities but they are not in the Airport entity list.
     * In some cases LUIS will recognize the From and To composite entities as a valid cities but the From and To Airport values
     * will be empty if those entity values can't be mapped to a canonical item in the Airport.
     */
    async showWarningForUnsupportedCities(context, fromEntities, toEntities) {
        const unsupportedCities = [];
        if (fromEntities.from && !fromEntities.airport) {
            unsupportedCities.push(fromEntities.from);
        }

        if (toEntities.to && !toEntities.airport) {
            unsupportedCities.push(toEntities.to);
        }

        if (unsupportedCities.length) {
            const messageText = `Sorry but the following airports are not supported: ${ unsupportedCities.join(', ') }`;
            await context.sendActivity(messageText, messageText, InputHints.IgnoringInput);
        }
    }

    /**
     * This is the final step in the main waterfall dialog.
     * It wraps up the sample "book a flight" interaction with a simple confirmation.
     */
    async finalStep(stepContext) {
        // If the child dialog ("bookingDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result;
            // Now we have all the booking details.

            // This is where calls to the booking AOU service or database would go.

            // If the call to the booking service was successful tell the user.
            const timeProperty = new TimexProperty(result.travelDate);
            const travelDateMsg = timeProperty.toNaturalLanguage(new Date(Date.now()));
            const msg = `I have you booked to ${ result.destination } from ${ result.origin } on ${ travelDateMsg }.`;
            await stepContext.context.sendActivity(msg, msg, InputHints.IgnoringInput);
        }

        // Restart the main dialog with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'What else can I do for you?' });
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
	    // return await stepContext.context.sendActivity(reply);
	
	    return await stepContext.prompt(OPTIONS_PROMPT, { prompt: reply });
    }
    
	async showDataStep(stepContext){
		if (!this.luisRecognizer.isConfigured) {
			// LUIS is not configured, we just run the BookingDialog path.
			return await stepContext.beginDialog('MainDialog');
		}
		
		const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);

		console.log('luisResult: ', luisResult);
		
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
