import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');

code = code.replace(
  "const updateStatus = useUpdateOrderStatus();\n  const refundOrder = useRefundOrder();",
  "const updateStatus = useUpdateOrderStatus(orderId);\n  const refundOrder = useRefundOrder(orderId);"
);

fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
