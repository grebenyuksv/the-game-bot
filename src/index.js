require('dotenv').config();

const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const WizardScene = require('telegraf/scenes/wizard');

const { BOT_TOKEN, ADMIN_GROUP_CHAT_ID, SENTRY_DSN } = process.env;
const bot = new Telegraf(BOT_TOKEN);
const telegram = new Telegram(BOT_TOKEN);

const Sentry = require('@sentry/node');
Sentry.init({
    dsn: SENTRY_DSN,
});
Sentry.captureMessage('launched');

bot.use((ctx, next) => {
    Sentry.captureMessage(JSON.stringify(ctx.message));
    return next(ctx);
});

//  remember to duplicate your updates via botfather's /setcommands!
const commands = {
    train:
        'підказати, куди можна сходити зіграти найближчим часом, щоб потренуватись',
    host:
        'допомогти з проведенням гри для своїх друзів, студентів, школярів, інопланетян чи серед кого ви там хочете популяризувати інтелектуалочки',
    register:
        'допомогти зареєструватися на «The Game III» (зараз доступна можливість зареєструватися безкоштовно)',
    ask: 'відповісти на питання іншого характеру',
};

const startMessage = `Вітаю! Якщо ви хочете відповісти на останнє поставлене питання, будь ласка, пишіть відразу в чат нижче. Ще я вмію таке:\n\n${Object.keys(
    commands,
)
    .map(key => `/${key} — ${commands[key]}`)
    .join(';\n')}`;

bot.start(ctx => ctx.reply(startMessage));

// Create scene manager
const stage = new Stage();

bot.use(session());
bot.use(stage.middleware());

const createSingleQuestionScene = (commandName, question) => {
    // Train scene
    const scene = new Scene(commandName);
    scene.enter(ctx => ctx.reply(question));
    scene.hears(/.*/, async ctx => {
        console.log(JSON.stringify(ctx.message, null, 2));
        const { first_name, last_name } = ctx.message.from;
        const message = await telegram.sendMessage(
            ADMIN_GROUP_CHAT_ID,
            `/${commandName} від ${first_name} ${last_name}:`,
        );
        const forwardMessage = await telegram.forwardMessage(
            ADMIN_GROUP_CHAT_ID,
            ctx.message.chat.id,
            ctx.message.message_id,
        );
        console.log(`Forwarded to admins`);
        ctx.scene.leave();
    });
    scene.leave(ctx => {
        ctx.reply('Дякую, я скоро відповім!');
    });
    return scene;
};

stage.register(
    createSingleQuestionScene(
        'train',
        'Напишіть населений пункт, звідки ви, і рівень вашої гри по шкалі від 0 до 10:',
    ),
);
bot.command('train', ctx => ctx.scene.enter('train'));

stage.register(
    createSingleQuestionScene('host', 'Напишіть населений пункт, звідки ви:'),
);
bot.command('host', ctx => ctx.scene.enter('host'));

stage.register(createSingleQuestionScene('ask', 'Напишіть питання:'));
bot.command('ask', ctx => ctx.scene.enter('ask'));

bot.command('register', ctx => ctx.reply('bit.ly/thegameukraine'));

const handleStickerOrAnyMessage = ctx => {
    try {
        console.log(JSON.stringify(ctx.message, null, 2));
        const repliedMessage = ctx.message.reply_to_message;
        //  todo fix only forward admins' messages to clients
        const shouldForwardToClient =
            ctx.message.chat.id === (repliedMessage && repliedMessage.chat.id);
        if (shouldForwardToClient) {
            // todo cosmetic reply not send
            // todo cosmetic reply to group
            if (ctx.message.text) {
                telegram.sendMessage(
                    repliedMessage.forward_from.id,
                    ctx.message.text,
                );
            } else if (ctx.message.sticker) {
                telegram.sendSticker(
                    repliedMessage.forward_from.id,
                    ctx.message.sticker.file_id,
                );
            }
            console.log(`Forwarded to author`);
        } else {
            telegram.forwardMessage(
                ADMIN_GROUP_CHAT_ID,
                ctx.message.chat.id,
                ctx.message.message_id,
            );
            console.log(`Forwarded to admins`);
        }
    } catch (e) {
        console.error(e);
        Sentry.captureException(e);
    }
};

bot.on('sticker', handleStickerOrAnyMessage);
bot.hears(/.*/, handleStickerOrAnyMessage);

bot.launch();
