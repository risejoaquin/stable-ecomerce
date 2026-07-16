import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');
let openCount = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') openCount++;
  else if (code[i] === '}') openCount--;
}
console.log("Unbalanced Braces:", openCount);
