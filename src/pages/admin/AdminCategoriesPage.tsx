import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminCategoriesPage() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newSubcatNames, setNewSubcatNames] = useState<Record<string, string>>({});

  const { data: storeInfo, isLoading } = useQuery({
    queryKey: ['admin-store'],
    queryFn: () => apiClient.get('/admin/store')
  });

  const updateConfig = useMutation({
    mutationFn: (newConfig: any) => apiClient.put('/admin/store/config', newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-store'] });
      toast.success('Categorías actualizadas');
      setEditingId(null);
      setNewCatName('');
      setNewSubcatNames({});
    }
  });

  if (isLoading) return <div className="p-8">Cargando...</div>;

  const config = storeInfo?.store?.config || {};
  const categories = config.categories || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCategories = [...categories, { id: crypto.randomUUID(), name: newCatName.trim(), subcategories: [] }];
    updateConfig.mutate({ ...config, categories: newCategories });
  };

  const handleAddSubcategory = (e: React.FormEvent, catId: string) => {
    e.preventDefault();
    const subName = newSubcatNames[catId];
    if (!subName || !subName.trim()) return;
    
    const newCategories = categories.map((c: any) => {
      if (c.id === catId) {
        return {
          ...c,
          subcategories: [...(c.subcategories || []), { id: crypto.randomUUID(), name: subName.trim() }]
        };
      }
      return c;
    });
    updateConfig.mutate({ ...config, categories: newCategories });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    const newCategories = categories.filter((c: any) => c.id !== id);
    updateConfig.mutate({ ...config, categories: newCategories });
  };

  const handleDeleteSubcategory = (catId: string, subId: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta subcategoría?')) return;
    const newCategories = categories.map((c: any) => {
      if (c.id === catId) {
        return {
          ...c,
          subcategories: (c.subcategories || []).filter((s: any) => s.id !== subId)
        };
      }
      return c;
    });
    updateConfig.mutate({ ...config, categories: newCategories });
  };

  const handleUpdate = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const newCategories = categories.map((c: any) => c.id === id ? { ...c, name: newName.trim() } : c);
    updateConfig.mutate({ ...config, categories: newCategories });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[var(--color-text)]">Categorías</h2>
          <p className="text-gray-500 mt-1">Gestiona las categorías de tus productos</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] p-6 mb-8">
        <h3 className="font-bold mb-4">Añadir Nueva Categoría</h3>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Nombre de la categoría (ej. Zapatos)" 
            className="flex-1 border border-[#E5E5E1] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--color-primary)]"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!newCatName.trim() || updateConfig.isPending}
            className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#5a5e4d] disabled:opacity-50 flex items-center gap-2"
          >
            <Plus size={18} /> Añadir
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay categorías. Crea una arriba.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-[#E5E5E1]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E1]">
              {categories.map((cat: any) => (
                <React.Fragment key={cat.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === cat.id ? (
                        <input 
                          type="text" 
                          defaultValue={cat.name}
                          className="border border-[#E5E5E1] rounded px-2 py-1 w-full max-w-xs focus:outline-none focus:border-[var(--color-primary)]"
                          onBlur={(e) => handleUpdate(cat.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id, e.currentTarget.value)}
                          autoFocus
                        />
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{cat.name}</span>
                          {cat.subcategories && cat.subcategories.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {cat.subcategories.map((sub: any) => (
                                <span key={sub.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                                  {sub.name}
                                  <button onClick={() => handleDeleteSubcategory(cat.id, sub.id)} className="text-gray-400 hover:text-red-500 ml-1">
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <form onSubmit={(e) => handleAddSubcategory(e, cat.id)} className="mt-3 flex gap-2">
                            <input 
                              type="text"
                              placeholder="Nueva subcategoría..."
                              className="text-xs border border-[#E5E5E1] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-primary)] w-32"
                              value={newSubcatNames[cat.id] || ''}
                              onChange={(e) => setNewSubcatNames({...newSubcatNames, [cat.id]: e.target.value})}
                            />
                            <button type="submit" className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Añadir</button>
                          </form>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingId(cat.id)} 
                          className="p-2 text-gray-400 hover:text-[var(--color-primary)] transition-colors rounded-lg hover:bg-gray-100"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id)} 
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
