import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.json());
  } catch(e) {
    console.error(e);
  }
}
run();
