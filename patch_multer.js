import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const newMulter = `
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
    }
  }
});
`;

code = code.replace(
  `const upload = multer({ storage: multer.memoryStorage() });`,
  newMulter
);

fs.writeFileSync('server.ts', code);
