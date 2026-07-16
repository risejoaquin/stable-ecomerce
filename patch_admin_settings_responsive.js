import fs from 'fs';
let code = fs.readFileSync('src/components/admin/StoreSettingsForm.tsx', 'utf-8');

code = code.replace(
  `className="flex-1 overflow-y-auto p-10"`,
  `className="flex-1 overflow-y-auto p-4 sm:p-10"`
);

// also inside `grid grid-cols-2 gap-6`, let's make it `grid grid-cols-1 sm:grid-cols-2 gap-6` for mobile
code = code.replace(
  `className="grid grid-cols-2 gap-6"`,
  `className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"`
);

// layout selector also has flex-row but let's see if it wraps. It should wrap.
code = code.replace(
  `className="flex gap-4"`,
  `className="flex flex-wrap gap-4"`
);

fs.writeFileSync('src/components/admin/StoreSettingsForm.tsx', code);
