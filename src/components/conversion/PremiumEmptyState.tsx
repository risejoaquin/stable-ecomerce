import React from 'react';
import { Sparkles } from 'lucide-react';

export function PremiumEmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="ss-premium-card text-center p-8 sm:p-12">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4e7d7] text-[#8a6b5a]">
        <Sparkles size={26} />
      </div>
      <p className="ss-eyebrow mb-3">Selfcare Sinners</p>
      <h3 className="font-serif text-2xl font-black text-[#181611] mb-3">{title}</h3>
      <p className="mx-auto max-w-md text-sm leading-6 text-[#71695e] mb-6">{description}</p>
      {action}
    </div>
  );
}
