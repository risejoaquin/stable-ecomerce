import fs from 'fs';

let adminPage = fs.readFileSync('src/pages/admin/AdminSettingsPage.tsx', 'utf8');
adminPage = adminPage.replace("Loading settings...", "Cargando configuración...");
adminPage = adminPage.replace("'Settings saved successfully'", "'Configuración guardada exitosamente'");
adminPage = adminPage.replace("'Failed to save settings'", "'Error al guardar la configuración'");
adminPage = adminPage.replace(/'Uploading...'/g, "'Subiendo...'");
adminPage = adminPage.replace("'Upload complete'", "'Carga completada'");
adminPage = adminPage.replace("'Upload failed'", "'Error al subir'");
adminPage = adminPage.replace("Store Customization", "Personalización de Tienda");
adminPage = adminPage.replace("Design your storefront exactly how you want it.", "Diseña tu tienda exactamente como la quieres.");
adminPage = adminPage.replace("'Saving...'", "'Guardando...'");
adminPage = adminPage.replace("Save Changes", "Guardar Cambios");
adminPage = adminPage.replace("Theme & Colors", "Tema y Colores");
adminPage = adminPage.replace("Layout & Content", "Diseño y Contenido");
fs.writeFileSync('src/pages/admin/AdminSettingsPage.tsx', adminPage);

let form = fs.readFileSync('src/components/admin/StoreSettingsForm.tsx', 'utf8');
const replacementsForm = {
  "Brand Colors": "Colores de la Marca",
  "Define your store's visual identity through colors.": "Define la identidad visual de tu tienda a través de los colores.",
  "Primary Brand Color": "Color Principal",
  "Main buttons & active states": "Botones principales y estados activos",
  "Secondary Accent": "Acento Secundario",
  "Subtle borders & hover states": "Bordes sutiles y estados al pasar el cursor",
  "Store Background": "Fondo de la Tienda",
  "Main page background": "Fondo principal de la página",
  "Main Text Color": "Color del Texto Principal",
  "Primary headings and body": "Encabezados y cuerpo principales",
  "Button Text": "Texto de Botones",
  "Text color inside buttons": "Color del texto dentro de los botones",
  "Typography": "Tipografía",
  "Select the font family that represents your brand voice.": "Selecciona la fuente que represente la voz de tu marca.",
  "Branding Assets": "Recursos de Marca",
  "Upload your logo and favicon for a professional look.": "Sube tu logo y favicon para un aspecto profesional.",
  "Store Logo": "Logo de la Tienda",
  "Displays in the header. Recommended size: 200x50px, transparent PNG.": "Se muestra en el encabezado. Tamaño recomendado: 200x50px, PNG transparente.",
  "Choose File": "Elegir Archivo",
  "Remove": "Eliminar",
  "No logo": "Sin logo",
  "Browser Favicon": "Favicon del Navegador",
  "Small icon shown in browser tabs. Recommended size: 32x32px.": "Icono pequeño en las pestañas. Tamaño recomendado: 32x32px.",
  "No favicon": "Sin favicon",
  "Footer Copyright Text": "Texto de Derechos de Autor del Pie de Página",
  "Appears at the bottom of all store pages.": "Aparece en la parte inferior de todas las páginas de la tienda.",
  "Store Layout": "Diseño de la Tienda",
  "Choose how your products are displayed on the home page.": "Elige cómo se muestran tus productos en la página principal.",
  "Hero Banner Details": "Detalles del Banner Principal",
  "Customize the large welcoming banner at the top of your store.": "Personaliza el gran banner de bienvenida en tu tienda.",
  "Banner Background": "Fondo del Banner",
  "High-resolution image. Recommended: 1920x600px.": "Imagen de alta resolución. Recomendado: 1920x600px.",
  "Upload Image": "Subir Imagen",
  "No banner image": "Sin imagen de banner",
  "Main Title": "Título Principal",
  "The large headline text.": "El texto grande del encabezado.",
  "Subtitle": "Subtítulo",
  "Smaller text below the title.": "Texto más pequeño debajo del título."
};
for (const [en, es] of Object.entries(replacementsForm)) {
  form = form.replace(new RegExp(en.replace(/[.*+?^$\{\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), es);
}
fs.writeFileSync('src/components/admin/StoreSettingsForm.tsx', form);

let font = fs.readFileSync('src/components/admin/FontSelector.tsx', 'utf8');
const fontReplacements = {
  "Google Font Family": "Familia de Fuentes de Google",
  "Clean & Modern": "Limpia y Moderna",
  "Standard": "Estándar",
  "Elegant Serif": "Serif Elegante",
  "Premium Serif": "Serif Premium",
  "Tech & Bold": "Tecnológica y Audaz",
  "Design is thinking made visual.": "El diseño es pensamiento hecho visual.",
  "Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed.": "La tipografía es el arte y técnica de organizar las letras para hacer el lenguaje escrito legible y atractivo.",
  "Primary Action": "Acción Principal",
  "Secondary": "Secundaria"
};
for (const [en, es] of Object.entries(fontReplacements)) {
  font = font.replace(new RegExp(en.replace(/[.*+?^$\{\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), es);
}
fs.writeFileSync('src/components/admin/FontSelector.tsx', font);

let layout = fs.readFileSync('src/components/admin/LayoutSelector.tsx', 'utf8');
const layoutReplacements = {
  "Grid": "Cuadrícula",
  "Standard product grid": "Cuadrícula estándar de productos",
  "List": "Lista",
  "Vertical list of products": "Lista vertical de productos",
  "Hero Banner": "Banner Principal",
  "Big banner + product grid": "Banner grande + cuadrícula"
};
for (const [en, es] of Object.entries(layoutReplacements)) {
  layout = layout.replace(new RegExp(en.replace(/[.*+?^$\{\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), es);
}
fs.writeFileSync('src/components/admin/LayoutSelector.tsx', layout);

console.log('Translated to Spanish');
