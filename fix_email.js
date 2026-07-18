import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(
  "    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });\n    console.log(`Email sent to ${to}`);",
  "    const { data, error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });\n    if (error) {\n      console.error('Resend API Error:', error);\n    } else {\n      console.log(`Email sent to ${to}`, data);\n    }"
);

fs.writeFileSync('server.ts', server);
