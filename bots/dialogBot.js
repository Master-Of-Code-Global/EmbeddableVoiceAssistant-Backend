// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');

const CONVERSATION_DATA_PROPERTY = 'conversationData';
const USER_PROFILE_PROPERTY = 'userProfile';

class DialogBot extends ActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(conversationState, userState, dialog) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
	
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);
        this.userProfileAccessor = userState.createProperty(USER_PROFILE_PROPERTY);

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');
	
        this.onMessage(async (context, next) => {
            console.log(`\nRunning dialog with Message Activity.`);
            console.log("Conversation: ", context.activity.conversation);
            console.log("From: ", context._activity.from);
            console.log(`${context._activity.rawTimestamp}, {${context._activity.type}}: ${context._activity.text}`);
            console.log(`ChannelID: ${context._activity.channelId}`);
            console.log('---------------------------------------------------------------------');
            
            // Run the Dialog with the new message Activity.
            await this.dialog.run(context, this.conversationDataAccessor, this.userProfileAccessor);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        // this.onDialog(async (context, next) => {
        //     // Save any state changes. The load happened during the execution of the Dialog.
        //     await this.conversationState.saveChanges(context, false);
        //     await this.userState.saveChanges(context, false);
				
        //     // By calling next() you ensure that the next BotHandler is run.
        //     await next();
        // });
    }
	
	async run(context) {
		await super.run(context);
		
		// Save any state changes. The load happened during the execution of the Dialog.
		await this.conversationState.saveChanges(context, false);
		await this.userState.saveChanges(context, false);
	}
}

module.exports.DialogBot = DialogBot;
