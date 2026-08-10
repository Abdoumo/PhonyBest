const { query } = require('./src/config/database');
async function run() {
  await query("DELETE FROM usb_auth_keys WHERE user_id = (SELECT id FROM users WHERE username = 'admin')");
  console.log('Deleted');
  process.exit(0);
}
run();
