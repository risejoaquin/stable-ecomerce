import { escapeHtml, safeText, sanitizeEmailUrl } from './src/server/email/email-sanitize.js';

export const getEmailLayout = (content: string, preheader: string = '', title: string = 'Selfcare Sinners') => {
  const safePreheader = escapeHtml(preheader || 'Actualización de Selfcare Sinners');
  const safeTitle = safeText(title, 'Selfcare Sinners');
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f7efe5;color:#241f1a;font-family:Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${safePreheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7efe5;margin:0;padding:32px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fffaf4;border:1px solid #eadccf;border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(67,47,31,.10);">
          <tr>
            <td style="padding:30px 32px 16px;border-bottom:1px solid #eadccf;">
              <div style="font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#8d725d;font-weight:800;">Selfcare Sinners</div>
              <h1 style="margin:14px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.1;color:#241f1a;font-weight:500;">${safeTitle}</h1>
              <p style="margin:0;color:#7b6654;font-size:14px;line-height:1.6;">${safePreheader}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 34px;font-size:15px;line-height:1.75;color:#3b332d;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:#f3e7da;color:#735f50;font-size:12px;line-height:1.6;">
              Selfcare Sinners · Skincare editorial y cuidado personal.<br>
              Recibes este correo por tu cuenta, pedido o interacción con nuestra tienda.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const button = (href: string, label: string) => `<p style="margin:30px 0 8px;text-align:center"><a href="${sanitizeEmailUrl(href)}" style="display:inline-block;background:#241f1a;color:#fff7ee;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;letter-spacing:.02em">${escapeHtml(label)}</a></p>`;

export const getVerificationEmail = (name: string, verificationLink: string) => getEmailLayout(
  `
    <p style="margin:0 0 16px;">Hola ${safeText(name, 'bienvenida')}.</p>
    <p style="margin:0 0 18px;">Tu cuenta fue creada correctamente. Para activar tu acceso y proteger tus pedidos, confirma tu correo electrónico.</p>
    ${button(verificationLink, 'Verificar mi cuenta')}
    <p style="margin:18px 0 0;font-size:13px;color:#7b6654;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
    <p style="margin:8px 0 0;font-size:12px;word-break:break-all;color:#8d725d;">${sanitizeEmailUrl(verificationLink)}</p>
  `,
  'Confirma tu correo para activar tu cuenta.',
  'Verifica tu cuenta'
);

export const getOrderConfirmationEmail = (orderId: string, total: string, itemsHtml: string) => getEmailLayout(
  `
    <p style="margin:0 0 16px;">Recibimos tu pedido <strong>#${safeText(String(orderId).split('-')[0])}</strong> y ya está en proceso.</p>
    <div style="margin:26px 0;padding:18px;border:1px solid #eadccf;border-radius:20px;background:#fff7ee;">${itemsHtml}<div style="display:flex;justify-content:space-between;border-top:1px solid #eadccf;margin-top:14px;padding-top:14px;font-weight:800"><span>Total</span><span>${safeText(total)}</span></div></div>
    <p style="margin:0;color:#7b6654;">Te avisaremos cuando el estado del pedido cambie o cuando exista número de rastreo.</p>
  `,
  'Tu pedido Selfcare Sinners fue confirmado.',
  'Pedido confirmado'
);

export const getDiscountCouponEmail = (code: string, discount: string, expiryDate?: string) => getEmailLayout(
  `
    <p style="margin:0 0 18px;">Tenemos un beneficio listo para tu próxima compra.</p>
    <div style="margin:24px 0;padding:24px;text-align:center;border:1px dashed #b99d86;border-radius:22px;background:#fff7ee;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:#8d725d;font-weight:800;">Código</div>
      <div style="font-size:30px;letter-spacing:.18em;font-weight:900;color:#241f1a;margin:10px 0;">${safeText(code)}</div>
      <div style="color:#7b6654;">${safeText(discount)} de descuento${expiryDate ? ` · válido hasta ${safeText(expiryDate)}` : ''}</div>
    </div>
    ${button('https://selfcaresinners.com', 'Comprar ahora')}
  `,
  'Un beneficio exclusivo para tu próxima rutina.',
  'Tu cupón está listo'
);

export const getAbandonedCartEmail = (recoverUrl: string, itemsHtml: string) => getEmailLayout(
  `
    <p style="margin:0 0 16px;">Guardamos los productos que dejaste en tu carrito para que puedas terminar tu compra sin empezar de nuevo.</p>
    <div style="margin:24px 0;padding:18px;border:1px solid #eadccf;border-radius:20px;background:#fff7ee;">${itemsHtml}</div>
    ${button(recoverUrl, 'Recuperar mi carrito')}
  `,
  'Tu carrito Selfcare Sinners sigue disponible.',
  'Tu ritual te espera'
);

export const getOrderStatusEmail = (orderId: string, statusText: string, trackingInfo: string = '') => getEmailLayout(
  `
    <p style="margin:0 0 16px;">Tu pedido <strong>#${safeText(String(orderId).split('-')[0])}</strong> ${safeText(statusText)}.</p>
    ${trackingInfo ? `<div style="margin:22px 0;padding:18px;background:#fff7ee;border:1px solid #eadccf;border-radius:18px;">${trackingInfo}</div>` : ''}
    <p style="margin:0;color:#7b6654;">Puedes revisar el estado del pedido desde la tienda con tu correo y el ID del pedido.</p>
  `,
  `Actualización de tu pedido #${safeText(String(orderId).split('-')[0])}.`,
  'Actualización de pedido'
);
