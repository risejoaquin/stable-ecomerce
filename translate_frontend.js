import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        // Simple string replace or regex depending on structure
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

// HomePage
replaceInFile('src/pages/store/HomePage.tsx', {
    '>Loading...<': '>Cargando...<',
    'Loading products...': 'Cargando productos...',
    'No products found.': 'No se encontraron productos.',
    "'Welcome'": "'Bienvenido'",
    "'Discover our collection'": "'Descubre nuestra colección'",
    "'New Arrivals'": "'Novedades'",
    "'Explore our latest collection.'": "'Explora nuestra colección más reciente.'",
    '>Contact<': '>Contacto<',
    '>Return Policy<': '>Política de Devolución<',
    '>Privacy Policy<': '>Política de Privacidad<',
    '>Terms & Conditions<': '>Términos y Condiciones<',
    '>No Image<': '>Sin Imagen<'
});

// StoreHeader
replaceInFile('src/components/storefront/StoreHeader.tsx', {
    '>Back to Store<': '>Volver a la Tienda<',
    '>Sign In<': '>Iniciar Sesión<',
    '>Sign Up<': '>Registrarse<'
});

// AuthMock
replaceInFile('src/components/AuthMock.tsx', {
    'Sign In': 'Iniciar Sesión',
    'Sign Up': 'Registrarse',
    'Sign in to your account': 'Inicia sesión en tu cuenta',
    'Welcome back!': '¡Bienvenido de nuevo!',
    'Create an account': 'Crear una cuenta',
    'Join us today.': 'Únete a nosotros hoy.',
    'Email Address': 'Correo Electrónico',
    'Password': 'Contraseña',
    'Forgot your password?': '¿Olvidaste tu contraseña?',
    "Don't have an account?": '¿No tienes una cuenta?',
    'Already have an account?': '¿Ya tienes una cuenta?',
    'Sign in with Demo Account': 'Iniciar Sesión con Cuenta Demo',
    'Creating account...': 'Creando cuenta...',
    'Signing in...': 'Iniciando sesión...'
});

// CartDrawer
replaceInFile('src/App.tsx', { // since CartDrawer is in App.tsx possibly? I'll check first, wait CartDrawer is in src/App.tsx? Let me find where CartDrawer is.
});
console.log('Done.');
