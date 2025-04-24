const getDb = require("./index");

(async () => {
  const db = await getDb();

  await db.exec(
    "CREATE TABLE IF NOT EXISTS TV_DATA (session_id TEXT NOT NULL, session_id_sign_in TEXT NOT NULL)"
  );
})();
