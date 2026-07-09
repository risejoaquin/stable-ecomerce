import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSafe as useAuth } from '../../hooks/useAuthSafe';
import { useApiClient } from '../../api/useApiClient';

export function ProductFormModal({ product, onClose }: { product: any, onClose: () => void }) {
  const { getToken } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price || 0);
  const [stock, setStock] = useState(product?.stock || 0);
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [uploading, setUploading] = useState(false);

  const saveProduct = useMutation({
    mutationFn: (data: any) => product ? apiClient.put(`/admin/products/${product.id}`, data) : apiClient.post('/admin/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      onClose();
    }
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getToken() || ''}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setImages([...images, data.url]);
      } else if (data.error) {
        alert(data.error);
      }
    } catch(err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-xl">
        <h3 className="font-serif text-2xl text-[#333] mb-6">{product ? 'Edit Product' : 'New Product'}</h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#A5A58D] mb-1">Name</label>
            <input 
              className="w-full bg-[#FDFCFB] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#6B705C]" 
              value={name} onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#A5A58D] mb-1">Price</label>
              <input 
                type="number" 
                className="w-full bg-[#FDFCFB] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#6B705C]" 
                value={price} onChange={e => setPrice(Number(e.target.value))} 
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#A5A58D] mb-1">Stock</label>
              <input 
                type="number" 
                className="w-full bg-[#FDFCFB] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#6B705C]" 
                value={stock} onChange={e => setStock(Number(e.target.value))} 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#A5A58D] mb-1">Images</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {images.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} className="w-16 h-16 object-cover rounded-xl" alt="" />
                  <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ))}
            </div>
            <input type="file" onChange={handleUpload} disabled={uploading} className="text-sm" />
            {uploading && <span className="text-xs text-[#A5A58D] ml-2">Uploading...</span>}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          <button 
            onClick={() => saveProduct.mutate({ name, price, stock, images })}
            disabled={saveProduct.isPending || !name}
            className="bg-[#6B705C] text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#5a5e4d] transition-colors disabled:opacity-50"
          >
            {saveProduct.isPending ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
