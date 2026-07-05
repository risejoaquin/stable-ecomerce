import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminProducts } from '../../hooks/useProducts';
import { useApiClient } from '../../api/useApiClient';
import { ProductTable } from '../../components/admin/ProductTable';
import { ProductFormModal } from '../../components/admin/ProductFormModal';

export function ProductsPage() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: products, isLoading } = useAdminProducts();

  const deleteProduct = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] })
  });

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteProduct.mutate(id);
  };

  return (
    <div className="p-10 flex flex-col gap-6 h-full relative">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-[#333]">Products</h2>
        <button 
          onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
          className="bg-[#6B705C] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#5a5e4d] transition-colors"
        >
          Add Product
        </button>
      </div>
      <div className="bg-white rounded-[24px] border border-[#E5E5E1] flex-1 p-6 overflow-auto">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <ProductTable 
            products={products || []} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        )}
      </div>

      {isFormOpen && (
        <ProductFormModal 
          product={editingProduct} 
          onClose={() => { setIsFormOpen(false); setEditingProduct(null); }} 
        />
      )}
    </div>
  );
}
