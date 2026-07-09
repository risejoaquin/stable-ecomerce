import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');

code = code.replace(
    "updateTracking.mutate({ tracking_number: trackingNumber, notes }), {",
    "updateTracking.mutate({ tracking_number: trackingNumber, notes }, {"
);

fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
