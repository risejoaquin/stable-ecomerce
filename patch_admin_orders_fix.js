import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');

// Ensure useAdminOrders is imported
if (!code.includes("import { useAdminOrders")) {
    code = code.replace(
        "import * as Dialog from '@radix-ui/react-dialog';",
        "import * as Dialog from '@radix-ui/react-dialog';\nimport { useAdminOrders, useAdminOrder, useUpdateOrderTracking, useUpdateOrderStatus, useRefundOrder } from '../../hooks/useAdminOrders';"
    );
}

// Ensure states are correctly added to OrderDetailsModal
const orderDetailsModalRegex = /function OrderDetailsModal\(\{ orderId, onClose, getStatusColor \}: \{ orderId: string, onClose: \(\) => void, getStatusColor: \(s:string\)=>string \}\) \{/;
const modalInjection = `function OrderDetailsModal({ orderId, onClose, getStatusColor }: { orderId: string, onClose: () => void, getStatusColor: (s:string)=>string }) {
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');
`;
if (code.match(orderDetailsModalRegex)) {
    code = code.replace(orderDetailsModalRegex, modalInjection);
}

// Delete duplicate old hooks from the modal if any
const duplicateHooksRegex = /const updateStatus = useMutation.*?toast\.error\(err\.message \|\| 'Refund failed'\);\n    \}\n  \}\);/s;
code = code.replace(duplicateHooksRegex, '');

// Re-add the proper hook usage for OrderDetailsModal
const oldOrderQueryRegex = /const apiClient = useApiClient\(\);\n  const queryClient = useQueryClient\(\);\n\n  const \{ data: order, isLoading \} = useQuery\(\{[\s\S]*?enabled: !!orderId\n  \}\);/s;

const replacementHooks = `
  const { data: order, isLoading } = useAdminOrder(orderId);
  const updateStatus = useUpdateOrderStatus(orderId);
  const refundOrder = useRefundOrder(orderId);
  const updateTracking = useUpdateOrderTracking(orderId);

  React.useEffect(() => {
    if (order) {
      setTrackingNumber(order.tracking_number || '');
      setNotes(order.notes || '');
    }
  }, [order]);
`;
if (code.match(oldOrderQueryRegex)) {
    code = code.replace(oldOrderQueryRegex, replacementHooks.trim());
}

// In the tracking update button, change notes variable to be passed properly if not defined
code = code.replace(
    /updateTracking\.mutate\(\{ tracking_number: trackingNumber, notes \}/g,
    "updateTracking.mutate({ tracking_number: trackingNumber, notes })"
);


fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
