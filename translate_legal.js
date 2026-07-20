import fs from 'fs';

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of Object.entries(replacements)) {
        content = content.replaceAll(find, replace);
    }
    fs.writeFileSync(filePath, content);
}

replaceInFile('src/components/reviews/ReviewList.tsx', {
    'Loading reviews...': 'Cargando reseñas...',
    'No reviews yet.': 'Aún no hay reseñas.',
    'Verified Buyer': 'Comprador Verificado'
});

replaceInFile('src/components/reviews/ReviewForm.tsx', {
    'Write a Review': 'Escribir una Reseña',
    '>Rating<': '>Calificación<',
    'Comment (Optional)': 'Comentario (Opcional)',
    '>Submit Review<': '>Enviar Reseña<'
});

replaceInFile('src/components/storefront/Pagination.tsx', {
    '>Previous<': '>Anterior<',
    '>Next<': '>Siguiente<'
});

// For legal pages, let's just do a blanket translate for Contact Us as it might be used.
replaceInFile('src/pages/legal/ContactPage.tsx', {
    'Contact Us': 'Contáctanos',
    "Have a question or feedback? We'd love to hear from you.": '¿Tienes alguna pregunta o comentario? Nos encantaría escucharte.',
    '>Name<': '>Nombre<',
    '>Email<': '>Correo<',
    '>Message<': '>Mensaje<',
    '>Send Message<': '>Enviar Mensaje<'
});

replaceInFile('src/pages/legal/ReturnPolicyPage.tsx', {
    'Return Policy': 'Política de Devolución',
    'Returns': 'Devoluciones',
    'Refunds': 'Reembolsos',
    'Shipping': 'Envíos'
});

replaceInFile('src/pages/legal/TermsAndConditionsPage.tsx', {
    'Terms and Conditions': 'Términos y Condiciones',
    'Last updated:': 'Última actualización:',
    'Acceptance of Terms': 'Aceptación de los Términos',
    'Provision of Services': 'Provisión de Servicios',
    'Proprietary Rights': 'Derechos de Propiedad'
});

replaceInFile('src/pages/legal/PrivacyPolicyPage.tsx', {
    'Privacy Policy': 'Política de Privacidad',
    'Last updated:': 'Última actualización:',
    'Information We Collect': 'Información que Recopilamos',
    'Use of Information': 'Uso de la Información',
    'Sharing of Information': 'Intercambio de Información'
});

console.log('Done legal.');
