async function testLiveApi() {
  const BASE_URL = 'https://bbbackend.duckdns.org/api/v1';
  console.log(`Starting tests against ${BASE_URL}\n`);

  try {
    // 1. Test Login
    console.log('1. Testing /auth/login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    
    if (!token) {
      console.log('❌ Login Failed:', loginData);
      return;
    }
    console.log('✅ Login Success! Token acquired.\n');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Test /users
    console.log('2. Testing /users...');
    const usersRes = await fetch(`${BASE_URL}/users`, { headers: authHeaders });
    if (usersRes.status === 200) {
      console.log('✅ GET /users is WORKING (Status 200)');
    } else {
      console.log(`❌ GET /users FAILED (Status ${usersRes.status})`);
      const body = await usersRes.text();
      console.log(`   Response: ${body}`);
    }
    console.log('');

    // 3. Test /commissions/
    console.log('3. Testing /commissions...');
    const commRes = await fetch(`${BASE_URL}/commissions/`, { headers: authHeaders });
    if (commRes.status === 200) {
      console.log('✅ GET /commissions is WORKING (Status 200)');
    } else {
      console.log(`❌ GET /commissions FAILED (Status ${commRes.status})`);
      const body = await commRes.text();
      console.log(`   Response: ${body}`);
    }
    console.log('');

    // 4. Test /flexy/send (With operator)
    console.log('4. Testing /flexy/send (With mobilis operator)...');
    const flexyRes = await fetch(`${BASE_URL}/flexy/send`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ number: '0666666666', amount: 100, operator: 'mobilis' })
    });
    if (flexyRes.status === 200) {
      console.log('✅ POST /flexy/send is WORKING (Status 200)');
    } else {
      console.log(`❌ POST /flexy/send FAILED with status ${flexyRes.status}`);
      const body = await flexyRes.text();
      console.log(`   Response: ${body}`);
    }
    console.log('');

    // 5. Test /wallet/transfer (Invalid ID)...
    console.log('5. Testing /wallet/transfer (Invalid ID)...');
    const walletRes = await fetch(`${BASE_URL}/wallet/transfer`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ to_user_id: 'invalid-id-test', amount: 50 })
    });
    if (walletRes.status === 400) {
      console.log('✅ POST /wallet/transfer correctly returned 400 Bad Request');
    } else if (walletRes.status === 500) {
      console.log('❌ POST /wallet/transfer still returns 500 Server Error (Not Fixed on server)');
    } else {
      console.log(`⚠️ POST /wallet/transfer returned Status ${walletRes.status}`);
    }
    console.log('');

    // 6. Test POST /users (Create client)
    console.log('6. Testing POST /users (Client creation)...');
    const createRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ 
        username: 'testclient123', 
        email: 'test@example.com', 
        password: 'password123', 
        full_name: 'Test Client', 
        phone: '0555555555', 
        role: 'CLIENT' 
      })
    });
    if (createRes.status === 201) {
      console.log('✅ POST /users is WORKING (Status 201)');
    } else {
      console.log(`❌ POST /users FAILED with status ${createRes.status}`);
      const body = await createRes.text();
      console.log(`   Response: ${body}`);
    }
    
  } catch (err) {
    console.error('Error running tests:', err);
  }
}

testLiveApi();
