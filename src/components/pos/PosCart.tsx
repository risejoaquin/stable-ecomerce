import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PosCartItem, formatCurrency } from '../../hooks/usePosCart';

export interface PosCartProps {
  items: PosCartItem[];
  onIncrement: (unitId: string) => void;
  onDecrement: (unitId: string) => void;
  onRemove: (unitId: string) => void;
  onClearCart: () => void;
  onOpenTender: () => void;
  estimatedSubtotal: number;
  totalItems: number;
  className?: string;
}

export const PosCart: React.FC<PosCartProps> = ({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  onClearCart,
  onOpenTender,
  estimatedSubtotal,
  totalItems,
  className = '',
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleConfirmClear = () => {
    onClearCart();
    setShowClearConfirm(false);
  };

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden ${className}`}
      data-testid="pos-cart-container"
    >
      {/* Cart Header */}
      <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-neutral-800" />
          <h3 className="font-semibold text-neutral-900 text-base">Carrito de Venta</h3>
          <span
            data-testid="cart-badge-total-items"
            className="px-2 py-0.5 text-xs font-semibold rounded-full bg-neutral-900 text-white"
          >
            {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
          </span>
        </div>

        {items.length > 0 && !showClearConfirm && (
          <button
            type="button"
            data-testid="pos-cart-clear-btn"
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
          >
            Vaciar Carrito
          </button>
        )}
      </div>

      {/* Clear Confirmation Prompt */}
      {showClearConfirm && (
        <div
          data-testid="pos-clear-confirm-dialog"
          className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 text-rose-800 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>¿Confirmas vaciar todos los artículos del carrito?</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="pos-clear-confirm-yes"
              onClick={handleConfirmClear}
              className="px-2.5 py-1 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700"
            >
              Sí, vaciar
            </button>
            <button
              type="button"
              data-testid="pos-clear-confirm-no"
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 bg-white text-neutral-700 border border-neutral-300 text-xs font-medium rounded hover:bg-neutral-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]" data-testid="pos-cart-items-list">
        {items.length === 0 ? (
          <div className="text-center py-16 px-4" data-testid="pos-cart-empty-state">
            <ShoppingCart className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-700">El carrito está vacío</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Seleccione productos del catálogo o escanee un código de barras para comenzar la venta.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const lineSubtotal = item.sellableUnit.price * item.quantity;
            return (
              <div
                key={item.sellableUnit.id}
                data-testid={`cart-item-${item.sellableUnit.id}`}
                className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-neutral-900 truncate">
                    {item.sellableUnit.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 font-mono">
                    <span>SKU: {item.sellableUnit.sku}</span>
                    <span>•</span>
                    <span>{formatCurrency(item.sellableUnit.price)} c/u</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      data-testid={`cart-item-decrement-${item.sellableUnit.id}`}
                      onClick={() => onDecrement(item.sellableUnit.id)}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                      aria-label={`Disminuir cantidad de ${item.sellableUnit.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span
                      data-testid={`cart-item-quantity-${item.sellableUnit.id}`}
                      className="w-9 text-center text-xs font-semibold text-neutral-900"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      data-testid={`cart-item-increment-${item.sellableUnit.id}`}
                      onClick={() => onIncrement(item.sellableUnit.id)}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                      aria-label={`Aumentar cantidad de ${item.sellableUnit.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-20 text-right">
                    <span
                      data-testid={`cart-item-subtotal-${item.sellableUnit.id}`}
                      className="text-sm font-bold text-neutral-900"
                    >
                      {formatCurrency(lineSubtotal)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    data-testid={`cart-item-remove-${item.sellableUnit.id}`}
                    onClick={() => onRemove(item.sellableUnit.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                    aria-label={`Eliminar ${item.sellableUnit.name} del carrito`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Actions Footer */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50/70 space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Total de artículos:</span>
            <span className="font-medium text-neutral-900" data-testid="cart-summary-items-count">
              {totalItems}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200">
            <span className="text-base font-bold text-neutral-900">Total Estimado:</span>
            <span
              className="text-xl font-extrabold text-neutral-900"
              data-testid="cart-summary-estimated-subtotal"
            >
              {formatCurrency(estimatedSubtotal)}
            </span>
          </div>
        </div>

        {/* Backend Authority Note */}
        <div className="flex items-start gap-1.5 text-[11px] text-neutral-500 bg-neutral-100/80 p-2 rounded-md border border-neutral-200">
          <Info className="h-3.5 w-3.5 shrink-0 text-neutral-400 mt-0.5" />
          <span>
            Subtotal estimado en cliente. La autoridad transaccional de precio e inventario reside en el backend.
          </span>
        </div>

        {/* Proceed to Tender Button */}
        <button
          type="button"
          data-testid="pos-proceed-to-tender-btn"
          disabled={items.length === 0}
          onClick={onOpenTender}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
            items.length === 0
              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.99] cursor-pointer'
          }`}
        >
          <span>Proceder al Cobro</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
