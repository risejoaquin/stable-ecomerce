const fs = require('fs');

let loginCode = fs.readFileSync('src/pages/LoginPage.tsx', 'utf-8');

loginCode = loginCode.replace(
  "toast.error(data.error || 'Failed to login');",
  "if (data.error === 'Email no verificado. Revisa tu correo.') {\n          toast.error(data.error);\n        } else {\n          toast.error(data.error || 'Failed to login');\n        }"
);

fs.writeFileSync('src/pages/LoginPage.tsx', loginCode);
