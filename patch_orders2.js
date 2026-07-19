import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf8');

// Replace action buttons
content = content.replace(
`                    {order.status === 'pagado' && (
                      <button 
                        onClick={() => updateStatus.mutate('shipped')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={16} /> Mark as Shipped
                      </button>
                    )}`,
`                    {order.status === 'pagado' && (
                      <button 
                        onClick={() => updateStatus.mutate('empacado')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={16} /> Marcar como Empacado
                      </button>
                    )}
                    {order.status === 'empacado' && (
                      <button 
                        onClick={() => updateStatus.mutate('enviado')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={16} /> Marcar como Enviado
                      </button>
                    )}
                    {order.status === 'enviado' && (
                      <button 
                        onClick={() => updateStatus.mutate('entregado')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={16} /> Marcar como Entregado
                      </button>
                    )}`
);

content = content.replace(
`                        <X size={16} /> Cancel Order`,
`                        <X size={16} /> Cancelar Pedido`
);

content = content.replace(
  `updateStatus.mutate('cancelled')`,
  `updateStatus.mutate('cancelado')`
);

fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', content);
