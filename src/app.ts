import { Bot, MemoryStorage, BotStateManager, ConsoleLogger, Intent } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder-services';
import { Translator } from './translate-middleware';
import * as restify from "restify";
import { LuisRecognizer } from 'botbuilder-ai';


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

const luis = new LuisRecognizer('029ad101-c978-4bbe-b2ae-e95c193ad580', '9c33ab53fea54a71831fa4098fa845a3');

const getActiveLanguage = (context: BotContext): string => {
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

const setActiveLanguage = (context: BotContext): Promise<boolean> => {
    return LuisRecognizer.recognize(context.request.text, '029ad101-c978-4bbe-b2ae-e95c193ad580', '9c33ab53fea54a71831fa4098fa845a3')
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
                return Promise.resolve(true);
            } else {
                return Promise.resolve(false);
            }
        })
}

const bot = new Bot(adapter)
    .use(new ConsoleLogger())
    .use(new MemoryStorage())
    .use(new BotStateManager())
    .use(new Translator("5fa547f29f94485e9eeb78a7f393adf7", "en", getActiveLanguage, setActiveLanguage))
    .onReceive((context) => {
        if (context.request.type === 'message') {
            context.reply(`You just said:`).reply(`"${context.request.text}"`);
        }
    });
