require('dotenv').config();
const { pool, query } = require('./src/config/database');
const { generateNodeToken } = require('./src/wss/authService');

async function main() {
    try {
        const { rawToken, tokenHash } = await generateNodeToken();
        const res = await query(
            `INSERT INTO wss_nodes (name, token_hash, status) VALUES ($1, $2, 'offline') RETURNING id`,
            ['TestNode', tokenHash]
        );
        console.log(`Node Created with ID: ${res.rows[0].id}`);
        console.log(`Your Token is: ${rawToken}`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
main();
