const { CommandType } = require("wokcommands");
const { handleTickerAnalysisInteraction } = require("../utils/interaction");
// const { handleInteractionError } = require("../utils/interaction");
module.exports = {
  description: "check a specific ticker.",
  async callback({ interaction }) {
    const ticker = interaction.options.getString("ticker");

    handleTickerAnalysisInteraction(interaction, ticker.toUpperCase(), false);
  },
  async autocomplete(_, __, interaction) {
    const option = interaction.options.getFocused(true);

    return interaction.client.tickerFecther
      .getTickersCache()
      .filter((t) =>
        t.symbol.toLowerCase().startsWith(option.value.toLowerCase())
      )
      .map((t) => t.symbol);
  },
  options: [
    {
      name: "ticker",
      description: "ticker to select",
      type: 3,
      required: true,
      autocomplete: true,
    },
  ],
  guildOnly: true,
  type: CommandType.SLASH,
};
