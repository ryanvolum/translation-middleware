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
    private getActiveLanguage: (context: BotContext) => string;
    private setActiveLanguage: (context: BotContext) => Promise<boolean>;

    constructor(translationKey: string, botLanguage: string, getActiveLanguage: (c: BotContext) => string, setActiveLanguage: (context: BotContext) => Promise<boolean>) {
        this.translationKey = translationKey;
        this.botLanguage = botLanguage;
        this.getActiveLanguage = getActiveLanguage;
        this.setActiveLanguage = setActiveLanguage;
    }

    public async receiveActivity(context: BotContext, next: () => Promise<void>): Promise<void> {
        if (context.request.type === "message") {
            let language = this.getActiveLanguage(context) || this.botLanguage;

            await this.translate(context.request.text, language, this.botLanguage)
                .then(response => {
                    context.request.text = response;
                }).catch(err => {
                    console.warn(err);
                    return next();
                });

            return this.updateLanguage(context, next);
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

    public updateLanguage = (context: BotContext, next: () => Promise<any>): Promise<void> => {
        return this.setActiveLanguage(context)
            .then(changedLanguage => {
                if (!changedLanguage) {
                    return next();
                }
            })
    }
    //switches to and from
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




