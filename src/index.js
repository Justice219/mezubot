require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { initializeSupabase } = require('./utils/supabase');
const { initializeSocialMedia } = require('./utils/socialMediaManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.tickets = new Collection();

// Load command and event handlers
require('./handlers/commands')(client);
require('./handlers/events')(client);

client.once('ready', async () => {
    console.log('Bot is ready!');
    // await initializeSocialMedia(client); // Comment this out for now
});

client.login(process.env.DISCORD_TOKEN);

// Export client for use in other files
module.exports = { client }; 