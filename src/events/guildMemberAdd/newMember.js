module.exports = async (member) => {
  if (member.guild.id !== process.env.GUILD_ID) return;
  member.client.bans.checkMemberName(member.guild, member);
};
