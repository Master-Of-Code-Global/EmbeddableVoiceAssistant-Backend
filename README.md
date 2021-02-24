# EVA

Demonstrate the core capabilities of the Microsoft Bot Framework

### Bot channels registration

Register a bot with the Azure Bot Service. If the bot is hosted elsewhere, you can also make it available in Azure and connect it to the supported channels. All steps to register bot you can find [here](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration?view=azure-bot-service-4.0)

Once you registered the bot, update your `.env` with `MicrosoftAppId` and `MicrosoftAppPassword`.

```text
MicrosoftAppId="Your Microsoft application ID"
MicrosoftAppPassword="Your Microsoft application password"
```
### LUIS

This bot has been created using [Bot Framework](https://dev.botframework.com), it shows how to:

- Use [LUIS](https://www.luis.ai) to implement core AI capabilities
- Implement a multi-turn conversation using Dialogs
- Prompt for and validate requests for information from the user

## Prerequisites

This sample **requires** prerequisites in order to run.

### Overview

This bot uses [LUIS](https://www.luis.ai), an AI based cognitive service, to implement language understanding.

- [Node.js](https://nodejs.org) version 14.15.1 or higher

    ```bash
    # determine node version
    node --version
    ```

### Create a LUIS Application to enable language understanding

The LUIS model for this example can be found under `cognitiveModels/IVY.json` and the LUIS language model setup, training, and application configuration steps can be found [here](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-v4-luis?view=azure-bot-service-4.0&tabs=javascript).

Once you created the LUIS model, update `.env` with your `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName`.

```text
LuisAppId="Your LUIS App Id"
LuisAPIKey="Your LUIS Subscription key here"
LuisAPIHostName="Your LUIS App region here (i.e: westus.api.cognitive.microsoft.com)"
```

### Create a Bing News API Resource

Bot uses Bing News Search API to show news. Start using the Bing News Search API by creating Azure resource [Bing Search v7 resource](https://ms.portal.azure.com/#create/Microsoft.CognitiveServicesBingSearch-v7).

Once you created resource, update `.env` with your `BING_SEARCH_V7_SUBSCRIPTION_KEY` and `BING_SEARCH_V7_ENDPOINT`.

```text
BING_SEARCH_V7_SUBSCRIPTION_KEY="Your key to access Bing resource"
BING_SEARCH_V7_ENDPOINT="Your endpoint to access Bing resource"
```

### Create a Azure Maps resource

Bot uses Azure Maps service to get weather for user's location. Create Azure Maps resource in your Azure Portal.

Once you created resource, update your `.env` with `WeatherSubscriptionKey`. Also, add urls of the endpoiints to get weather.

```text
WeatherSubscriptionKey="Your Azure Maps Primary key"
CurrentWeatherUrl=https://atlas.microsoft.com/weather/currentConditions/json?api-version=1.0&query=
QuarterWeatherUrl=https://atlas.microsoft.com/weather/forecast/quarterDay/json?api-version=1.0&query=
CoordinatesUrl=https://atlas.microsoft.com/search/address/json?api-version=1.0&query=
ReverseAddressSearch=https://atlas.microsoft.com/search/address/reverse/json?api-version=1.0
DailyWeatherUrl=https://atlas.microsoft.com/weather/forecast/daily/json?api-version=1.0&query=
```

### Create a Container to save all weather icons

Bot uses Storate Container with weather icons to show icons in the weather adaptive cards. Create a Container in your Azure portal. Copy all icons from folder `resources/weather-icons/*` to your folder created in the container.

Once you created container and copied icons, update `.env` with your `WeatherIconsUrl` you can find on the `Properties` page of the container.

```text
WeatherIconsUrl="Your container folder url"
```

### Create a CosmosDB database

The bot uses CosmosDB database to store user and conversation state. CosmosDB resource, database, and container setup steps can be found [here](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-v4-storage?view=azure-bot-service-4.0&tabs=javascript#using-cosmos-db)

Once you created database and container, update `.env` with your `CosmosDbEndpoint`, `CosmosDbAuthKey`, `CosmosDbDatabaseId`, and `CosmosDbContainerId`.

```text
CosmosDbEndpoint="Your database resource endpoint"
CosmosDbAuthKey="You primary key"
CosmosDbDatabaseId="Your database name"
CosmosDbContainerId="Your container name"
```

# To run the bot

- Install modules

    ```bash
    npm install
    ```
- Setup LUIS

The prerequisite outlined above contain the steps necessary to provision a language understanding model on www.luis.ai.  Refer to _Create a LUIS Application to enable language understanding_ above for directions to setup and configure LUIS.

- Start the bot

    ```bash
    npm start
    ```
## Testing the bot using Bot Framework Emulator

[Bot Framework Emulator](https://github.com/microsoft/botframework-emulator) is a desktop application that allows bot developers to test and debug their bots on localhost or running remotely through a tunnel.

- Install the Bot Framework Emulator version 4.9.0 or greater from [here](https://github.com/Microsoft/BotFramework-Emulator/releases)

### Connect to the bot using Bot Framework Emulator

- Launch Bot Framework Emulator
- File -> Open Bot
- Enter a Bot URL of `http://localhost:3978/api/messages`

## Deploy the bot to Azure

To learn more about deploying a bot to Azure, see [Deploy your bot to Azure](https://aka.ms/azuredeployment) for a complete list of deployment instructions.


## Further reading

- [Bot Framework Documentation](https://docs.botframework.com)
- [Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
- [Dialogs](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-dialog?view=azure-bot-service-4.0)
- [Gathering Input Using Prompts](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-prompts?view=azure-bot-service-4.0)
- [Activity processing](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-activity-processing?view=azure-bot-service-4.0)
- [Azure Bot Service Introduction](https://docs.microsoft.com/azure/bot-service/bot-service-overview-introduction?view=azure-bot-service-4.0)
- [Azure Bot Service Documentation](https://docs.microsoft.com/azure/bot-service/?view=azure-bot-service-4.0)
- [Azure CLI](https://docs.microsoft.com/cli/azure/?view=azure-cli-latest)
- [Azure Portal](https://portal.azure.com)
- [Language Understanding using LUIS](https://docs.microsoft.com/en-us/azure/cognitive-services/luis/)
- [Channels and Bot Connector Service](https://docs.microsoft.com/en-us/azure/bot-service/bot-concepts?view=azure-bot-service-4.0)
- [Restify](https://www.npmjs.com/package/restify)
- [dotenv](https://www.npmjs.com/package/dotenv)
