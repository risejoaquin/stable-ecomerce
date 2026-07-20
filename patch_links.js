import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// For resetLink
content = content.replace(
  `const resetLink = \`\${req.protocol}://\${req.get('host')}/reset-password?token=\${resetToken}\`;`,
  `const baseUrl = req.headers.origin || \`\${req.protocol}://\${req.get('host')}\`;\n      const resetLink = \`\${baseUrl}/reset-password?token=\${resetToken}\`;`
);

// For verificationLink (there are two occurrences it seems, line 260 and 322)
content = content.replace(
  /const verificationLink = `\$\{req\.protocol\}:\/\/\$\{req\.get\('host'\)\}\/verify-email\?token=\$\{verificationToken\}`;/g,
  `const baseUrl = req.headers.origin || \`\${req.protocol}://\${req.get('host')}\`;\n      const verificationLink = \`\${baseUrl}/verify-email?token=\${verificationToken}\`;`
);

fs.writeFileSync('server.ts', content);
