const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5008/api/auth/register', {
      name: 'Test User',
      email: `test_${Date.now()}@watt.tn`,
      password: 'password123',
      role: 'client'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
