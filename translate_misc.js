import fs from 'fs';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

replaceInFile('src/components/storefront/ProductCard.tsx', {
    'Out of Stock': 'Agotado',
    'Add to Cart': 'Añadir al Carrito',
    'Added to cart!': '¡Añadido al carrito!',
    '>No Image<': '>Sin Imagen<'
});

replaceInFile('src/pages/store/CheckoutSuccessPage.tsx', {
    'Order Successful!': '¡Pedido Exitoso!',
    'Thank you for your purchase.': 'Gracias por tu compra.',
    'Your order has been received and is being processed.': 'Hemos recibido tu pedido y está siendo procesado.',
    'Return to Store': 'Volver a la Tienda'
});

console.log('Done misc.');
