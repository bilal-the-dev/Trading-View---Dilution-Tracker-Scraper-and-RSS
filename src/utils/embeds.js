const { EmbedBuilder } = require("discord.js");

exports.generateEmbed = (description) => {
  const embed = new EmbedBuilder()
    .setColor("Green")
    .setDescription(description);

  return embed;
};
