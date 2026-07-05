import React from 'react';

export function ProductTable({ products, onEdit, onDelete }: { products: any[], onEdit: (p: any) => void, onDelete: (id: string) => void }) {
  if (!products || products.length === 0) {
    return <p className="text-gray-500 py-4">No products found. Create one to get started.</p>;
  }

  return (
    <table className="w-full text-left">
      <thead className="text-[10px] uppercase tracking-widest font-bold text-[#A5A58D] border-b border-[#F0EFE9]">
        <tr className="h-10">
          <th className="font-medium">Image</th>
          <th className="font-medium">Product Name</th>
          <th className="font-medium">Price</th>
          <th className="font-medium">Stock</th>
          <th className="font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="text-sm">
        {products.map((p: any) => (
          <tr key={p.id} className="h-14 border-b border-[#F0EFE9] last:border-0">
            <td className="w-12 py-2">
              {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-md" /> : <div className="w-10 h-10 bg-gray-100 rounded-md"></div>}
            </td>
            <td className="font-medium">{p.name}</td>
            <td className="text-gray-600">${(p.price || 0).toFixed(2)}</td>
            <td className="text-gray-600">{p.stock}</td>
            <td className="text-right">
              <button onClick={() => onEdit(p)} className="text-[#6B705C] font-bold text-xs mr-3 hover:underline">Edit</button>
              <button onClick={() => { if(window.confirm('Delete product?')) onDelete(p.id); }} className="text-red-500 font-bold text-xs hover:underline">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
