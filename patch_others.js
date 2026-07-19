import fs from 'fs';
let trackContent = fs.readFileSync('src/pages/store/TrackOrderPage.tsx', 'utf8');

trackContent = trackContent.replace(
`  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'refunded': 
      case 'cancelled': return 'bg-red-100 text-red-800';
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

fs.writeFileSync('src/pages/store/TrackOrderPage.tsx', trackContent);

let dashContent = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
dashContent = dashContent.replace(
`                          o.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'`,
`                          o.status === 'pagado' ? 'bg-green-100 text-green-700' : 
                          o.status === 'entregado' ? 'bg-teal-100 text-teal-700' :
                          o.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'`
);
fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', dashContent);

