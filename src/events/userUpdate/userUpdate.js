module.exports = async (_, user) => {
  console.log("user update", user.displayName);

  user.client.bans.checkMemberName(null, user);
};
