import fs from 'fs';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

replaceInFile('src/pages/store/TrackOrderPage.tsx', {
    'Track Your Order': 'Rastrea tu Pedido',
    'Enter your order ID to see its current status.': 'Ingresa el ID de tu pedido para ver su estado actual.',
    'Order ID': 'ID de Pedido',
    'Track Order': 'Rastrear Pedido',
    'Tracking Information': 'Información de Rastreo',
    'Status:': 'Estado:',
    'Tracking Number:': 'Número de Guía:',
    'No tracking number yet.': 'Aún no hay número de guía.',
    'No order found.': 'No se encontró el pedido.'
});

replaceInFile('src/pages/store/RecoverCartPage.tsx', {
    'Recover Cart': 'Recuperar Carrito',
    'Loading cart...': 'Cargando carrito...',
    'Error recovering cart.': 'Error al recuperar el carrito.',
    'Cart recovered successfully.': 'Carrito recuperado exitosamente.'
});

console.log('Done more.');
