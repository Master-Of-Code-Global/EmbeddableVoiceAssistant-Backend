const { ComponentDialog, DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { NewsDialog } = require('./newsDialog');
const { JokeDialog } = require('./jokeDialog');
const { StarterDialog } = require('./starter');
const { WeatherDialog } = require('./weatherDialog');
const OPTIONS_PROMPT = 'optionsPrompt';
const MAIN_WATERFALL_DIALOG = 'optionsDialog';

class MainDialog extends ComponentDialog {
    constructor(luisRecognizer, userState) {
        super('MainDialog');

        this.userState = userState;
        this.starter = new StarterDialog(luisRecognizer);
	
        if (!this.userState.location) {
	        this.userState.location = {
		        countryCode: undefined,
		        city: undefined
	        };
        }
        
        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;

        this.addDialog(new TextPrompt(OPTIONS_PROMPT));
	      this.addDialog(new NewsDialog(this.luisRecognizer, this.userState, this.starter));
	      this.addDialog(new JokeDialog(this.luisRecognizer, this.starter));
	      this.addDialog(new WeatherDialog(this.luisRecognizer, this.userState, this.starter));
	      this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
		      this.starter.showPossibilities.bind(this),
          this.starter.showDataStep.bind(this)
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
		console.log(`\nDebug Run: 1`);
		const dialogSet = new DialogSet(accessor);
		console.log(`\nDebug Run: 2`);
		dialogSet.add(this);
		console.log(`\nDebug Run: 3`);
		console.log(turnContext._respondedRef);
		
		const dialogContext = await dialogSet.createContext(turnContext);
		console.log('');
		console.log(`\nDebug Run: 4`);
		const results = await dialogContext.continueDialog();
		console.log(`\nDebug Run: 5`);
		console.log('Status: ', results);
		console.log(turnContext._respondedRef);
		if (results.status === DialogTurnStatus.empty) {
			console.log(`\nDebug Run: 6`);
			console.log('Run dialog with id: ', this.id);
			await dialogContext.beginDialog(this.id);
		}
	}
}

module.exports.MainDialog = MainDialog;
