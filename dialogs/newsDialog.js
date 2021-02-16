const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints } = require('botbuilder');
const { getRequestData } = require('../services/request');
const { buildNewsCarousel } = require('../cardTemplates/carousel');
const { countries } = require('../resources/countries');

const NEWS_DIALOG = 'NEWS_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const NEWS_PROMPT = 'NEWS_PROMPT';

let bingHost = process.env.BING_SEARCH_V7_ENDPOINT;

const newsHeader = {
	"Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_V7_SUBSCRIPTION_KEY,
	"Accept-Language": 'en'
};
let mkt = '';

class NewsDialog extends ComponentDialog {
	constructor(luisRecognizer, userState, starter) {
		super(NEWS_DIALOG);
		
		this.luisRecognizer = luisRecognizer;
		this.userProfile = userState;
		
		this.addDialog(new TextPrompt(NEWS_PROMPT));
		this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
			this.requestLocation.bind(this),
			this.captureCoordinates.bind(this),
			this.returnNews.bind(this),
			starter.showNewsPossibilities.bind(this),
			starter.showDataStep.bind(this)
		]));
		
		this.initialDialogId = WATERFALL_DIALOG;
	}

	async requestLocation(stepContext) {
		// console.log('');
		// console.log('News Dialog: Step 1');
		// console.log('');
		if (this.userProfile.location && this.userProfile.location.countryCode){
			return await stepContext.next();
		}
		
		return await stepContext.prompt(NEWS_PROMPT, 'Please share your Country.');
	}

	async captureCoordinates(stepContext) {
		// console.log('');
		// console.log('News Dialog: Step 2');
		// console.log('');
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
		// console.log('');
		// console.log('News Dialog: Step 3');
		// console.log('');
		try {
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
		} catch (err) {
			console.error(`\n Error in the News Dialog: return news method`);
			console.error(err);
		} 
		
	}
}

module.exports.NEWS_DIALOG = NEWS_DIALOG;
module.exports.NewsDialog = NewsDialog;
