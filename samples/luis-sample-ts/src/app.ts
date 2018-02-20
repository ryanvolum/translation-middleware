import { Bot, MemoryStorage, BotStateManager, Intent, Middleware, Activity, ConversationResourceResponse } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder-services';
import { Translator } from 'botbuilder-translate';
import { LuisRecognizer } from 'botbuilder-ai';
import * as restify from "restify";
import * as dotenv from 'dotenv';
dotenv.config();

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter and listen to servers '/api/messages' route.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', <any>adapter.listen());

const getUserLanguage = (context: BotContext): string => {
    if (context.request.type === 'message' && context.state.user.translateTo) {
        return context.state.user.translateTo;
    } else {
        return null;
    }
}

const languageMap = {
    "danish": "da", "dutch": "nl", "english": "en", "finnish": "fi", "french": "fr", "german": "de", "greek": "el", "italian": "it", "japanese": "ja", "norwegian": "no", "polish": "pl", "portuguese": "pt", "russian": "ru", "spanish": "es", "swedish": "sv", "turkish": "tr"
};

const isSupportedLanguage = (language) => {
    return languageMap.hasOwnProperty(language.toLowerCase());
}

const getLanguageCode = (language) => {
    return languageMap[language];
}

const setLanguage = (context: BotContext, language): void => {
    context.state.user.translateTo = getLanguageCode(language);
}

const setUserLanguage = (context: BotContext, next: () => Promise<void>): Promise<void> => {
    return LuisRecognizer.recognize(context.request.text, process.env.MICROSOFT_LUIS_APP_ID, process.env.MICROSOFT_LUIS_APP_PASSWORD)
        .then(intent => {
            if (intent && intent.name === 'changeLanguage') {
                let entity = (intent.entities && intent.entities[0]) ? intent.entities[0] : null;

                if (entity && entity.type === 'language::toLanguage') {

                    if (isSupportedLanguage(entity.value)) {
                        setLanguage(context, entity.value);
                        context.reply(`Changing your language to ${entity.value}`);
                    } else {
                        context.reply(`${entity.value} is not a supported language.`);
                    }

                } else {
                    context.reply(`You have to tell me what language to translate to!`);
                }
                //intercepts message
            } else {
                return next();
            }
        })
}

const bot = new Bot(adapter)
    .use(new MemoryStorage())
    .use(new BotStateManager())
    .use(new Translator(process.env.MICROSOFT_TRANSLATOR_KEY, "en", getUserLanguage, setUserLanguage))
    .onReceive((context) => {
        if (context.request.type === 'message') {
            context.reply(`You just said:`)
                .showTyping()
                .delay(1000)
                .reply(`"${context.request.text}"`);
        }
    });
