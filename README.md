# translation-middleware
This is a TypeScript/Node that project demonstrates a piece of middleware that makes a bot multilingual. See [Brandon's .NET translator](https://github.com/brandonh-msft/botbuilder-dotnet/tree/translation-middleware/samples/Microsoft.Bot.Samples.TranslatorMiddleware) for the C# version.

![Conversation](https://github.com/ryanvolum/translation-middleware/img/sample-conversation.jpg)


This project includes the middleware in ```translate-middleware.ts``` and a sample bot in samples ```/luis-sample/app.ts```. The sample uses TypeScript - see Setup section for compilation instructions.

#### Terrible ascii pseudocode:

(message) -----> translate from user language to bot language ----->

(translated message) -----> check if message is trying to update user's languge. 

If so, update language and intercept message ----X

Else, pass translated message along to the rest of your middleware and bot logic
(translated message) -----> 

bot logic -----> bot's responses ----->

([bot's responses in bot language]) -----> Then, translate bot's responses from bot language to user language -----> 

([bot's messages in user's language]) -----> message to user (in user's language)

## Usage
As with any SDKv4 middleware, you include the translator middleware with a bot.use declaration:
```ts
    .use(new Translator(process.env.MICROSOFT_TRANSLATOR_KEY, "en", getUserLanguage, setUserLanguage))
```
This middleware takes four arguments:

### translatorKey
This middleware uses the [Microsoft Translator API](https://www.microsoft.com/en-us/translator/translatorapi.aspx) to translate incoming and outgoing messages. Follow linked instructions to get your key!

### botLanguage
The language that your bot speaks. This is the language that the middleware will translate incoming messages into and outgoing messages out of. If your bot uses an NLP service like LUIS.ai, this should be the language (or one of the languages) that your model is trained on. Note that you must pass in the language code of the language you're using (e.g. "en" or "es") - see supported language codes [here](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/languages). Note, this middleware assumes that the user's language starts off as the bot's language. You can change this by adding custom logic in your getUserLanguage function. 

### getUserLanguage/setUserLanguage

Your bot needs to know where to get/set user language preferences. This middleware could have been opinionated by getting and setting this info in memory, but was built on the philosophy that developers should be able to choose how, where and when state should be stored. getUserLanguage and setUserLanguage are then developer-defined functions that get passed into this middleware

#### getUserLanguage
A function that takes the bot context and returns the user's language. In the example `app.ts`, those preferences are stored in the bot's state: ```context.state.user.translateTo```. 

#### setUserLanguage
A function that updates the user's language and returns a boolean promise. The promise resolves to true if the language was updated, ergo short circuiting the conversation (the message will not flow into the rest of the middleware or your bot logic).

In the example `app.ts`, this uses a pretrained LUIS model with a trained intent of "changeLanguage" and an entity of "language::toLanguage". It calls the model, and if the changeLanguage intent is triggered, the conversation the middleware will take over the conversation by returning ```Promise.resolve(true)```. If LUIS also found an entity of type "language::toLanguage", then it knows what language to update to and sets that language in the same place that ```getUserLanguage``` will pull it from. Note, the sample also has some helpers (```isSupportedLanguage```, ```getLanguageCode``` and ```setLanguage```) that ```setUserLanguage``` uses to set language. 

If the language is not changed and the intent "changeLanguage" is not triggered, then we want the message to fall through to the rest of our middleware and bot logic, so we return Promise.resolve(false).
 
# Setup

### Navigate to sample folder in the cmd line

### Install dependencies

```
npm install
```

### Add keys to your .env file
Open the .env file in your root directory. Add your Microsoft Translator API key, your Luis App Id and your Luis App Password.

If you're using the luis-sample, you need to host a LUIS app with the "changeLanguage" intent and the "language::toLanguage" entity. Remember that you can define your setUserLanguage to change languages based on whatever trigger you like (An NLP model triggering a specific intent, a button being pressed, a regular expression firing, etc.). 

The implementation we use here is just one way of doing things :)

### Compile Typescript

Compile:
```
tsc
```
or compile and watch:
```
tsc -w
```
These commands will create a lib directory with the js source code and associated sourcemaps (for debugging the TS code).

### Run Sample
```
node lib/app.js
```