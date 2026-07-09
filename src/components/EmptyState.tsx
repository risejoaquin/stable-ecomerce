import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmptyState({ 
  title, 
  description, 
  actionText, 
  actionLink 
}: { 
  title: string, 
  description: string, 
  actionText?: string, 
  actionLink?: string 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <PackageOpen size={40} className="text-gray-300" />
      </div>
      <h2 className="text-2xl font-bold font-serif mb-2">{title}</h2>
      <p className="text-gray-500 mb-8 max-w-sm">{description}</p>
      {actionText && actionLink && (
        <Link to={actionLink} className="bg-[#6B705C] text-white px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-opacity">
          {actionText}
        </Link>
      )}
    </div>
  );
}
