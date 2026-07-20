import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const oldCheck = `      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Coupon expired' });
      }`;

const newCheck = `      if (coupon.expires_at) {
        const expiry = new Date(coupon.expires_at);
        // Expiration is at the end of the chosen day (UTC)
        expiry.setUTCHours(23, 59, 59, 999);
        if (expiry.getTime() < new Date().getTime()) {
          return res.status(400).json({ error: 'Coupon expired' });
        }
      }`;

content = content.replace(oldCheck, newCheck);

fs.writeFileSync('server.ts', content);
console.log('Fixed server.ts expiration check');
