import { Middleware, Activity, ConversationResourceResponse, ActivityAdapter } from "botbuilder";
import { LuisRecognizer } from "botbuilder-ai";
import * as cs from 'cognitive-services';

interface translationPreferences {
    toLanguageCode: string,
    fromLanguageCode: string
}

export class translate implements Middleware {
    private translationKey: string;
    private botLanguage: string;
    private getActiveLanguage: (context: BotContext) => string;

    constructor(translationKey: string, botLanguage: string, getActiveLanguage: (c: BotContext) => string) {
        this.translationKey = translationKey;
        this.botLanguage = botLanguage;
        //assuming synchronous for now...
        this.getActiveLanguage = getActiveLanguage;
    }

    public receiveActivity(context: BotContext, next: () => Promise<void>): Promise<void> {
        let language = this.getActiveLanguage(context);
        if (language) {
            return this.translate(context.request.text, language, this.botLanguage)
                .then(response => {
                    context.request.text = response;
                    return next();
                }).catch(err => {
                    console.warn(err);
                    return next();
                });
        } else {
            return next();
        }
    }
    //TODO: use batch translation api...
    public postActivity(context: BotContext, activities: Partial<Activity>[], next: () => Promise<ConversationResourceResponse[]>): Promise<ConversationResourceResponse[]> {
        let language = this.getActiveLanguage(context);
        if (language) {
            return Promise.all(
                activities
                    .map(activity => {
                        return this.translate(activity.text, this.botLanguage, language)
                    })
            )
                .then(res => {
                    res.forEach((translation, i) => {
                        activities[i].text = translation;
                    })
                    return next();
                }).catch(err => {
                    console.warn(err);
                    return next();
                })
        } else {
            return next();
        }
    }

    //switches to and from
    public translate = (text: string, from: string, to: string): Promise<string> => {
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
    }
}



