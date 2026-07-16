const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// 1. Apne Telegram Bot ka Token yahan daalo (BotFather se jo mila tha)
const token = '8937519104:AAHfeDTERGAdXwOiCgJJJSmn7ubRWuN1ado';

// 2. Apni Vercel Website ka URL yahan daalo
const webAppUrl = 'https://aura-mining-bot.vercel.app'; 

// Bot initialize karein
const bot = new TelegramBot(token, { polling: true });
const app = express();
const port = process.env.PORT || 3000;

// Render/Glitch ke liye ek basic server taaki hosting band na ho
app.get('/', (req, res) => {
    res.send('Aura Miner Bot is running 24/7!');
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

// Jab koi user /start likhega tab ye reply karega
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.first_name || "Miner";

    bot.sendMessage(chatId, `Hi ${username}! Welcome to Aura Miner Bot ⚡\n\nApp ko launch karne ke liye neeche diye gaye button par click karein aur $AURA tokens mine karna shuru karein!`, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚡ Play Aura Miner', web_app: { url: webAppUrl } }
                ]
            ]
        }
    });
});

console.log('Bot successfully started...');
