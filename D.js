require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

const token = '7202204800:AAFpMiUdEc5aC9iHSnvvcRwIA-5M4wtRl-A'
const screenshotApiKey = '96fef9';
const googleApiKey = 'AIzaSyAy_aJSnogvGN0WHF8YdD2fnm7_GoZiBfg';
const searchEngineId = '9758747b3ee50460c'; // Replace with your actual search engine ID

const bot = new TelegramBot(token, { polling: true });

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
Welcome to the Screenshot Bot! 🤖

You can use the following commands:

1. Capture a screenshot of a webpage:
!cap <URL>

2. Search Google and capture a screenshot of the results:
!search <query>

For example:
!cap https://example.com
!search OpenAI GPT-4

Just send me a URL or search query, and I'll capture the screenshot for you. Enjoy!
    `;
    bot.sendMessage(chatId, welcomeMessage);
});

// Handle !cap command
bot.onText(/!cap (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    // Basic URL validation
    if (!url.match(/^https?:\/\/[^\s/$.?#].[^\s]*$/)) {
        await bot.sendMessage(chatId, 'Please provide a valid URL.');
        return;
    }

    try {
        const screenshotUrl = `https://api.screenshotmachine.com?key=${screenshotApiKey}&url=${encodeURIComponent(url)}&dimension=1024xfull`;
        const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });

        const screenshotPath = `screenshot-${chatId}.png`;
        fs.writeFileSync(screenshotPath, response.data);

        await bot.sendPhoto(chatId, screenshotPath);
        fs.unlinkSync(screenshotPath);

        console.log(`Screenshot sent to chat ID: ${chatId}`);
    } catch (error) {
        console.error(`Error capturing screenshot: ${error.message}`);
        await bot.sendMessage(chatId, `Failed to capture screenshot: ${error.message}`);
    }
});

// Handle !search command
bot.onText(/!search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];
    const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${googleApiKey}&cx=${searchEngineId}`;

    try {
        const searchResponse = await axios.get(googleSearchUrl);
        const items = searchResponse.data.items;

        if (items && items.length > 0) {
            const firstResultUrl = items[0].link;
            const screenshotUrl = `https://api.screenshotmachine.com?key=${screenshotApiKey}&url=${encodeURIComponent(firstResultUrl)}&dimension=1024xfull`;
            const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });

            const screenshotPath = `search-${chatId}.png`;
            fs.writeFileSync(screenshotPath, response.data);

            await bot.sendPhoto(chatId, screenshotPath);
            fs.unlinkSync(screenshotPath);

            console.log(`Google search screenshot sent to chat ID: ${chatId}`);
        } else {
            await bot.sendMessage(chatId, 'No search results found.');
        }
    } catch (error) {
        console.error(`Error capturing screenshot: ${error.message}`);
        await bot.sendMessage(chatId, `Failed to capture screenshot: ${error.message}`);
    }
});

// Handle inline queries
bot.on('inline_query', async (query) => {
    const { id, query: text } = query;
    let results = [];

    if (text.startsWith('!cap ')) {
        const url = text.slice(5).trim();
        if (!url.match(/^https?:\/\/[^\s/$.?#].[^\s]*$/)) {
            results = [
                {
                    type: 'article',
                    id: '1',
                    title: 'Error',
                    input_message_content: {
                        message_text: 'Please provide a valid URL.'
                    }
                }
            ];
        } else {
            try {
                const screenshotUrl = `https://api.screenshotmachine.com?key=${screenshotApiKey}&url=${encodeURIComponent(url)}&dimension=1024xfull`;
                const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });

                const screenshotPath = `screenshot-${id}.png`;
                fs.writeFileSync(screenshotPath, response.data);

                results = [
                    {
                        type: 'photo',
                        id: '1',
                        photo_url: `attach://screenshot-${id}.png`,
                        thumb_url: `attach://screenshot-${id}.png`,
                        photo_width: 800,
                        photo_height: 600
                    }
                ];
                fs.unlinkSync(screenshotPath);
            } catch (error) {
                results = [
                    {
                        type: 'article',
                        id: '1',
                        title: 'Error',
                        input_message_content: {
                            message_text: `Failed to capture screenshot: ${error.message}`
                        }
                    }
                ];
            }
        }
    } else if (text.startsWith('!search ')) {
        const queryText = text.slice(8).trim();
        const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(queryText)}&key=${googleApiKey}&cx=${searchEngineId}`;

        try {
            const searchResponse = await axios.get(googleSearchUrl);
            const items = searchResponse.data.items;

            if (items && items.length > 0) {
                const firstResultUrl = items[0].link;
                const screenshotUrl = `https://api.screenshotmachine.com?key=${screenshotApiKey}&url=${encodeURIComponent(firstResultUrl)}&dimension=1024xfull`;
                const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });

                const screenshotPath = `search-${id}.png`;
                fs.writeFileSync(screenshotPath, response.data);

                results = [
                    {
                        type: 'photo',
                        id: '1',
                        photo_url: `attach://search-${id}.png`,
                        thumb_url: `attach://search-${id}.png`,
                        photo_width: 800,
                        photo_height: 600
                    }
                ];
                fs.unlinkSync(screenshotPath);
            } else {
                results = [
                    {
                        type: 'article',
                        id: '1',
                        title: 'No Results',
                        input_message_content: {
                            message_text: 'No search results found.'
                        }
                    }
                ];
            }
        } catch (error) {
            results = [
                {
                    type: 'article',
                    id: '1',
                    title: 'Error',
                    input_message_content: {
                        message_text: `Failed to capture screenshot: ${error.message}`
                    }
                }
            ];
        }
    }

    bot.answerInlineQuery(id, results, { is_personal: true });
});

console.log('Bot is running...');