const getDB = require("./index");

exports.getTVSession = async () => {
  const db = await getDB();

  return await db.get("SELECT * FROM TV_DATA;");
};

exports.setTVSession = async (session_id, session_id_sign_in) => {
  const db = await getDB();

  await db.run("DELETE FROM TV_DATA;");

  // Insert new session data
  await db.run(
    `INSERT INTO TV_DATA (session_id, session_id_sign_in) VALUES (?, ?)`,
    [session_id, session_id_sign_in]
  );
};
