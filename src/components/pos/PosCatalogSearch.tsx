import React, { useState, useMemo } from 'react';
import { Search, Barcode, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  SellableUnit,
  MOCK_SELLABLE_UNITS,
  formatCurrency,
} from '../../hooks/usePosCart';

export interface PosCatalogSearchProps {
  catalog?: SellableUnit[];
  onAddToCart: (unit: SellableUnit) => void;
  className?: string;
}

export const PosCatalogSearch: React.FC<PosCatalogSearchProps> = ({
  catalog = MOCK_SELLABLE_UNITS,
  onAddToCart,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeNotification, setBarcodeNotification] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [catalog]);

  // Filtered items based on search term and category
  const filteredCatalog = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return catalog.filter((unit) => {
      const matchesCategory =
        selectedCategory === 'all' || unit.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!query) return true;

      const matchesName = unit.name.toLowerCase().includes(query);
      const matchesSku = unit.sku.toLowerCase().includes(query);
      const matchesBarcode = unit.barcode.includes(query);

      return matchesName || matchesSku || matchesBarcode;
    });
  }, [catalog, searchTerm, selectedCategory]);

  // Barcode / Fast scanner enter key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawTerm = searchTerm.trim();
      if (!rawTerm) return;

      // Exact barcode match first
      const exactBarcode = catalog.find((u) => u.barcode === rawTerm);
      if (exactBarcode) {
        if (exactBarcode.stock > 0) {
          onAddToCart(exactBarcode);
          setBarcodeNotification(`Escaneado: ${exactBarcode.name}`);
          setSearchTerm('');
        } else {
          setBarcodeNotification(`Agotado: ${exactBarcode.name}`);
        }
        setTimeout(() => setBarcodeNotification(null), 3000);
        return;
      }

      // Exact SKU match
      const exactSku = catalog.find((u) => u.sku.toLowerCase() === rawTerm.toLowerCase());
      if (exactSku) {
        if (exactSku.stock > 0) {
          onAddToCart(exactSku);
          setBarcodeNotification(`Agregado por SKU: ${exactSku.name}`);
          setSearchTerm('');
        } else {
          setBarcodeNotification(`Agotado: ${exactSku.name}`);
        }
        setTimeout(() => setBarcodeNotification(null), 3000);
        return;
      }

      // If single search result, add it
      if (filteredCatalog.length === 1) {
        const single = filteredCatalog[0];
        if (single.stock > 0) {
          onAddToCart(single);
          setBarcodeNotification(`Agregado: ${single.name}`);
          setSearchTerm('');
        } else {
          setBarcodeNotification(`Agotado: ${single.name}`);
        }
        setTimeout(() => setBarcodeNotification(null), 3000);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden ${className}`}>
      {/* Search Header */}
      <div className="p-4 border-b border-neutral-200 bg-neutral-50/50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            data-testid="pos-catalog-search-input"
            className="block w-full pl-10 pr-24 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
            placeholder="Buscar por nombre, SKU o código de barras (Enter para escanear)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Buscar productos en catálogo POS"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-neutral-100 text-neutral-600 border border-neutral-200">
              <Barcode className="h-3 w-3" /> Scan
            </span>
          </div>
        </div>

        {/* Scan / Action Notification */}
        {barcodeNotification && (
          <div
            data-testid="pos-scanner-feedback"
            className={`mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md ${
              barcodeNotification.includes('Agotado')
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {barcodeNotification.includes('Agotado') ? (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{barcodeNotification}</span>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            data-testid="category-filter-all"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Todos ({catalog.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              data-testid={`category-filter-${cat}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog List / Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
        {filteredCatalog.length === 0 ? (
          <div className="text-center py-12 px-4" data-testid="catalog-empty-state">
            <Search className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-700">No se encontraron productos</p>
            <p className="text-xs text-neutral-500 mt-1">
              Verifique el término de búsqueda o el código de barras ingresado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="pos-catalog-grid">
            {filteredCatalog.map((unit) => {
              const isOutOfStock = unit.stock <= 0;
              return (
                <div
                  key={unit.id}
                  data-testid={`catalog-item-${unit.id}`}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isOutOfStock
                      ? 'bg-neutral-50/70 border-neutral-200 opacity-60'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug">
                        {unit.name}
                      </h4>
                      <span className="text-sm font-bold text-neutral-900 shrink-0">
                        {formatCurrency(unit.price)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 font-mono">
                      <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">
                        SKU: {unit.sku}
                      </span>
                      <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1">
                        <Barcode className="h-3 w-3" /> {unit.barcode}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    <div>
                      {isOutOfStock ? (
                        <span className="text-xs font-medium text-rose-600">Agotado</span>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            unit.stock <= 5 ? 'text-amber-600' : 'text-neutral-500'
                          }`}
                        >
                          Stock: {unit.stock}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      data-testid={`add-to-cart-${unit.id}`}
                      disabled={isOutOfStock}
                      onClick={() => onAddToCart(unit)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isOutOfStock
                          ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-98'
                      }`}
                      aria-label={`Agregar ${unit.name} al carrito`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
