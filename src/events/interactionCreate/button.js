const { handleTickerAnalysisInteraction } = require("../../utils/interaction");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  const [action, ticker] = customId.split("_");

  if (action !== "analyze") return;
  handleTickerAnalysisInteraction(interaction, ticker.toUpperCase());
};
