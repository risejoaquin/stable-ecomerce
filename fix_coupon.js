import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "const [appliedCoupon, setAppliedCoupon] = React.useState<{ code: string, discountAmount: number } | null>(null);",
  `const [appliedCoupon, setAppliedCoupon] = React.useState<any | null>(null);`
);

content = content.replace(
  "const finalTotal = Math.max(0, total - (appliedCoupon?.discountAmount || 0));",
  `  let currentDiscount = 0;
  let isCouponActive = false;
  if (appliedCoupon) {
    if (!appliedCoupon.min_order_amount || total >= appliedCoupon.min_order_amount) {
      isCouponActive = true;
      if (appliedCoupon.discount_type === 'percentage') {
        currentDiscount = (total * appliedCoupon.discount_value) / 100;
      } else {
        currentDiscount = appliedCoupon.discount_value;
      }
    }
  }
  const finalTotal = Math.max(0, total - currentDiscount);`
);

content = content.replace(
  "setAppliedCoupon({ code: couponCode, discountAmount: data.discountAmount });",
  "setAppliedCoupon(data.coupon);"
);

content = content.replace(
  "<span>-MXN ${appliedCoupon.discountAmount.toFixed(2)}</span>",
  "<span>-MXN ${currentDiscount.toFixed(2)}</span>"
);

// We need to fix the condition showing the discount
content = content.replace(
  "{appliedCoupon && (",
  "{isCouponActive && appliedCoupon && ("
);

content = content.replace(
  "checkout.mutate({ couponCode: appliedCoupon?.code });",
  "checkout.mutate({ couponCode: isCouponActive ? appliedCoupon?.code : undefined });"
);
content = content.replace(
  "checkout.mutate({ couponCode: appliedCoupon?.code });",
  "checkout.mutate({ couponCode: isCouponActive ? appliedCoupon?.code : undefined });"
);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed appliedCoupon logic');
