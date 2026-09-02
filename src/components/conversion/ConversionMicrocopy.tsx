import React from 'react';

export function ConversionMicrocopy({ type = 'checkout' }: { type?: 'checkout' | 'account' | 'tracking' }) {
  const copy = {
    checkout: 'Tu pago se procesa de forma segura. El inventario se confirma al completar la compra.',
    account: 'Mantén tus datos actualizados para acelerar futuras compras y seguimiento de pedidos.',
    tracking: 'Consulta el avance del pedido con el correo usado al comprar. No necesitas iniciar sesión.',
  } as const;
  return <p className="text-[11px] leading-5 text-center text-[#71695e]">{copy[type]}</p>;
}
