import fs from 'fs';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

replaceInFile('src/components/storefront/StoreHeader.tsx', {
    'Sign In': 'Iniciar Sesión',
    'Sign Up': 'Registrarse'
});

replaceInFile('src/components/storefront/WishlistButton.tsx', {
    'Please sign in to save items to your wishlist': 'Por favor, inicia sesión para guardar artículos en tu lista de deseos'
});

replaceInFile('src/components/AuthMock.tsx', {
    'Please sign in...': 'Por favor, inicia sesión...'
});

console.log('Done.');
