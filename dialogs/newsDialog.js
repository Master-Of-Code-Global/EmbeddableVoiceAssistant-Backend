const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { MessageFactory, InputHints } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { getRequestData } = require('../services/request');
const { buildNewsCarousel } = require('../cardTemplates/carousel');
const buttons = require('../cardTemplates/buttons');
const { countries } = require('../resources/countries');

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
	constructor(luisRecognizer, userState) {
		super(NEWS_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		this.userProfile = userState;
		
		this.addDialog(new TextPrompt(NEWS_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.requestLocation.bind(this),
			this.captureCoordinates.bind(this),
			this.returnNews.bind(this),
			this.choiceOptionStep.bind(this),
			this.showDataStep.bind(this)
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}

	async requestLocation(stepContext) {
		if (this.userProfile.location && this.userProfile.location.countryCode){
			return await stepContext.next();
		}
		
		return await stepContext.prompt(NEWS_PROMPT, 'Please share your Country.');
	}

	async captureCoordinates(stepContext) {
		// temp coordinates '47.591180,-122.332700'
		const country = stepContext.result;
		if (country) {
			mkt = countries[country.toLowerCase()];
			
			this.userProfile.location = {
				countryCode: mkt
			};
			
			this.userProfile.saveChanges(stepContext.context);
		}

		return await stepContext.next();
	}
	
	async returnNews(stepContext) {
		
		const searchStr = (stepContext.options.newsType !== 'What is the latest news?') ? stepContext.options.newsType : '';
		const initialMessage = (stepContext.options.newsType === 'What is the latest news?') ? "Here are some results from a search:" : `Here's the latest ${stepContext.options.newsType}:`;

		await stepContext.context.sendActivity(initialMessage, null, InputHints.IgnoringInput);
		
		const options = {
			qs: {
				q: searchStr,
				cc: mkt
			}
		};
		
		const responseData = await getRequestData(bingHost, options, newsHeader);
		if (responseData.body.error) {
			console.error(responseData.body.error);
			await stepContext.context.sendActivity("Unfortunately, the News search service is unavailable at the moment. Please try again later.", null, InputHints.IgnoringInput);
		} else {
			if (responseData.body.value.length > 0) {
				const newsCarousel = buildNewsCarousel(responseData.body.value);
				
				await stepContext.context.sendActivity(newsCarousel, null, InputHints.IgnoringInput);
			} else {
				await stepContext.context.sendActivity("Unfortunately, the News search service is unavailable at the moment. Please try again later.", null, InputHints.IgnoringInput);
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
		return await stepContext.prompt(NEWS_PROMPT, { prompt: reply });
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

			default: {
				const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ stepContext.context.activity.text })`;
				return await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
			}
		}
	}
}

module.exports.NEWS_DIALOG = NEWS_DIALOG;
module.exports.NewsDialog = NewsDialog;
