const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

exports.getButtonRow = (ticker) => {
  if (!ticker) return; // for compatibiltity with logs sending , no buttons
  const analyzeBtn = new ButtonBuilder()
    .setEmoji("🔎")
    .setLabel("Analyze")
    .setStyle(ButtonStyle.Success)
    .setCustomId("analyze_" + ticker);

  const linkBtn = new ButtonBuilder()
    .setEmoji("📈")
    .setLabel("Chart")
    .setStyle(ButtonStyle.Link)
    .setURL(`https://www.tradingview.com/chart/?symbol=${ticker}`);

  const row = new ActionRowBuilder().addComponents(analyzeBtn, linkBtn);
  return row;
};
