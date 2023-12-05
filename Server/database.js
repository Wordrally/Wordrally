const mariadb = require('mariadb');

const pool = mariadb.createPool({
   host: 'localhost', 
   user: 'root', 
   password: '',
   database: 'wordrally_db',
   connectionLimit: 5
});

async function recordGameResult(winnerId, loserId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const query = 'INSERT INTO matches (winner, loser) VALUES (?, ?)';
      await conn.query(query, [winnerId, loserId]);
    } catch (err) {
      throw err;
    } finally {
      if (conn) conn.end();
    }
 }

async function getMatchHistory() {
    let conn;
    try {
        conn = await pool.getConnection();
        const results = await conn.query('SELECT * FROM matches'); 
        return results;
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
}

module.exports = { recordGameResult, getMatchHistory };