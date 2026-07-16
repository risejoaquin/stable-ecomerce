import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  '  const [isCartOpen, setIsCartOpen] = useState(false);\n\n\n  const addItem',
  '  const [isCartOpen, setIsCartOpen] = useState(false);\n\n  useEffect(() => {\n    localStorage.setItem(\'cart\', JSON.stringify(items));\n  }, [items]);\n\n  const addItem'
);
fs.writeFileSync('src/App.tsx', code);
