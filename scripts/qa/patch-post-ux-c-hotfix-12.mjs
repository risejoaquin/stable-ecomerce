import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function replaceRequired(path, content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Patch anchor not found in ${path}: ${label}`);
  }
  const next = content.replace(from, to);
  write(path, next);
  console.log(`PATCH ${label}`);
  return next;
}

const indexCssPath = 'src/index.css';
let css = read(indexCssPath);

const materialImport = "@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');\n";
if (css.includes(materialImport)) {
  css = replaceRequired(indexCssPath, css, materialImport, '', 'remove global Material Symbols stylesheet import');
} else if (css.includes('Material+Symbols+Outlined')) {
  throw new Error('Material Symbols import exists but exact removal anchor did not match; inspect src/index.css');
} else {
  console.log('SKIP global Material Symbols stylesheet import already removed');
}

const appPath = 'src/App.tsx';
let app = read(appPath);

if (!app.includes("from 'lucide-react'") && !app.includes('from "lucide-react"')) {
  const anchor = "import { Toaster, toast } from 'react-hot-toast';\n";
  app = replaceRequired(
    appPath,
    app,
    anchor,
    `${anchor}import { ShoppingBag, Trash2 } from 'lucide-react';\n`,
    'add lucide cart icon imports'
  );
} else if (!app.includes('ShoppingBag') || !app.includes('Trash2')) {
  throw new Error('lucide-react import exists but does not include ShoppingBag/Trash2; inspect import merging manually');
} else {
  console.log('SKIP lucide cart icon imports already present');
}

const emptyCartSpan = '<span className="material-symbols-outlined">shopping_bag</span>';
if (app.includes(emptyCartSpan)) {
  app = replaceRequired(
    appPath,
    app,
    emptyCartSpan,
    '<ShoppingBag size={28} aria-hidden="true" />',
    'replace empty-cart Material Symbols shopping_bag icon'
  );
} else if (app.includes('material-symbols-outlined') && app.includes('shopping_bag')) {
  throw new Error('shopping_bag Material Symbols usage exists but exact anchor did not match');
} else {
  console.log('SKIP shopping_bag Material Symbols usage already removed');
}

const removeSpan = '<span className="material-symbols-outlined text-xl" aria-hidden="true">delete</span>';
if (app.includes(removeSpan)) {
  app = replaceRequired(
    appPath,
    app,
    removeSpan,
    '<Trash2 size={18} aria-hidden="true" />',
    'replace remove-cart Material Symbols delete icon'
  );
} else if (app.includes('material-symbols-outlined') && app.includes('delete')) {
  throw new Error('delete Material Symbols usage exists but exact anchor did not match');
} else {
  console.log('SKIP delete Material Symbols usage already removed');
}

app = read(appPath);
css = read(indexCssPath);

if (css.includes('Material+Symbols+Outlined') || app.includes('material-symbols-outlined')) {
  throw new Error('Material Symbols references remain after HOTFIX 12 patch');
}

console.log('PASS POST-UX C HOTFIX 12 patch applied');
