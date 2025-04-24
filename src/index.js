require("./database/tables"); // to create db and tables
const { IntentsBitField, Partials } = require("discord.js");
const ExtendedClient = require("./client/Client");

const { TOKEN } = process.env;

const client = new ExtendedClient({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
  partials: [Partials.User, Partials.GuildMember],
});

client.login(TOKEN);
