import fs from 'fs';

let content = fs.readFileSync('src/index.css', 'utf8');

const newCSS = `@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
@import "tailwindcss";

@theme {
  --color-primary: var(--color-primary, #6B705C);
  --color-secondary: var(--color-secondary, #A5A58D);
  --color-background: var(--color-background, #F7F6F2);
  --color-text: var(--color-text, #333333);
  --color-button: var(--color-button, #6B705C);
  --font-sans: var(--font-primary, 'Helvetica Neue', Arial, sans-serif);
  
  --color-status-pending-bg: #FFF9E6;
  --color-status-pending-text: #B08C00;
  --color-status-shipped-bg: #E6F5ED;
  --color-status-shipped-text: #2D6A4F;
}

:root {
  --color-primary: #6B705C;
  --color-secondary: #A5A58D;
  --color-background: #F7F6F2;
  --color-text: #333333;
  --color-button: #6B705C;
  --font-primary: 'Helvetica Neue', Arial, sans-serif;
  --border-radius-base: 0.75rem;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-sans);
}
`;

fs.writeFileSync('src/index.css', newCSS);
console.log('Updated index.css');
