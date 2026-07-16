const fs = require('fs');

let signUpCode = fs.readFileSync('src/pages/SignUpPage.tsx', 'utf-8');

signUpCode = signUpCode.replace(
  "toast.success('Account created successfully! Please sign in.');",
  "toast.success('Te hemos enviado un correo de verificación. Revisa tu bandeja de entrada.');"
);

fs.writeFileSync('src/pages/SignUpPage.tsx', signUpCode);
