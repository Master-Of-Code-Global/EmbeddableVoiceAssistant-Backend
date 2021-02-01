const { LuisRecognizer } = require('botbuilder-ai');

class IVYLuisRecognizer {
	constructor(config) {
		const luisIsConfigured = config && config.applicationId && config.endpointKey && config.endpoint;
		if (luisIsConfigured) {
			const recognizerOptions = {
				apiVersion: 'v3'
			};
			
			this.recognizer = new LuisRecognizer(config, recognizerOptions);
		}
	}
	
	get isConfigured() {
		return (this.recognizer !== undefined);
	}
	
	async executeLuisQuery(context) {
		return await this.recognizer.recognize(context);
	}
	
}

module.exports.IVYLuisRecognizer = IVYLuisRecognizer;
