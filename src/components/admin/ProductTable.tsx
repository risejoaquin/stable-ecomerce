import React from 'react';

export function ProductTable({ products, onEdit, onDelete }: { products: any[], onEdit: (p: any) => void, onDelete: (id: string) => void }) {
  if (!products || products.length === 0) {
    return <p className="text-gray-500 py-4">No products found. Create one to get started.</p>;
  }

  return (
    <div className="overflow-x-auto"><table className="w-full text-left">
      <thead className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-secondary)] border-b border-[#F0EFE9]">
        <tr className="h-10">
          <th className="font-medium">Image</th>
          <th className="font-medium">Product Name</th>
          <th className="font-medium">Brand</th>
          <th className="font-medium">Category</th>
          <th className="font-medium">Subcategoría</th>
          <th className="font-medium">Price</th>
          <th className="font-medium">Stock</th>
          <th className="font-medium">Status</th>
          <th className="font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="text-sm">
        {products.map((p: any) => (
          <tr key={p.id} className="h-14 border-b border-[#F0EFE9] last:border-0 hover:bg-gray-50/50">
            <td className="w-12 py-2">
              {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-md" /> : <div className="w-10 h-10 bg-gray-100 rounded-md"></div>}
            </td>
            <td className="font-medium">{p.name}</td>
            <td className="text-gray-500 text-xs">{p.brand || '-'}</td>
            <td className="text-gray-500 text-xs">{p.categories?.length > 0 ? p.categories.join(', ') : (p.category || '-')}</td>
            <td className="text-gray-500 text-xs">{p.subcategory || '-'}</td>
            <td className="text-gray-600">MXN ${(p.price || 0).toFixed(2)}</td>
            <td className="text-gray-600">
              <div className="flex flex-col">
                <span>{p.stock}</span>
                {p.variants?.length > 0 && (
                  <span className="text-[10px] text-gray-400">{p.variants.length} variant(s)</span>
                )}
              </div>
            </td>
            <td>
              <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md ${p.status === 'hidden' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                {p.status || 'active'}
              </span>
            </td>
            <td className="text-right">
              <button onClick={() => onEdit(p)} className="text-[var(--color-primary)] font-bold text-xs mr-3 hover:underline">Edit</button>
              <button onClick={() => { if(window.confirm('Delete product?')) onDelete(p.id); }} className="text-red-500 font-bold text-xs hover:underline">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
