import { useMutation } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';
import { useCart } from '../App';

export function useCheckout(storeId?: string) {
  const apiFetch = useApiClient();
  const { items, clearCart } = useCart();

  return useMutation({
    mutationFn: async ({ couponCode }: { couponCode?: string } = {}) => {
      const customerEmail = typeof window !== 'undefined' ? localStorage.getItem('guest_email') : null;
      
      const orderRes = await apiFetch.post("/orders", {
        storeId,
        items: items.map(i => ({ productId: i.productId || i.id, quantity: i.quantity })),
        couponCode,
        customerEmail
      });
      
      const checkoutRes = await apiFetch.post("/checkout", {
        orderId: orderRes.id
      });
      
      return checkoutRes.url;
    },
    onSuccess: (url) => {
      // Don't clear cart immediately here so if they cancel, they still have it
      // clearCart will happen on success page
      window.location.href = url;
    },
  });
}
