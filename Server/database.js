const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordrally_db',
    connectionLimit: 5
});

async function recordGameResult(winner, loser) {
    let conn;
    try {
        conn = await pool.getConnection();
        const query = 'INSERT INTO matches (winner, loser, match_date) VALUES (?, ?, NOW())';
        await conn.query(query, [winner, loser]);
    } finally {
        if (conn) conn.end();
    }
}

async function getMatchHistory() {
    let conn;
    try {
        conn = await pool.getConnection();
        const results = await conn.query('SELECT *, DATE_FORMAT(match_date, "%Y-%m-%d %H:%i:%s") AS formatted_date FROM matches');
        return results;
    } finally {
        if (conn) conn.end();
    }
}

module.exports = { recordGameResult, getMatchHistory };
