import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf-8');

const target = "const token = jwt.sign({ userId: data.id, role: data.role }, JWT_SECRET, { expiresIn: '7d' });";
const replacement = `      // Send Welcome Email
      await sendEmail({
        to: email,
        subject: 'Welcome to Selfcare Sinners!',
        html: \`<h1>Welcome to Selfcare Sinners, \${full_name || 'Gorgeous'}!</h1><p>We are thrilled to have you here. Discover our exclusive collection of luxury self-care products designed just for you.</p><p>Enjoy shopping with us!</p>\`
      });
      
      const token = jwt.sign({ userId: data.id, role: data.role }, JWT_SECRET, { expiresIn: '7d' });`;

server = server.replace(target, replacement);
fs.writeFileSync('server.ts', server);
