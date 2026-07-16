import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');
const lines = code.split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  count += (opens - closes);
  if (count > 0 && Math.abs(opens - closes) > 0) {
     // console.log(\`Line \${i+1}: count=\${count} | \${line}\`);
  }
}
console.log("Final:", count);
