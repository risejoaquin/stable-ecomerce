import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');

const regex = /const \{ data: order, isLoading \} = useQuery\(\{\n\s*queryKey: \['admin-order', orderId\],\n\s*queryFn: \(\) => apiClient\.get\(`\/admin\/orders\/\$\{orderId\}`\)\n\s*\}\);/;

const replacement = `
  const { data: order, isLoading } = useAdminOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const refundOrder = useRefundOrder();
  const updateTracking = useUpdateOrderTracking(orderId);
  
  React.useEffect(() => {
    if (order) {
      setTrackingNumber(order.tracking_number || '');
      setNotes(order.notes || '');
    }
  }, [order]);
`;

code = code.replace(regex, replacement.trim());
fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
