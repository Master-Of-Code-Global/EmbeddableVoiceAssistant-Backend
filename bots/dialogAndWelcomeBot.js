// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { MessageFactory } = require('botbuilder');
const { DialogBot } = require('./dialogBot');

class DialogAndWelcomeBot extends DialogBot {
    constructor(conversationState, userState, dialog) {
        super(conversationState, userState, dialog);

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
		                const reply = MessageFactory.text('Hi, I’m Ivy, ' +
			                'a Voice Assistant widget for mobile apps.\n' + '\n' +
		                'Try asking me something from the options below: \n');
	                  
		                await context.sendActivity(reply);
                    await dialog.run(context, conversationState.createProperty('DialogState'), conversationState.createProperty('conversationData'), userState.createProperty('userProfile'));
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DialogAndWelcomeBot = DialogAndWelcomeBot;
