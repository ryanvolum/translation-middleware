import { Middleware, Activity, ConversationResourceResponse, ActivityAdapter } from "botbuilder";
import { LuisRecognizer } from "botbuilder-ai";
import * as cs from 'cognitive-services';

interface translationPreferences {
    toLanguageCode: string,
    fromLanguageCode: string
}

export class Translator implements Middleware {
    private translationKey: string;
    private botLanguage: string;
    private getUserLanguage: (context: BotContext) => string;
    private setUserLanguage: (context: BotContext) => Promise<boolean>;

    constructor(translationKey: string, botLanguage: string, getUserLanguage: (c: BotContext) => string, setUserLanguage: (context: BotContext) => Promise<boolean>) {
        this.translationKey = translationKey;
        this.botLanguage = botLanguage;
        this.getUserLanguage = getUserLanguage;
        this.setUserLanguage = setUserLanguage;
    }

    public async receiveActivity(context: BotContext, next: () => Promise<void>): Promise<void> {
        if (context.request.type === "message") {
            //Use the injected getUserLanguage function to find the user's current language. If none, assume they're speaking the bot's language
            let language = this.getUserLanguage(context) || this.botLanguage;

            await this.translate(context.request.text, language, this.botLanguage)
                .then(response => {
                    context.request.text = response;
                }).catch(err => {
                    console.warn(err);
                    return next();
                });

            return this.setUserLanguage(context)
                .then(changedLanguage => {
                    //If user's language was not changed, continue to flow through middleware
                    if (!changedLanguage) {
                        return next();
                    }
                    //Else (no code necessary) the message is intercepted
                })
        }
    }

    //TODO: use batch translation api...
    //Translates all outgoing messages, which are batched in an array
    public postActivity(context: BotContext, activities: Partial<Activity>[], next: () => Promise<ConversationResourceResponse[]>): Promise<ConversationResourceResponse[]> {
        let language = this.getUserLanguage(context);
        if (language) {
            let promises = [];
            return Promise.all(
                //creates an array of promises to translate the outgoing messages
                activities.map((activity, i) => {
                    if (activity.text) {
                        return this.translate(activity.text, this.botLanguage, language)
                            .then(translation => {
                                activities[i].text = translation;
                            })
                    }
                })
            ).then(_ => next())
                .catch(err => {
                    console.warn(err);
                    return next();
                })
        } else {
            return next();
        }
    }

    //Translates using the Microsoft Translator Text API
    public translate = (text: string, from: string, to: string): Promise<string> => {
        if (from !== to) {
            const translationClient = new cs.textTranslator({
                apiKey: this.translationKey
            });
            const parameters = {
                from: from,
                to: to,
                text: text,
                contentType: "text/plain"
            };
            return translationClient.translate({ parameters });
        } else {
            //if the from and to language are the same 
            return Promise.resolve(text);
        }
    }
}




