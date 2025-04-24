const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let db;

module.exports = async () => {
  if (!db)
    db = await open({
      filename: "./database.db",
      driver: sqlite3.Database,
    });

  return db;
};
