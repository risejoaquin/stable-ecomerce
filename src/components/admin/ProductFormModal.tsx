import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthSafe as useAuth } from '../../hooks/useAuthSafe';
import { useApiClient } from '../../api/useApiClient';
import { Plus, X, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProductFormModal({ product, onClose }: { product: any, onClose: () => void }) {
  const { getToken } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const { data: storeInfo } = useQuery({
    queryKey: ['admin-store'],
    queryFn: () => apiClient.get('/admin/store')
  });
  const availableCategories = storeInfo?.store?.config?.categories || [];

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price || 0);
  const [brand, setBrand] = useState(product?.brand || '');
  const [categories, setCategories] = useState<string[]>(product?.categories || (product?.category && product.category !== '' ? [product.category] : []));
  const [subcategory, setSubcategory] = useState(product?.subcategory || '');
  const [stock, setStock] = useState(product?.stock || 0);
  const [status, setStatus] = useState(product?.status || 'active');
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [variants, setVariants] = useState<{ name: string; stock: number }[]>(product?.variants || []);
  const [uploading, setUploading] = useState(false);

  // Auto-calculate stock if variants exist
  useEffect(() => {
    if (variants.length > 0) {
      const totalStock = variants.reduce((acc, v) => acc + (v.stock || 0), 0);
      setStock(totalStock);
    }
  }, [variants]);

  const saveProduct = useMutation({
    mutationFn: (data: any) => product ? apiClient.put(`/admin/products/${product.id}`, data) : apiClient.post('/admin/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(product ? 'Product updated successfully' : 'Product created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save product');
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
        toast.error(data.error);
      }
    } catch(err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: 'name' | 'stock', value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[24px] p-8 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-2xl text-[var(--color-text)]">{product ? 'Edit Product' : 'New Product'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex flex-col gap-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">Name</label>
                <input 
                  className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                  value={name} onChange={e => setName(e.target.value)} 
                  placeholder="E.g. T-Shirt"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">Brand</label>
                <input 
                  className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                  value={brand} onChange={e => setBrand(e.target.value)} 
                  placeholder="E.g. Nike"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-2">Categorías</label>
                {availableCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat: any) => {
                      const isSelected = categories.includes(cat.name);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            if (isSelected) {
                              setCategories(categories.filter(c => c !== cat.name));
                            } else {
                              setCategories([...categories, cat.name]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            isSelected 
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                              : 'bg-white text-gray-600 border-[#E5E5E1] hover:border-gray-300'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex gap-2 items-center text-sm text-gray-500">
                    <input 
                      className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] opacity-50" 
                      value=""
                      disabled
                      placeholder="Crea categorías primero"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">Subcategoría</label>
                {(() => {
                  const selectedCategoriesData = availableCategories.filter((c: any) => categories.includes(c.name));
                  const availableSubcategories = selectedCategoriesData.flatMap((c: any) => c.subcategories || []);
                  
                  if (availableSubcategories.length > 0) {
                    return (
                      <select
                        className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                        value={subcategory}
                        onChange={e => setSubcategory(e.target.value)}
                      >
                        <option value="">Selecciona una subcategoría</option>
                        {availableSubcategories.map((sub: any) => (
                          <option key={sub.id} value={sub.name}>{sub.name}</option>
                        ))}
                      </select>
                    );
                  }
                  
                  return (
                    <div className="flex gap-2 items-center text-sm text-gray-500">
                      <input 
                        className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] opacity-50" 
                        value={subcategory} 
                        disabled
                        placeholder="Selecciona una categoría con subcategorías"
                      />
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">Description</label>
              <textarea 
                rows={3}
                className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none" 
                value={description} onChange={e => setDescription(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">Price ($)</label>
                <input 
                  type="number" 
                  className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                  value={price} onChange={e => setPrice(Number(e.target.value))} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">Total Stock</label>
                <input 
                  type="number" 
                  className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] bg-gray-50" 
                  value={stock} onChange={e => setStock(Number(e.target.value))} 
                  disabled={variants.length > 0}
                  title={variants.length > 0 ? "Stock is calculated automatically from variants" : ""}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-secondary)] mb-1">Status</label>
                <select 
                  className="w-full bg-[var(--color-background)] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                  value={status} onChange={e => setStatus(e.target.value)} 
                >
                  <option value="active">Active</option>
                  <option value="hidden">Hidden / Archived</option>
                </select>
              </div>
            </div>

            {/* Variants */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-[var(--color-secondary)]">Variants (Sizes, Colors)</label>
                <button 
                  onClick={addVariant}
                  className="text-xs flex items-center gap-1 text-[var(--color-primary)] font-semibold hover:text-[#5a5e4d]"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>
              
              {variants.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {variants.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <div className="flex-1">
                        <label className="sr-only" htmlFor={`variant-name-${i}`}>Nombre de la Variante</label>
                        <input 
                          id={`variant-name-${i}`}
                          className="w-full bg-white border border-[#E5E5E1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                          placeholder="Nombre (ej. Negro M)"
                          value={v.name}
                          onChange={(e) => updateVariant(i, 'name', e.target.value)}
                          aria-label={`Nombre de la variante ${i + 1}`}
                        />
                      </div>
                      <div className="w-24">
                        <label className="sr-only" htmlFor={`variant-stock-${i}`}>Stock</label>
                        <input 
                          id={`variant-stock-${i}`}
                          type="number"
                          className="w-full bg-white border border-[#E5E5E1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={(e) => updateVariant(i, 'stock', Number(e.target.value))}
                          aria-label={`Stock de la variante ${i + 1}`}
                          min="0"
                        />
                      </div>
                      <button 
                        onClick={() => removeVariant(i)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        aria-label={`Eliminar variante ${i + 1}`}
                        title="Eliminar variante"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center">
                  No variants added. Using total stock instead.
                </div>
              )}
            </div>

            {/* Images */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-secondary)] mb-2">Product Images</label>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {images.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl border border-gray-200 overflow-hidden group">
                    <img src={url} className="w-full h-full object-cover" alt={`Product ${i+1}`} />
                    <button 
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))} 
                      className="absolute top-2 right-2 bg-white/90 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-500 hover:text-white"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 px-2">
                      Image {i + 1} {i === 0 ? '(Main)' : ''}
                    </div>
                  </div>
                ))}
                
                <label className="relative aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-[var(--color-primary)] transition-colors group">
                  {uploading ? (
                    <div className="text-xs text-[var(--color-secondary)] font-medium animate-pulse">Uploading...</div>
                  ) : (
                    <>
                      <div className="bg-gray-100 p-3 rounded-full text-gray-400 group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/10 transition-colors mb-2">
                        <Upload size={20} />
                      </div>
                      <span className="text-xs font-medium text-gray-500 group-hover:text-[var(--color-primary)]">Add Image</span>
                    </>
                  )}
                  <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" accept="image/*" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button 
            onClick={() => saveProduct.mutate({ name, description, price, stock, status, images, brand, category: categories.length > 0 ? categories[0] : '', categories, subcategory, variants })}
            disabled={saveProduct.isPending || !name}
            className="bg-[#1a1a1a] text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saveProduct.isPending ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
