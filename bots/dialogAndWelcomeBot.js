// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { MessageFactory } = require('botbuilder');
const { DialogBot } = require('./dialogBot');

class DialogAndWelcomeBot extends DialogBot {
    constructor(conversationState, userState, dialog) {
        super(conversationState, userState, dialog);

        console.log('DialogAndWelcomeBot constr');
        
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
	        console.log('BOT context.activity.membersAdded', membersAdded);
	        console.log('BOT context.activity.recipient', context.activity.recipient.id);
	        for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id === context.activity.recipient.id) {
		                const replyWelcome = MessageFactory.text('Hi, I’m Ivy, a Voice Assistant widget for mobile apps.', 'Hi, I’m Ivy, a Voice Assistant widget for mobile apps.');
		                await context.sendActivity(replyWelcome);
	
		                const replyMicrophone = MessageFactory.text('Tap the microphone to speak. \n' +
			                '\n' +
			                'Here’s something you can ask me:',
			                'Tap the microphone to speak. \n' +
			                '\n' +
			                'Here’s something you can ask me:');
		                await context.sendActivity(replyMicrophone);
	                
                    await dialog.run(context, conversationState.createProperty('conversationData'), userState.createProperty('userProfile'));
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DialogAndWelcomeBot = DialogAndWelcomeBot;
