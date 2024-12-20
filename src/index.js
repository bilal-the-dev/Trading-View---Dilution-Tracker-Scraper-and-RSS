const { IntentsBitField } = require("discord.js");
const ExtendedClient = require("./client/Client");

const { TOKEN } = process.env;

const client = new ExtendedClient({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.login(TOKEN);
