exports.replyOrEditInteraction = async (interaction, reply) => {
  try {
    if (interaction.replied || interaction.deferred)
      await interaction.editReply(reply);
    else await interaction.reply(reply);
  } catch (error) {
    console.log(error);
  }
};

exports.handleInteractionError = async (interaction, error) => {
  console.log(error);

  const content = `Err! \`${error.message}\``;

  await this.replyOrEditInteraction(interaction, { content, ephemeral: true });
};

exports.handleTickerAnalysisInteraction = async (
  interaction,
  ticker,
  ephemeral = true
) => {
  try {
    await interaction.deferReply({ ephemeral });

    const description = await interaction.client.fetchInfoAboutTicker(ticker);

    // console.log(description);
    await interaction.editReply({
      embeds: [{ description }],
    });
  } catch (error) {
    this.handleInteractionError(interaction, error);
  }
};
