import fs from 'fs';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

replaceInFile('src/pages/store/MyOrdersPage.tsx', {
    '>My Orders<': '>Mis Pedidos<',
    'View and track your recent orders.': 'Mira y rastrea tus pedidos recientes.',
    'Loading orders...': 'Cargando pedidos...',
    "You haven't placed any orders yet.": 'No has realizado ningún pedido todavía.',
    'Start Shopping': 'Empezar a Comprar',
    'Order #': 'Pedido #',
    'Total:': 'Total:',
    'Status:': 'Estado:',
    'Tracking:': 'Rastreo:',
    '>Track<': '>Rastrear<',
    '>Items:<': '>Artículos:<',
    '>pending<': '>Pendiente<',
    '>paid<': '>Pagado<',
    '>shipped<': '>Enviado<',
    '>delivered<': '>Entregado<',
    '>cancelled<': '>Cancelado<',
    'Discount:': 'Descuento:'
});

replaceInFile('src/pages/store/WishlistPage.tsx', {
    '>My Wishlist<': '>Mi Lista de Deseos<',
    "Products you've saved for later.": 'Productos que has guardado para después.',
    'Loading wishlist...': 'Cargando lista de deseos...',
    'Your wishlist is empty.': 'Tu lista de deseos está vacía.',
    'Start Shopping': 'Empezar a Comprar',
    'Added to cart!': '¡Añadido al carrito!',
    'Add to Cart': 'Añadir al Carrito',
    '>Remove<': '>Eliminar<'
});

replaceInFile('src/pages/store/ProfilePage.tsx', {
    '>My Profile<': '>Mi Perfil<',
    'Manage your account settings.': 'Gestiona la configuración de tu cuenta.',
    'Loading profile...': 'Cargando perfil...',
    'Profile Information': 'Información del Perfil',
    'Name': 'Nombre',
    'Email Address': 'Correo Electrónico',
    'Shipping Address': 'Dirección de Envío',
    'Save Changes': 'Guardar Cambios',
    'Profile updated successfully': 'Perfil actualizado exitosamente',
    'Failed to update profile': 'Error al actualizar el perfil'
});

console.log('Done pages.');
