import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "import { HomePage }\nimport { TrackOrderPage } from './pages/store/TrackOrderPage';\nimport { MyOrdersPage } from './pages/store/MyOrdersPage'; from './pages/store/HomePage';",
  "import { HomePage } from './pages/store/HomePage';\nimport { TrackOrderPage } from './pages/store/TrackOrderPage';\nimport { MyOrdersPage } from './pages/store/MyOrdersPage';"
);

fs.writeFileSync('src/App.tsx', code);
