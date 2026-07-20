import fs from 'fs';
import path from 'path';

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    var filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath);
    }
  });
}

walkSync('./src', (filepath) => {
  if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Replace hex colors in tailwind brackets with variables
    content = content.replace(/\[#6B705C\]/gi, '[var(--color-primary)]');
    content = content.replace(/\[#A5A58D\]/gi, '[var(--color-secondary)]');
    content = content.replace(/\[#FDFCFB\]/gi, '[var(--color-background)]');
    content = content.replace(/\[#F7F6F2\]/gi, '[var(--color-background)]');
    content = content.replace(/\[#333333\]/gi, '[var(--color-text)]');
    content = content.replace(/\[#333\]/gi, '[var(--color-text)]');
    
    // Some places use text-[#333] or text-[#333333]
    fs.writeFileSync(filepath, content);
  }
});
console.log('Colors replaced with CSS variables');
