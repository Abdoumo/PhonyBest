const { pool } = require('./src/config/database');
async function run() {
  try {
    const client = await pool.connect();
    await client.query("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check");
    await client.query("ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('flexy','flexy_gros','idoom','card','buy_cards','transfer_cards','wallet_add','wallet_remove','transfer','debt'))");
    console.log('Success');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
