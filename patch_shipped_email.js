import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const oldHtml = 'html: `<p>Your order #${data.id.split(\'-\')[0]} ${statusText}.</p>`';
const newHtml = 'html: `<p>Your order #${data.id.split(\'-\')[0]} ${statusText}.</p>${status === \'shipped\' && data.tracking_number ? `<p>Tracking Number: <strong>${data.tracking_number}</strong></p>` : \'\'}`';

code = code.replace(oldHtml, newHtml);

fs.writeFileSync('server.ts', code);
