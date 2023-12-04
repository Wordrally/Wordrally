const mariadb = require('mariadb');

const pool = mariadb.createPool({
   host: 'localhost', 
   user: 'root', 
   password: '',
   database: 'wordrally_db',
   connectionLimit: 5
});

async function recordGameResult(gameId, winnerId, loserId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const query = 'INSERT INTO game_results (game_id, winner_id, loser_id, date) VALUES (?, ?, ?, NOW())';
      await conn.query(query, [gameId, winnerId, loserId]);
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
        const results = await conn.query('SELECT * FROM game_results'); // Adjust query as needed
        return results;
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
}

module.exports = { recordGameResult, getMatchHistory };

 