import React, { useState, useEffect, useId } from 'react';
import {
  X,
  Banknote,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Receipt,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import {
  PosCartItem,
  PosPaymentChannel,
  PosSalePayload,
  PosSaleResponse,
  PosSaleSuccessResponse,
  PosSaleErrorResponse,
  PosErrorCode,
  buildPosSalePayload,
  formatCurrency,
  getPosErrorMessage,
} from '../../hooks/usePosCart';

export interface PosTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PosCartItem[];
  estimatedSubtotal: number;
  terminalId?: string;
  clientRequestId: string;
  onSubmitSale: (payload: PosSalePayload) => Promise<PosSaleResponse>;
  onSuccess: (receipt: PosSaleSuccessResponse) => void;
}

export const PosTenderModal: React.FC<PosTenderModalProps> = ({
  isOpen,
  onClose,
  items,
  estimatedSubtotal,
  terminalId = 'TERM-POS-01',
  clientRequestId,
  onSubmitSale,
  onSuccess,
}) => {
  const [channel, setChannel] = useState<PosPaymentChannel>('cash');

  // Cash state
  const [amountTenderedInput, setAmountTenderedInput] = useState<string>('');

  // Card reference state
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [cardBrand, setCardBrand] = useState<string>('');
  const [last4, setLast4] = useState<string>('');

  // Execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{ code: PosErrorCode; message: string } | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<PosSaleSuccessResponse | null>(null);
  const [frozenSubtotal, setFrozenSubtotal] = useState(estimatedSubtotal);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setChannel('cash');
      setFrozenSubtotal(estimatedSubtotal);
      setAmountTenderedInput(estimatedSubtotal > 0 ? estimatedSubtotal.toString() : '');
      setReferenceCode('');
      setCardBrand('');
      setLast4('');
      setError(null);
      setSuccessReceipt(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeSubtotal = frozenSubtotal > 0 ? frozenSubtotal : estimatedSubtotal;

  // Numeric cash calculation
  const amountTenderedNum = parseFloat(amountTenderedInput) || 0;
  const isCashInsufficient = channel === 'cash' && amountTenderedNum < activeSubtotal;
  const changeDue = Math.max(0, amountTenderedNum - activeSubtotal);

  // Card reference validation
  const trimmedRef = referenceCode.trim();
  const isCardRefInvalidLength =
    channel === 'card_reference' && (trimmedRef.length < 4 || trimmedRef.length > 64);
  const trimmedLast4 = last4.trim();
  const isLast4Invalid =
    channel === 'card_reference' &&
    trimmedLast4.length > 0 &&
    (trimmedLast4.length !== 4 || !/^\d{4}$/.test(trimmedLast4));

  // Overall form validity
  const isSubmitDisabled =
    isSubmitting ||
    activeSubtotal <= 0 ||
    (channel === 'cash' && (amountTenderedNum <= 0 || isCashInsufficient)) ||
    (channel === 'card_reference' && (isCardRefInvalidLength || isLast4Invalid));

  // Quick cash buttons
  const handleQuickCash = (amount: number) => {
    setAmountTenderedInput(amount.toString());
  };

  // Submit sale handler (preserves same clientRequestId on retry)
  const handleProcessSale = async () => {
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    setError(null);

    let paymentInput;
    if (channel === 'cash') {
      paymentInput = {
        channel: 'cash' as const,
        amountTendered: Number(amountTenderedNum.toFixed(2)),
      };
    } else {
      paymentInput = {
        channel: 'card_reference' as const,
        referenceCode: trimmedRef,
        ...(cardBrand.trim() ? { cardBrand: cardBrand.trim() } : {}),
        ...(trimmedLast4 ? { last4: trimmedLast4 } : {}),
      };
    }

    const payload = buildPosSalePayload({
      clientRequestId,
      terminalId,
      items,
      payment: paymentInput,
    });

    try {
      const response = await onSubmitSale(payload);
      if (response.success) {
        setSuccessReceipt(response);
        onSuccess(response);
      } else {
        const errResp = response as PosSaleErrorResponse;
        setError(errResp.error || { code: 'INTERNAL_ERROR', message: 'Error al procesar la venta' });
      }
    } catch (err: any) {
      setError({
        code: 'INTERNAL_ERROR',
        message: err?.message || 'Error de red o comunicación con el servicio POS.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Canonical Error Banner
  const renderErrorBanner = () => {
    if (!error) return null;

    let icon = <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />;
    let title = 'Error al registrar la venta';

    switch (error.code) {
      case 'AUTH_REQUIRED':
        icon = <Lock className="h-5 w-5 text-amber-600 shrink-0" />;
        title = 'Autenticación Requerida';
        break;
      case 'FORBIDDEN':
        icon = <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />;
        title = 'Acceso Denegado';
        break;
      case 'INSUFFICIENT_STOCK':
        icon = <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />;
        title = 'Inventario Insuficiente';
        break;
      case 'IDEMPOTENCY_CONFLICT':
        icon = <RotateCw className="h-5 w-5 text-amber-600 shrink-0" />;
        title = 'Conflicto de Idempotencia';
        break;
      case 'SELLABLE_UNIT_NOT_FOUND':
        title = 'Unidad no encontrada';
        break;
      case 'VALIDATION_ERROR':
        title = 'Datos de Venta Inválidos';
        break;
      case 'INTERNAL_ERROR':
      default:
        title = 'Error del Servidor';
        break;
    }

    return (
      <div
        data-testid="pos-tender-error-banner"
        className="p-3.5 mb-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-2"
      >
        <div className="flex items-start gap-2.5">
          {icon}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                {title} <span className="font-mono text-[10px]">({error.code})</span>
              </h5>
            </div>
            <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
              {getPosErrorMessage(error.code)}
            </p>
            {error.message && (
              <p className="text-[11px] font-mono text-rose-600 mt-1 break-all">
                Detalle: {error.message}
              </p>
            )}
          </div>
        </div>

        {/* Retry Button preserving clientRequestId */}
        <div className="flex items-center justify-between pt-2 border-t border-rose-200/70 text-xs">
          <span className="font-mono text-[10px] text-rose-600 truncate max-w-[200px]" title={clientRequestId}>
            ID Intento: {clientRequestId.slice(0, 13)}...
          </span>
          <button
            type="button"
            data-testid="pos-tender-retry-btn"
            onClick={handleProcessSale}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors"
          >
            <RotateCw className={`h-3 w-3 ${isSubmitting ? 'animate-spin' : ''}`} />
            Reintentar Venta
          </button>
        </div>
      </div>
    );
  };

  // Render Receipt / Success View
  if (successReceipt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
        <div
          data-testid="pos-receipt-modal"
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Success Header */}
          <div className="p-6 bg-emerald-600 text-white text-center">
            <CheckCircle2 className="h-14 w-14 mx-auto mb-2 text-emerald-100" />
            <h3 className="text-xl font-bold">¡Venta Registrada!</h3>
            <p className="text-xs text-emerald-100 mt-1">Transacción completada exitosamente</p>
          </div>

          {/* Receipt Body */}
          <div className="p-6 space-y-4 text-sm">
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Folio Venta:</span>
                <span className="font-bold text-neutral-900" data-testid="receipt-sale-id">
                  {successReceipt.saleId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Terminal:</span>
                <span className="text-neutral-900">{successReceipt.terminalId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Client Request ID:</span>
                <span className="text-neutral-900 text-[10px]" data-testid="receipt-request-id">
                  {successReceipt.clientRequestId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Fecha/Hora:</span>
                <span className="text-neutral-900">{new Date(successReceipt.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t border-b border-neutral-100 py-3 space-y-1 text-xs">
              <div className="flex justify-between text-neutral-600 font-medium">
                <span>Método de Pago:</span>
                <span className="capitalize font-bold text-neutral-900" data-testid="receipt-payment-channel">
                  {successReceipt.payment.channel === 'cash' ? 'Efectivo' : 'Tarjeta (Referencia)'}
                </span>
              </div>

              {successReceipt.payment.channel === 'cash' && (
                <>
                  <div className="flex justify-between text-neutral-600">
                    <span>Monto Recibido:</span>
                    <span className="font-semibold text-neutral-900" data-testid="receipt-amount-tendered">
                      {formatCurrency(successReceipt.payment.amountTendered)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Cambio Entregado:</span>
                    <span data-testid="receipt-change-due">
                      {formatCurrency(Math.max(0, successReceipt.payment.amountTendered - activeSubtotal))}
                    </span>
                  </div>
                </>
              )}

              {successReceipt.payment.channel === 'card_reference' && (
                <>
                  <div className="flex justify-between text-neutral-600">
                    <span>Referencia:</span>
                    <span className="font-mono text-neutral-900" data-testid="receipt-card-reference">
                      {successReceipt.payment.referenceCode}
                    </span>
                  </div>
                  {successReceipt.payment.cardBrand && (
                    <div className="flex justify-between text-neutral-600">
                      <span>Marca:</span>
                      <span className="text-neutral-900">{successReceipt.payment.cardBrand}</span>
                    </div>
                  )}
                  {successReceipt.payment.last4 && (
                    <div className="flex justify-between text-neutral-600">
                      <span>Últimos 4 dígitos:</span>
                      <span className="font-mono text-neutral-900">•••• {successReceipt.payment.last4}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              data-testid="pos-new-sale-btn"
              onClick={onClose}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Receipt className="h-4 w-4" />
              <span>Nueva Venta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div
        data-testid="pos-tender-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-neutral-800" />
            <h3 className="font-bold text-neutral-900 text-lg">Cobro de Venta POS</h3>
          </div>
          <button
            type="button"
            data-testid="pos-tender-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
            aria-label="Cerrar ventana de cobro"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Banner */}
          {renderErrorBanner()}

          {/* Amount Due Display */}
          <div className="bg-neutral-900 text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Total a Cobrar</span>
              <p className="text-xs text-neutral-400 mt-0.5">{items.length} unidades en carrito</p>
            </div>
            <div className="text-right">
              <span
                data-testid="pos-tender-total-due"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              >
                {formatCurrency(estimatedSubtotal)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Forma de Pago
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="payment-channel-cash"
                onClick={() => setChannel('cash')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                  channel === 'cash'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                data-testid="payment-channel-card"
                onClick={() => setChannel('card_reference')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                  channel === 'card_reference'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Tarjeta (Terminal)</span>
              </button>
            </div>
          </div>

          {/* Cash Payment Form */}
          {channel === 'cash' && (
            <div className="space-y-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200" data-testid="pos-cash-section">
              <div>
                <label
                  htmlFor="amount-tendered-input"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Monto Recibido del Cliente
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500 font-bold">$</span>
                  <input
                    id="amount-tendered-input"
                    type="number"
                    step="0.01"
                    min="0"
                    data-testid="pos-amount-tendered-input"
                    className="block w-full pl-8 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-base font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="0.00"
                    value={amountTenderedInput}
                    onChange={(e) => setAmountTenderedInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  data-testid="quick-cash-exact"
                  onClick={() => handleQuickCash(estimatedSubtotal)}
                  className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  Exacto ({formatCurrency(estimatedSubtotal)})
                </button>
                {[100, 200, 500, 1000].map((amt) => {
                  if (amt >= estimatedSubtotal) {
                    return (
                      <button
                        key={amt}
                        type="button"
                        data-testid={`quick-cash-${amt}`}
                        onClick={() => handleQuickCash(amt)}
                        className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md font-medium text-neutral-700 hover:bg-neutral-100"
                      >
                        ${amt}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Visual Change / Insufficient Alert */}
              <div className="pt-2 border-t border-neutral-200">
                {isCashInsufficient ? (
                  <div
                    data-testid="pos-insufficient-cash-alert"
                    className="flex items-center justify-between text-xs text-rose-700 font-semibold p-2 bg-rose-50 rounded-lg border border-rose-200"
                  >
                    <span>Monto insuficiente</span>
                    <span>Faltan: {formatCurrency(estimatedSubtotal - amountTenderedNum)}</span>
                  </div>
                ) : (
                  <div
                    data-testid="pos-visual-change-display"
                    className="flex items-center justify-between text-sm p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 font-bold"
                  >
                    <span>Cambio a devolver:</span>
                    <span className="text-base" data-testid="pos-calculated-change">
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card Reference Payment Form */}
          {channel === 'card_reference' && (
            <div className="space-y-3.5 bg-neutral-50 p-4 rounded-xl border border-neutral-200" data-testid="pos-card-section">
              <div>
                <label
                  htmlFor="card-reference-input"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Código de Referencia / Autorización de Terminal *
                </label>
                <input
                  id="card-reference-input"
                  type="text"
                  maxLength={64}
                  data-testid="pos-card-reference-input"
                  className={`block w-full px-3 py-2 bg-white border rounded-lg text-sm text-neutral-900 font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                    isCardRefInvalidLength && trimmedRef.length > 0
                      ? 'border-rose-300 ring-rose-200 ring-2'
                      : 'border-neutral-300'
                  }`}
                  placeholder="Ej: AUTH-882109"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                />
                <div className="flex justify-between text-[11px] mt-1 text-neutral-500">
                  <span>Requerido (4 a 64 caracteres)</span>
                  <span className="font-mono">{trimmedRef.length}/64</span>
                </div>
                {isCardRefInvalidLength && trimmedRef.length > 0 && (
                  <p className="text-xs text-rose-600 mt-1" data-testid="card-ref-error">
                    El código debe tener entre 4 y 64 caracteres.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="card-brand-input"
                    className="block text-xs font-semibold text-neutral-700 mb-1"
                  >
                    Marca de Tarjeta (Opcional)
                  </label>
                  <select
                    id="card-brand-input"
                    data-testid="pos-card-brand-select"
                    className="block w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                  >
                    <option value="">Seleccione marca...</option>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="American Express">American Express</option>
                    <option value="Carnet">Carnet</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="card-last4-input"
                    className="block text-xs font-semibold text-neutral-700 mb-1"
                  >
                    Últimos 4 Dígitos (Opcional)
                  </label>
                  <input
                    id="card-last4-input"
                    type="text"
                    maxLength={4}
                    data-testid="pos-card-last4-input"
                    className={`block w-full px-3 py-2 bg-white border rounded-lg text-sm text-neutral-900 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                      isLast4Invalid ? 'border-rose-300 ring-rose-200 ring-2' : 'border-neutral-300'
                    }`}
                    placeholder="1234"
                    value={last4}
                    onChange={(e) => setLast4(e.target.value)}
                  />
                  {isLast4Invalid && (
                    <p className="text-[11px] text-rose-600 mt-1" data-testid="card-last4-error">
                      Debe contener exactamente 4 dígitos numéricos si se proporciona.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Idempotency Client Request ID info */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-2">
            <span>Terminal: {terminalId}</span>
            <span title={`clientRequestId: ${clientRequestId}`}>
              ReqId: {clientRequestId.slice(0, 8)}...{clientRequestId.slice(-4)}
            </span>
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
          <button
            type="button"
            data-testid="pos-tender-cancel-btn"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            data-testid="pos-tender-submit-btn"
            disabled={isSubmitDisabled}
            onClick={handleProcessSale}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm flex items-center gap-2 transition-all ${
              isSubmitDisabled
                ? 'bg-neutral-300 cursor-not-allowed text-neutral-500'
                : 'bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar y Cobrar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
