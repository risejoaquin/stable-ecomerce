import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = {
    "'Checkout'": "'Pagar'",
    "'Processing...'": "'Procesando...'",
    'Please enter your email to continue checkout:': 'Por favor ingresa tu correo electrónico para continuar el pago:'
};

for (const [find, replace] of Object.entries(replacements)) {
    content = content.replaceAll(find, replace);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Done.');
