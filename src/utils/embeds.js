const { EmbedBuilder } = require("discord.js");

exports.generateEmbed = ({ description, colorType, title, thumbnail }) => {
  const embed = new EmbedBuilder().setColor(
    colorType === "DANGER" ? "Red" : "Green"
  );

  title && embed.setTitle(title);
  description && embed.setDescription(description);
  thumbnail && embed.setThumbnail(thumbnail);

  return embed;
};
