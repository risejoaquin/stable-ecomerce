import { escapeHtml, sanitizeEmailUrl, safeText } from './email-sanitize.js';

export function buildSoftPremiumEmailLayout({ title, preheader, body, ctaLabel, ctaHref }: { title: string; preheader?: string; body: string; ctaLabel?: string; ctaHref?: string }) {
  const safeTitle = safeText(title, 'Selfcare Sinners');
  const safePreheader = safeText(preheader || 'Actualización de Selfcare Sinners');
  const cta = ctaLabel && ctaHref
    ? `<p style="margin:30px 0 0"><a href="${sanitizeEmailUrl(ctaHref)}" style="display:inline-block;background:#231f1a;color:#fff7ee;text-decoration:none;padding:14px 20px;border-radius:999px;font-weight:700;letter-spacing:.02em">${escapeHtml(ctaLabel)}</a></p>`
    : '';

  return `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${safePreheader}</div>
  <div style="margin:0;padding:32px 18px;background:#f7efe5;color:#241f1a;font-family:Inter,Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#fffaf4;border:1px solid #eadccf;border-radius:28px;overflow:hidden">
      <tr>
        <td style="padding:26px 30px 12px;border-bottom:1px solid #eadccf">
          <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8d725d;font-weight:700">Selfcare Sinners</div>
          <h1 style="margin:14px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.12;color:#241f1a">${safeTitle}</h1>
          <p style="margin:0;color:#7b6654;font-size:14px;line-height:1.6">${safePreheader}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 30px 32px;font-size:15px;line-height:1.7;color:#3b332d">
          ${body}
          ${cta}
        </td>
      </tr>
      <tr>
        <td style="padding:22px 30px;background:#f3e7da;color:#735f50;font-size:12px;line-height:1.6">
          Recibes este correo por tu relación con Selfcare Sinners. Si tienes dudas, responde a este mensaje o visita nuestro centro de ayuda.
        </td>
      </tr>
    </table>
  </div>`;
}
