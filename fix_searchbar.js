import fs from 'fs';
let content = fs.readFileSync('src/components/storefront/SearchBar.tsx', 'utf8');

content = content.replace("import { Buscar }", "import { Search }");
content = content.replace("BuscarBar", "SearchBar");
content = content.replace("onBuscar", "onSearch");
content = content.replace("onBuscar", "onSearch");
content = content.replace("onBuscar", "onSearch");
content = content.replace("<Buscar", "<Search");
fs.writeFileSync('src/components/storefront/SearchBar.tsx', content);

console.log('Fixed SearchBar.');
