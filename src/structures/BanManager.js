const cron = require("node-cron");
const { generateEmbed } = require("../utils/embeds");

const { GUILD_ID, USER_BEING_IMPERSONATED_ID } = process.env;

class BanManager {
  #impersonatedUserId = USER_BEING_IMPERSONATED_ID;

  constructor(client) {
    this.client = client;
  }

  async checkMemberName(guild, member) {
    try {
      if (member.id === this.#impersonatedUserId)
        return console.log("Hey, this is quads!");

      if (!guild) {
        guild = this.client.guilds.cache.get(GUILD_ID);

        member = await guild.members.fetch(member.id).catch(() => null);
        if (!member) return console.log("Not a member of guild");
      }

      const impersonatedMember = await guild.members.fetch(
        this.#impersonatedUserId
      );

      console.log(member.displayName.toLowerCase().trim());

      if (!this.matchName(member, impersonatedMember))
        return console.log(`${member.displayName} was not impersonater`);

      console.log(`${member.displayName} was impersonater`);

      await member.ban();

      this.sendNotificationInLogsChannel({
        description: `One more impersonator sent to dust, ${member} (${member.displayName})`,
        thumbnail: member.displayAvatarURL(),
        colorType: "DANGER",
      });
    } catch (error) {
      console.log(error);

      this.sendNotificationInLogsChannel({
        colorType: "DANGER",
        error: true,
        description: `Member: ${member}: ${error.message}`,
        thumbnail: member.displayAvatarURL(),
      });
    }
  }

  async start() {
    console.log("Initiating ban manager!");

    const guild = this.client.guilds.cache.get(GUILD_ID);

    await guild.members.fetch();

    console.log("Fetched all members!");
    this.loopOverMembersAndCheck();

    cron.schedule("*/5 * * * *", this.loopOverMembersAndCheck);
  }

  async loopOverMembersAndCheck() {
    const guild = this.client.guilds.cache.get(GUILD_ID);

    console.log(guild);

    console.log("Looping!!!");

    for (const member of guild.members.cache.values()) {
      await this.checkMemberName(guild, member);
    }
  }

  matchName(target, source) {
    if (target.nickname) {
      console.log(target.nickname, " has a nickname!!");

      if (
        source.nickname &&
        this.sterilizeName(target.nickname) ===
          this.sterilizeName(source.nickname)
      )
        return true;

      if (
        this.sterilizeName(target.nickname) ===
        this.sterilizeName(source.displayName)
      )
        return true;
    }

    if (
      this.sterilizeName(target.displayName) ===
      this.sterilizeName(source.displayName)
    )
      return true;
  }

  sterilizeName(name) {
    return name.toLowerCase().trim();
  }

  async sendNotificationInLogsChannel(data) {
    const embed = generateEmbed({
      ...data,
      title: data.error
        ? "Something went wrong 😞"
        : "Banned a impersonator 💥",
    });

    await this.client.sendLogsMessage({ embeds: [embed] }).catch(console.error);
  }
}

module.exports = BanManager;
