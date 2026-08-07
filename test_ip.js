const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const res = await pool.query("SELECT id, user_id, ip_address, action, created_at FROM session_logs WHERE action = 'usb_login' ORDER BY id DESC LIMIT 5");
  console.log("USB_LOGIN LOGS:", res.rows);
  const loginRes = await pool.query("SELECT id, user_id, ip_address, action, created_at FROM session_logs WHERE action = 'login' ORDER BY id DESC LIMIT 5");
  console.log("WEB_LOGIN LOGS:", loginRes.rows);
  process.exit(0);
}
check();
