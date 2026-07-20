import fs from 'fs';

let content = fs.readFileSync('src/components/AuthMock.tsx', 'utf8');

const replacements = {
    'My Account': 'Mi Cuenta',
    'Admin Dashboard': 'Panel de Administración',
    'My Profile': 'Mi Perfil',
    'My Orders': 'Mis Pedidos',
    'Wishlist': 'Lista de Deseos',
    'Sign out': 'Cerrar Sesión'
};

for (const [find, replace] of Object.entries(replacements)) {
    content = content.replaceAll(find, replace);
}

fs.writeFileSync('src/components/AuthMock.tsx', content);
console.log('Done.');
