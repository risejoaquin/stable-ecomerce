import fs from 'fs';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

replaceInFile('src/pages/store/WishlistPage.tsx', {
    'Continue Shopping': 'Seguir Comprando',
    'Your wishlist is empty': 'Tu lista de deseos está vacía',
    'Save items you like and they will appear here.': 'Guarda los artículos que te gustan y aparecerán aquí.',
    'Explore Products': 'Explorar Productos',
    'No Image': 'Sin Imagen',
    "'Added to cart'": "'Añadido al carrito'",
    "'Removed from wishlist'": "'Eliminado de la lista de deseos'"
});

replaceInFile('src/components/storefront/WishlistButton.tsx', {
    "'Removed from wishlist'": "'Eliminado de la lista de deseos'",
    "'Added to wishlist'": "'Añadido a la lista de deseos'"
});

console.log('Translated Wishlist');
