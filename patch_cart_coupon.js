import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// I need to find where CartDrawer is defined and add Coupon input.
// First, import useValidateCoupon if it's not imported.
if (!code.includes('useValidateCoupon')) {
  code = `import { useValidateCoupon } from './hooks/useCoupon';\n` + code;
}

// In CartDrawer, add state for coupon.
const cartDrawerStatePattern = `const { items, removeItem, updateQuantity, setIsCartOpen, clearCart } = useCart();`;
const cartDrawerStateReplacement = `const { items, removeItem, updateQuantity, setIsCartOpen, clearCart } = useCart();
  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<any>(null);
  const [couponError, setCouponError] = React.useState('');
  const validateCoupon = useValidateCoupon();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    setCouponError('');
    validateCoupon.mutate({ code: couponCode, storeId, orderTotal: items.reduce((acc, item) => acc + item.price * item.quantity, 0) }, {
      onSuccess: (data) => {
        if (data.error) {
          setCouponError(data.error);
          setAppliedCoupon(null);
        } else {
          setAppliedCoupon(data.coupon);
        }
      },
      onError: (err: any) => {
        setCouponError(err.response?.data?.error || 'Invalid coupon');
        setAppliedCoupon(null);
      }
    });
  };`;

if (!code.includes('handleApplyCoupon')) {
    code = code.replace(cartDrawerStatePattern, cartDrawerStateReplacement);
}

const checkoutFunctionPattern = `const { data } = await apiClient.post('/orders', { items, storeId });`;
const checkoutFunctionReplacement = `const { data } = await apiClient.post('/orders', { items, storeId, couponCode: appliedCoupon?.code });`;

if (code.includes(checkoutFunctionPattern)) {
    code = code.replace(checkoutFunctionPattern, checkoutFunctionReplacement);
}

const totalCalculationPattern = `const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);`;
const totalCalculationReplacement = `const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
          discount = (subtotal * appliedCoupon.discount_value) / 100;
      } else {
          discount = appliedCoupon.discount_value;
      }
  }
  const total = Math.max(0, subtotal - discount);`;

if (code.includes(totalCalculationPattern) && !code.includes('const subtotal =')) {
    code = code.replace(totalCalculationPattern, totalCalculationReplacement);
}

const renderTotalPattern = `<span className="font-bold">Total</span>\n                <span className="font-bold">\${total.toFixed(2)}</span>`;
const renderTotalReplacement = `<span className="font-bold">Subtotal</span>\n                <span className="font-bold">\${subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-\${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t mt-4 text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold">\${total.toFixed(2)}</span>`;

if (code.includes(renderTotalPattern) && !code.includes('Discount (')) {
    code = code.replace(renderTotalPattern, renderTotalReplacement);
}

const couponInputUI = `
            <div className="border-t border-[#F0EFE9] p-6 pb-2">
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Promo Code" 
                  className="flex-1 border border-[#E5E5E1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ '--tw-ring-color': themeColor } as any}
                />
                <button 
                  type="submit" 
                  disabled={validateCoupon.isPending}
                  className="px-4 py-2 bg-gray-100 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Apply
                </button>
              </form>
              {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
              {appliedCoupon && <p className="text-green-600 text-xs mt-2 flex items-center justify-between">Coupon applied! <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="underline">Remove</button></p>}
            </div>
`;

const replaceCouponUI = `<div className="border-t border-[#F0EFE9] p-6 bg-[#FDFCFB]">`;

if (code.includes(replaceCouponUI) && !code.includes('handleApplyCoupon} className="flex gap-2"')) {
    code = code.replace(replaceCouponUI, couponInputUI + `\n            ` + replaceCouponUI);
}

fs.writeFileSync('src/App.tsx', code);
