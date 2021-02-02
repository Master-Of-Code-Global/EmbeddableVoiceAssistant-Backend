const { ComponentDialog, WaterfallDialog, ChoicePrompt, TextPrompt } = require('botbuilder-dialogs');
const { ActivityTypes } = require('botbuilder-core');
const { MessageFactory, InputHints } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { MainDialog } = require('./mainDialog');
const { getRequestData } = require('../services/request');
const { buildNewsCarousel } = require('../cardTemplates/carousel');
const buttons = require('../cardTemplates/buttons');

const NEWS_DIALOG = 'NEWS_DIALOG';
const WEATHER_DIALOG = 'WEATHER_DIALOG';
const JOKE_DIALOG = 'JOKE_DIALOG';

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const NEWS_PROMPT = 'NEWS_PROMPT';

let bingHost = process.env.BING_SEARCH_V7_ENDPOINT;

const newsHeader = {
	"Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_V7_SUBSCRIPTION_KEY
};
let mkt = '';

class NewsDialog extends ComponentDialog {
	constructor(luisRecognizer) {
		super(NEWS_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		
		this.addDialog(new TextPrompt(NEWS_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.returnNews.bind(this),
			this.choiceOptionStep.bind(this),
			this.showDataStep.bind(this)
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}
	
	async returnNews(stepContext) {
		const searchStr = (stepContext.options.newsType !== 'What is the latest news?') ? stepContext.options.newsType : '';
		const initialMessage = (stepContext.options.newsType === 'What is the latest news?') ? "Here are some results from a search:" : `Here's the latest ${stepContext.options.newsType}:`;

		await stepContext.context.sendActivity(initialMessage, null, InputHints.IgnoringInput);
		
		const options = {
			qs: {
				q: searchStr,
				mkt: mkt
			}
		};
		const responseData = await getRequestData(bingHost, options, newsHeader);
		if (responseData.body.error) {
			// TODO: Show user message about error
			console.error(responseData.body.error);
		} else {
			if (responseData.body.value.length > 0) {
				const newsCarousel = buildNewsCarousel(responseData.body.value);
				
				await stepContext.context.sendActivity(newsCarousel, null, InputHints.IgnoringInput);
			} else {
				// TODO: Show user message about zero news
				console.log('show message "News not found"');
			}
		}
		
		return await stepContext.next();
	}
	

	async choiceOptionStep(stepContext) {
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
		// return await stepContext.context.sendActivity(reply);
		
		return await stepContext.prompt(NEWS_PROMPT, { prompt: reply });
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
		console.log('news luisResult: ', luisResult);
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

module.exports.NEWS_DIALOG = NEWS_DIALOG;
module.exports.NewsDialog = NewsDialog;
