require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool, query } = require('./src/config/database');
const http = require('http');

async function triggerFlexy() {
  try {
    console.log('🔍 Looking up an Admin user...');
    // Find the first admin user to generate a token for
    const res = await query("SELECT id, role FROM users WHERE role = 'ADMIN' LIMIT 1");
    
    if (res.rows.length === 0) {
      console.error('❌ No Admin user found in database!');
      process.exit(1);
    }
    
    const admin = res.rows[0];
    
    // Generate a valid JWT token for this admin
    const token = jwt.sign(
      { userId: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('🔑 Generated Admin Token. Sending HTTP request to trigger Flexy...');

    // The data we want to send
    const postData = JSON.stringify({
      phone: "0550123456",
      amount: 5,               // Set to 5 so it passes the ModemGrid balance check (which is 10)
      operator: "mobilis",     // Matches the pool we created in dm.js
      offer: "sold_mobilis",   // Forces the backend to use the 'sold_mobilis' API
      variables: {
        "test": 10   // Custom variables sent straight to the modem
      }
    });

    const options = {
      hostname: '127.0.0.1',
      port: process.env.PORT || 3000,
      path: '/api/v1/flexy/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        console.log('✅ Response from backend API:');
        console.log(JSON.parse(data));
        process.exit(0);
      });
    });

    req.on('error', (e) => {
      console.error(`❌ HTTP Request Error: ${e.message}`);
      console.log('Make sure your backend (npm start) is running and the port is correct.');
      process.exit(1);
    });

    // Write data to request body
    req.write(postData);
    req.end();

  } catch (err) {
    console.error('Error:', err);
  }
}

triggerFlexy();
