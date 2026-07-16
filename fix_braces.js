import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');
const lines = code.split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  count += (opens - closes);
}
if (count === 2) {
    code += "\n}\n}\n";
    fs.writeFileSync('server.ts', code);
    console.log("Appended 2 braces");
}
