import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  `const app = express();\n  app.use(cors());`,
  `const app = express();\n  app.set('trust proxy', 1);\n  app.use(cors());`
);

fs.writeFileSync('server.ts', content);
