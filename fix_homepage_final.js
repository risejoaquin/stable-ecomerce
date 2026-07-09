import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

// Just remove the extra <>
code = code.replace(
    "return (\n    <>\n      <>\n      <SEO",
    "return (\n    <>\n      <SEO"
);

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
