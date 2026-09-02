import React from 'react';
import { Mail, PackageCheck, Truck } from 'lucide-react';

const steps = [
  { icon: Mail, title: 'Confirmación enviada', text: 'Recibirás el resumen de tu compra por correo.' },
  { icon: PackageCheck, title: 'Preparación', text: 'El pedido entra a revisión y empaque.' },
  { icon: Truck, title: 'Rastreo', text: 'Cuando se envíe, podrás consultar el tracking.' },
];

export function PostPurchaseNextSteps() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 mt-8 text-left">
      {steps.map(({ icon: Icon, title, text }) => (
        <article key={title} className="rounded-2xl border border-[#2c251d1f] bg-white/70 p-4">
          <Icon size={20} className="mb-3 text-[#8a6b5a]" />
          <h4 className="font-black text-sm text-[#181611]">{title}</h4>
          <p className="text-xs leading-5 text-[#71695e] mt-1">{text}</p>
        </article>
      ))}
    </div>
  );
}
