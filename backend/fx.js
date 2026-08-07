require('dotenv').config();
const { pool, query } = require('./src/config/database');

async function fixDb() {
  try {
    console.log('Altering wss_pools.pool_id to VARCHAR(255)...');
    await query('ALTER TABLE wss_pools ALTER COLUMN pool_id TYPE VARCHAR(255);');
    
    console.log('Altering wss_dongles.pool_ids to VARCHAR(255)[]...');
    await query('ALTER TABLE wss_dongles ALTER COLUMN pool_ids TYPE VARCHAR(255)[] USING pool_ids::VARCHAR(255)[];');

    console.log('✅ DB fix complete.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
fixDb();
