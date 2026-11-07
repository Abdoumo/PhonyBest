const { pool } = require('./src/config/database');
async function run() {
  try {
    const client = await pool.connect();
    await client.query("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check");
    await client.query("ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('flexy','flexy_gros','idoom','card','buy_cards','transfer_cards','wallet_add','wallet_remove','transfer','debt'))");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS self_recharge_limit DECIMAL(12,2) DEFAULT 0.00");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS self_recharge_total DECIMAL(12,2) DEFAULT 0.00");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS self_recharge_rule VARCHAR(20) DEFAULT 'total'");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS self_recharge_enabled BOOLEAN DEFAULT true");
    await client.query("ALTER TABLE transfers ALTER COLUMN type TYPE VARCHAR(50)");
    await client.query("ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_type_check");
    await client.query("ALTER TABLE transfers ADD CONSTRAINT transfers_type_check CHECK (type IN ('transfer','deposit','withdrawal','debt_payment','debt','cash','payment','debt_recovery','cash_recovery','payment_recovery','self_recharge','profit_transfer'))");
    await client.query("ALTER TABLE transfers ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100)");
    console.log('Success');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
