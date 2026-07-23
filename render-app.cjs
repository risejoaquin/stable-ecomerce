const { JSDOM } = require('jsdom');

async function run() {
  const html = await fetch('http://localhost:3000').then(res => res.text());
  
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  dom.window.document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
  });

  dom.window.addEventListener('error', (event) => {
    console.log('JSDOM ERROR:', event.error);
  });
  
  // Wait a bit
  setTimeout(() => {
    console.log('Done waiting');
    process.exit(0);
  }, 10000);
}
run();
