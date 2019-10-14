require('dotenv').config();

const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');

const bot = new Telegraf(process.env.BOT_TOKEN);
const telegram = new Telegram(process.env.BOT_TOKEN);

// bot.start(ctx => ctx.reply('Welcome!'));

bot.command('echo1', ctx => {
    console.log(JSON.stringify(ctx.message, null, 2));
    ctx.reply('Hey there echo1');
});

bot.command('custom', ctx => {
    console.log(JSON.stringify(ctx.message, null, 2));
    ctx.reply('Hey there echo1');
});

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
            const { ADMIN_GROUP_CHAT_ID } = process.env;
            console.log(
                ADMIN_GROUP_CHAT_ID,
                ctx.message.chat.id,
                ctx.message.message_id,
            );
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
