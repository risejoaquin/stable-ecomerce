import React, { useState, useCallback } from 'react';
import {
  Monitor,
  ShoppingBag,
} from 'lucide-react';
import {
  usePosCart,
  createClientRequestId,
  toMinorUnits,
  fromMinorUnits,
  subtractMoney,
  PosSalePayload,
  PosSaleResponse,
  PosSaleSuccessResponse,
  SellableUnit,
  MOCK_SELLABLE_UNITS,
} from '../../hooks/usePosCart';
import { PosCatalogSearch } from '../../components/pos/PosCatalogSearch';
import { PosCart } from '../../components/pos/PosCart';
import { PosTenderModal } from '../../components/pos/PosTenderModal';

export interface PosRegisterPageProps {
  initialCatalog?: SellableUnit[];
  terminalId?: string;
  onSaleSubmit?: (payload: PosSalePayload) => Promise<PosSaleResponse>;
}

export const PosRegisterPage: React.FC<PosRegisterPageProps> = ({
  initialCatalog = MOCK_SELLABLE_UNITS,
  terminalId = 'TERM-POS-01',
  onSaleSubmit,
}) => {
  const {
    items,
    addItem,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
    totalItems,
    estimatedSubtotal,
  } = usePosCart();

  // Tender modal state & Idempotent clientRequestId
  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [currentClientRequestId, setCurrentClientRequestId] = useState<string>('');

  // Open tender modal and establish a fresh clientRequestId for the commercial attempt
  const handleOpenTender = useCallback(() => {
    if (items.length === 0) return;
    const newRequestId = createClientRequestId();
    setCurrentClientRequestId(newRequestId);
    setIsTenderOpen(true);
  }, [items.length]);

  const handleCloseTender = useCallback(() => {
    setIsTenderOpen(false);
  }, []);

  // Default mock submission if onSaleSubmit is not injected
  const defaultSaleSubmit = useCallback(
    async (payload: PosSalePayload): Promise<PosSaleResponse> => {
      // Small simulated latency for UX realism
      await new Promise((resolve) => setTimeout(resolve, 300));

      const subtotalMinor = payload.items.reduce((acc, item) => {
        const found = initialCatalog.find((u) => u.id === item.sellableUnitId);
        const price = found ? found.price : 0;
        return acc + Math.round(toMinorUnits(price) * item.quantity);
      }, 0);
      const subtotal = fromMinorUnits(subtotalMinor);
      const total = subtotal;

      const tenderType = payload.payment.channel;
      const amountTendered =
        payload.payment.channel === 'cash' ? payload.payment.amountTendered : total;
      const changeGiven =
        payload.payment.channel === 'cash' ? Math.max(0, subtractMoney(amountTendered, total)) : 0;
      const referenceCode =
        payload.payment.channel === 'card_reference' ? payload.payment.referenceCode : undefined;
      const cardBrand =
        payload.payment.channel === 'card_reference' ? payload.payment.cardBrand : undefined;
      const last4 =
        payload.payment.channel === 'card_reference' ? payload.payment.last4 : undefined;

      const orderId = `ord_sim_${payload.clientRequestId.slice(0, 8)}`;
      const receiptNumber = `REC-SIM-${Date.now().toString().slice(-6)}`;

      const successResponse: PosSaleSuccessResponse = {
        order: {
          id: orderId,
          clientRequestId: payload.clientRequestId,
          terminalId: payload.terminalId,
          receiptNumber,
          channel: 'pos_register',
          status: 'pagado',
          cashierUserId: 'usr_cashier_simulated',
          subtotal,
          discountAmount: 0,
          total,
          currency: 'mxn',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          items: payload.items,
          payment: payload.payment,
        },
        receipt: {
          id: `rcpt_sim_${payload.clientRequestId.slice(0, 8)}`,
          orderId,
          receiptNumber,
          storeName: 'Selfcare Sinners (Simulado)',
          issuedAt: new Date().toISOString(),
          cashierName: 'Cajero POS (Modo Demostración)',
          subtotal,
          total,
          tenderType,
          amountTendered,
          changeGiven,
          referenceCode,
          cardBrand,
          last4,
        },
      };
      return successResponse;
    },
    [initialCatalog]
  );

  const activeSaleSubmit = onSaleSubmit || defaultSaleSubmit;

  // On sale success, cart is cleared
  const handleSaleSuccess = useCallback(
    (_receipt: PosSaleSuccessResponse) => {
      clearCart();
    },
    [clearCart]
  );

  return (
    <div
      className="min-h-screen bg-neutral-100 flex flex-col font-sans"
      data-testid="pos-register-page"
    >
      {/* POS Top Bar */}
      <header className="bg-neutral-900 text-white border-b border-neutral-800 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              <span>Punto de Venta (Web POS)</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                Fase A — UI Aislada
              </span>
            </h1>
            <p className="text-xs text-neutral-400">Selfcare Sinners • Registro de Ventas</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
            <Monitor className="h-3.5 w-3.5 text-neutral-400" />
            <span data-testid="pos-terminal-badge">{terminalId}</span>
          </div>

          <div
            data-testid="pos-demo-mode-badge"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60"
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Modo demostración / Datos simulados / UI aislada</span>
          </div>
        </div>
      </header>

      {/* Main Register Workspace */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Product Search & Catalog (7 cols) */}
        <section className="lg:col-span-7 flex flex-col h-[calc(100vh-140px)] min-h-[550px]">
          <PosCatalogSearch
            catalog={initialCatalog}
            onAddToCart={addItem}
            className="h-full"
          />
        </section>

        {/* Right Column: Cart & Summary (5 cols) */}
        <section className="lg:col-span-5 flex flex-col h-[calc(100vh-140px)] min-h-[550px]">
          <PosCart
            items={items}
            onIncrement={incrementQuantity}
            onDecrement={decrementQuantity}
            onRemove={removeItem}
            onClearCart={clearCart}
            onOpenTender={handleOpenTender}
            estimatedSubtotal={estimatedSubtotal}
            totalItems={totalItems}
            className="h-full"
          />
        </section>
      </main>

      {/* Tender Modal */}
      <PosTenderModal
        isOpen={isTenderOpen}
        onClose={handleCloseTender}
        items={items}
        estimatedSubtotal={estimatedSubtotal}
        terminalId={terminalId}
        clientRequestId={currentClientRequestId}
        onSubmitSale={activeSaleSubmit}
        onSuccess={handleSaleSuccess}
      />
    </div>
  );
};

export default PosRegisterPage;
