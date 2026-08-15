require('dotenv').config();
const { getModems } = require('./src/services/modemGridService');

async function testConnection() {
  console.log('Testing Modem Grid API Connection...\n');
  console.log(`URL: ${process.env.MODEM_GRID_API_URL}`);
  console.log(`API Key defined: ${!!process.env.MODEM_GRID_API_KEY}\n`);

  try {
    console.log('Fetching connected modems...');
    const response = await getModems();
    
    console.log('\n✅ Success! Response from Modem Grid API:');
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('\n❌ Error connecting to Modem Grid API:');
    console.error(error.message);
  }
}

testConnection();
