import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  `if (['shipped', 'cancelled'].includes(status)) {`,
  `if (['enviado', 'cancelado'].includes(status)) {`
);

content = content.replace(
  `const isCancelled = status === 'cancelled';`,
  `const isCancelled = status === 'cancelado';`
);

content = content.replace(
  `const subject = isCancelled ? 'Your order has been cancelled' : 'Your order has been shipped!';`,
  `const subject = isCancelled ? 'Your order has been cancelled' : 'Your order has been shipped!';`
);

fs.writeFileSync('server.ts', content);
