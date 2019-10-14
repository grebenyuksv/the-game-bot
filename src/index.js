require('dotenv').config();

const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const WizardScene = require('telegraf/scenes/wizard');

const { BOT_TOKEN, ADMIN_GROUP_CHAT_ID } = process.env;
const bot = new Telegraf(BOT_TOKEN);
const telegram = new Telegram(BOT_TOKEN);

//  remember to duplicate your updates via botfather's /setcommands!
const commands = {
    train: 'Дізнатися, куди можна сходити зіграти найближчим часом',
    host: 'Провести гру для своїх друзів, студентів, школярів, інопланетян',
    register: 'Зареєструватися на The Game III',
    ask: 'Поставити питання іншого характеру',
};

const startMessage = `Ласкаво прошу! Відповідайте мені на питання, або ж зробіть от що: \n${Object.keys(
    commands,
).map(key => `\n/${key} — ${commands[key]}`)}`;

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
        const forwardMessage = await telegram.forwardMessage(
            ADMIN_GROUP_CHAT_ID,
            ctx.message.chat.id,
            ctx.message.message_id,
        );
        const message = await telegram.sendMessage(
            ADMIN_GROUP_CHAT_ID,
            `Там була команда "${commands[commandName]}". Уважно: відповідайте саме на ТЕ повідомлення, не на це. Цей костиль я зробив, тому що не знайшов у API телеграма іншого способу дописати в те повідомлення команду, яку юзер обрав.`,
            {
                reply_to_message_id: forwardMessage.message_id,
            },
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

bot.command('register', ctx => ctx.reply('bit.ly/thegameukraine'));

bot.hears(/.*/, ctx => {
    try {
        console.log(JSON.stringify(ctx.message, null, 2));
        const repliedMessage = ctx.message.reply_to_message;
        //  todo fix only forward admins' messages to clients
        const shouldForwardToClient =
            ctx.message.chat.id === (repliedMessage && repliedMessage.chat.id);
        if (shouldForwardToClient) {
            // todo cosmetic reply not send
            // todo cosmetic reply to group
            telegram.sendMessage(
                repliedMessage.forward_from.id,
                ctx.message.text,
            );
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
    }
});

bot.launch();
