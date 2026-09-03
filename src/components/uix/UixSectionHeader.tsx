import React from 'react';

type UixSectionHeaderProps = {
  eyebrow?: string;
  title: React.ReactNode;
  note?: React.ReactNode;
  action?: React.ReactNode;
  align?: 'left' | 'center';
};

export function UixSectionHeader({ eyebrow, title, note, action, align = 'left' }: UixSectionHeaderProps) {
  return (
    <div className={`uix-section-header ${align === 'center' ? 'is-centered' : ''}`}>
      <div>
        {eyebrow && <p className="uix-eyebrow">{eyebrow}</p>}
        <h2 className="uix-section-title">{title}</h2>
        {note && <p className="uix-section-note">{note}</p>}
      </div>
      {action && <div className="uix-section-action">{action}</div>}
    </div>
  );
}
