const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const { InputHints, MessageFactory } = require('botbuilder');

const LOCATION_DIALOG = 'LOCATION_DIALOG';
const LOCATION_PROMPT = 'LOCATION_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const MAIN_DIALOG = 'MainDialog';

class LocationDialog extends ComponentDialog {
  constructor(userState, luisRecognizer) {
    super(LOCATION_DIALOG);

    this.userProfile = userState;
    this.luisRecognizer = luisRecognizer;

    this.addDialog(new TextPrompt(LOCATION_PROMPT));
    this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
      this.requestCity.bind(this),
      this.checkCity.bind(this),
      this.saveCity.bind(this)
    ]));

    this.initialDialogId = WATERFALL_DIALOG;
  }

  async requestCity(stepContext) {
    let userLocation = await this.userProfile.get(stepContext.context);
    if (!userLocation || (userLocation && !userLocation.location)) {
      userLocation = {
        location: {
          countryCode: undefined,
          city: undefined
        }
      };
      this.userProfile.set(stepContext.context, userLocation);
    }
    if (userLocation.location && userLocation.location.city) {
      return await stepContext.next();
    }

    const messageText = 'Sure, what city is the weather forecast for?';
    const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);

    return await stepContext.prompt(LOCATION_PROMPT, { prompt: msg });
  }

  async checkCity(stepContext) {
    const userLocation = await this.userProfile.get(stepContext.context);
    if (userLocation.location && userLocation.location.city) {
      return await stepContext.next();
    }

    if (!this.luisRecognizer.isConfigured) {
      return await stepContext.replaceDialog(MAIN_DIALOG);
    }

    stepContext.context.activity.text = stepContext.context.activity.text.replace('-', ' ');

    const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);

    if (luisResult.entities && luisResult.entities.geographyV2) {
      return await stepContext.next();
    } else {
      const messageText = 'Sorry, I didn???t catch that. Please try saying something like "What???s the weather in Brussels?"';
      const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);

      return await stepContext.prompt(LOCATION_PROMPT, { prompt: msg });
    }
  }

  async saveCity(stepContext) {
    const userLocation = await this.userProfile.get(stepContext.context);
    if (userLocation.location && userLocation.location.city) {
      return await stepContext.next();
    }

    const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);

    if (luisResult.entities && luisResult.entities.geographyV2) {
      const city = luisResult.entities.geographyV2[0].location;

      if (city) {
        const cityWords = city.split(' ');
        for (let i = 0; i < cityWords.length; i++) {
          cityWords[i] = cityWords[i][0].toUpperCase() + cityWords[i].substr(1).toLowerCase();
        }
        userLocation.location.city = cityWords.join(' ');
        return await stepContext.endDialog();
      } else {
        await stepContext.prompt(LOCATION_PROMPT, 'Sorry, I didn???t get that. Please try asking in a different way.');
        return await stepContext.replaceDialog(MAIN_DIALOG);
      }
    } else {
      await stepContext.prompt(LOCATION_PROMPT, 'Sorry, I didn???t get that. Please try asking in a different way.');
      return await stepContext.replaceDialog(MAIN_DIALOG);
    }
  }
}

module.exports.LocationDialog = LocationDialog;
module.exports.LOCATION_DIALOG = LOCATION_DIALOG;
