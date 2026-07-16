import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const checkoutBlock = `
              onClick={() => {
                if (!isSignedIn && !localStorage.getItem('guest_email')) {
                  const email = prompt('Please enter your email to continue checkout:');
                  if (email) {
                    localStorage.setItem('guest_email', email);
                    fetch('/api/cart/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, items })
                    }).then(() => checkout.mutate());
                  }
                } else {
                  checkout.mutate();
                }
              }}`;

if (!code.includes('guest_email')) {
  code = code.replace(
    /onClick=\{\(\) => checkout\.mutate\(\)\}/,
    checkoutBlock
  );
  fs.writeFileSync('src/App.tsx', code);
}
