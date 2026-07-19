export const getEmailLayout = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selfcare Sinners</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f9f9f9;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f9f9f9;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #1a1a1a;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
      font-size: 16px;
    }
    .content h2 {
      color: #1a1a1a;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #1a1a1a;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      margin: 20px 0;
      text-align: center;
      letter-spacing: 1px;
    }
    .footer {
      background-color: #f1f1f1;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777777;
    }
    .order-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #eeeeee;
      padding: 15px 0;
    }
    .order-item:last-child {
      border-bottom: none;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      font-weight: bold;
      border-top: 2px solid #1a1a1a;
      margin-top: 10px;
    }
    .coupon-box {
      background-color: #f4f4f5;
      border: 1px dashed #a1a1aa;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
      border-radius: 6px;
    }
    .coupon-code {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
      letter-spacing: 3px;
      margin: 10px 0;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      mso-hide: all;
      font-size: 1px;
      color: #f9f9f9;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="wrapper">
    <table class="container" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="header">
          <h1>Selfcare Sinners</h1>
        </td>
      </tr>
      <tr>
        <td class="content">
          ${content}
        </td>
      </tr>
      <tr>
        <td class="footer">
          &copy; ${new Date().getFullYear()} Selfcare Sinners. All rights reserved.<br>
          Your daily dose of radical self-love.
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

export const getVerificationEmail = (name: string, verificationLink: string) => {
  return getEmailLayout(
    `
    <h2>Welcome to Selfcare Sinners! ✨</h2>
    <p>Hi ${name || 'Gorgeous'},</p>
    <p>We are absolutely thrilled to have you join our community. Your journey towards radical self-care and indulgence starts here.</p>
    <p>To get started, we just need to verify your email address. It only takes a second.</p>
    <center>
      <a href="${verificationLink}" class="button">Verify My Account</a>
    </center>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #666; word-break: break-all;">${verificationLink}</p>
    <br/>
    <p>With love,<br/>The Selfcare Sinners Team</p>
    `,
    'Action Required: Verify your email address to get started.'
  );
};

export const getOrderConfirmationEmail = (orderId: string, total: string, itemsHtml: string) => {
  return getEmailLayout(
    `
    <h2>Thank You for Your Order! 🛍️</h2>
    <p>We've received your order <strong>#${orderId.split('-')[0]}</strong> and we're getting it ready for you right now.</p>
    <p>Here is a summary of your purchase:</p>
    
    <div style="margin: 30px 0;">
      ${itemsHtml}
      
      <div class="total-row">
        <span>Total</span>
        <span>${total}</span>
      </div>
    </div>
    
    <p>We'll send you another email as soon as your order ships.</p>
    <p>Stay stunning,<br/>The Selfcare Sinners Team</p>
    `,
    'Your Selfcare Sinners order has been confirmed.'
  );
};

export const getDiscountCouponEmail = (code: string, discount: string, expiryDate?: string) => {
  return getEmailLayout(
    `
    <h2>A Special Gift Just For You 🎁</h2>
    <p>Because you deserve a little extra self-care, we're treating you to a special discount on your next purchase.</p>
    
    <div class="coupon-box">
      <p style="margin:0; font-size: 14px; text-transform: uppercase; color: #666;">Use code at checkout</p>
      <div class="coupon-code">${code}</div>
      <p style="margin:0; font-size: 16px; font-weight: 500;">Enjoy ${discount} off</p>
      ${expiryDate ? `<p style="margin-top:10px; font-size: 12px; color: #888;">Valid until ${expiryDate}</p>` : ''}
    </div>
    
    <center>
      <a href="https://selfcare-sinners.com" class="button">Shop Now</a>
    </center>
    
    <p>Treat yourself,<br/>The Selfcare Sinners Team</p>
    `,
    'Here is a special discount code for your next order.'
  );
};

export const getAbandonedCartEmail = (recoverUrl: string, itemsHtml: string) => {
  return getEmailLayout(
    `
    <h2>Did you forget something? 🛒</h2>
    <p>It looks like you left some amazing items in your cart. We've saved them for you, but they won't last forever!</p>
    
    <div style="margin: 30px 0;">
      ${itemsHtml}
    </div>
    
    <center>
      <a href="${recoverUrl}" class="button">Complete My Purchase</a>
    </center>
    
    <p>Don't miss out on treating yourself.</p>
    <p>With love,<br/>The Selfcare Sinners Team</p>
    `,
    'You left some items in your cart. Complete your purchase now.'
  );
};

export const getOrderStatusEmail = (orderId: string, statusText: string, trackingInfo: string = '') => {
  return getEmailLayout(
    `
    <h2>Order Update 📦</h2>
    <p>We're writing to let you know that your order <strong>#${orderId.split('-')[0]}</strong> ${statusText}.</p>
    
    ${trackingInfo ? `<div style="margin: 20px 0; padding: 15px; background: #f4f4f5; border-radius: 6px;">${trackingInfo}</div>` : ''}
    
    <p>If you have any questions, please reply to this email.</p>
    <p>Stay stunning,<br/>The Selfcare Sinners Team</p>
    `,
    `Your order #${orderId.split('-')[0]} ${statusText}.`
  );
};
