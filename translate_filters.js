import fs from 'fs';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

replaceInFile('src/components/storefront/ProductFilters.tsx', {
    'Categorías': 'Categorías', // already spanish
    'Subcategorías': 'Subcategorías',
    'Todas': 'Todas',
    'Ordenar Por': 'Ordenar Por',
    'Más Recientes': 'Más Recientes',
    'Precio: Menor a Mayor': 'Precio: Menor a Mayor',
    'Precio: Mayor a Menor': 'Precio: Mayor a Menor',
    'Rango de Precios': 'Rango de Precios',
    'Min': 'Mín',
    'Max': 'Máx',
    'Categorias': 'Categorías'
});

replaceInFile('src/components/storefront/SearchBar.tsx', {
    'Search products...': 'Buscar productos...',
    'Search': 'Buscar'
});

replaceInFile('src/components/storefront/Pagination.tsx', {
    '>Previous<': '>Anterior<',
    '>Next<': '>Siguiente<'
});

replaceInFile('src/pages/store/ProductDetailPage.tsx', {
    'Back to Home': 'Volver al Inicio',
    'Add to Cart': 'Añadir al Carrito',
    'Out of Stock': 'Agotado',
    'Brand': 'Marca',
    'Category': 'Categoría',
    'Reviews': 'Reseñas',
    'Description': 'Descripción',
    'Write a Review': 'Escribir una Reseña',
    'No reviews yet. Be the first to review this product!': 'Aún no hay reseñas. ¡Sé el primero en reseñar este producto!',
    'Add a Review': 'Añadir una Reseña',
    'Please sign in to write a review.': 'Inicia sesión para escribir una reseña.',
    'Sign In': 'Iniciar Sesión',
    'Cancel': 'Cancelar',
    'Submit Review': 'Enviar Reseña',
    'Quantity': 'Cantidad',
    'Added to cart!': '¡Añadido al carrito!',
    'Failed to add review': 'Error al añadir la reseña',
    'Review added successfully': 'Reseña añadida exitosamente'
});

console.log('Done filters.');
