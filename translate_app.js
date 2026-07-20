import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = {
    'Create Your Store': 'Crea tu Tienda',
    'Set up your storefront to start selling.': 'Configura tu tienda para empezar a vender.',
    'Store Name': 'Nombre de la Tienda',
    'Create Store': 'Crear Tienda',
    'Access Denied. Admins only.': 'Acceso Denegado. Solo administradores.',
    'Loading admin...': 'Cargando administración...',
    'Error loading store info.': 'Error al cargar la información de la tienda.',
    '>Your Cart<': '>Tu Carrito<',
    'Your cart is empty.': 'Tu carrito está vacío.',
    'Promo code': 'Código promocional',
    '>Apply<': '>Aplicar<',
    '>Remove<': '>Eliminar<',
    '>Subtotal<': '>Subtotal<',
    '>Discount<': '>Descuento<',
    '>Total<': '>Total<',
    '>Checkout<': '>Pagar<'
};

for (const [find, replace] of Object.entries(replacements)) {
    content = content.replaceAll(find, replace);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Done.');
