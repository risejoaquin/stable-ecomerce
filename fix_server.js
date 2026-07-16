import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /  \}\);\s+if \(error\) throw error;\s+res\.json\(data \|\| \[\]\);\s+\} catch \(e: any\) \{\s+res\.status\(500\)\.json\(\{ error: e\.message \}\);\s+\}\s+\}\);/g;
code = code.replace(regex, "  });");

fs.writeFileSync('server.ts', code);
