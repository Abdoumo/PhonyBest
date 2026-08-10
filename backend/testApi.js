const http = require('http');

async function testApi() {
  const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  console.log('Login token:', token ? 'Success' : 'Failed');

  if (!token) {
    console.log(loginData);
    return;
  }

  const usersRes = await fetch('http://localhost:8000/api/v1/users', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('GET /users Status:', usersRes.status);
  const usersData = await usersRes.json();
  if (usersRes.status === 500) {
    console.error('Users 500 Error:', usersData);
  } else {
    console.log('Users Success!');
  }

  const commRes = await fetch('http://localhost:8000/api/v1/commissions', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('GET /commissions Status:', commRes.status);
}

testApi().catch(console.error);
