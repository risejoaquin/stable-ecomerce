import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf8');

content = content.replace(
  `{['all', 'pending', 'paid', 'shipped', 'refunded', 'cancelled'].map(status => (`,
  `{['all', 'pendiente', 'pagado', 'empacado', 'enviado', 'entregado', 'cancelado'].map(status => (`
);

content = content.replace(
`  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'refunded': 
      case 'partially_refunded':
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };`,
`  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pagado': return 'bg-emerald-100 text-emerald-800';
      case 'empacado': return 'bg-purple-100 text-purple-800';
      case 'enviado': return 'bg-blue-100 text-blue-800';
      case 'entregado': return 'bg-teal-100 text-teal-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      case 'pendiente':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };`
);

content = content.replace(
  `{order.status === 'paid' && (`,
  `{order.status === 'pagado' && (`
);

content = content.replace(
  `{['pending', 'paid'].includes(order.status) && (`,
  `{['pendiente', 'pagado', 'empacado', 'enviado'].includes(order.status) && (`
);

content = content.replace(
  `{['paid', 'shipped'].includes(order.status) && (`,
  `{['pagado', 'empacado', 'enviado'].includes(order.status) && (`
);

fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', content);
