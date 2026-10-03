import { useState, useCallback, useMemo } from 'react';

/**
 * CCP-43: Web POS Register - Canonical Types & Hook
 * Scope: FASE A - UI AISLADA (no router integration, contract-derived mocks)
 */

export type PosErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'SELLABLE_UNIT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR';

export interface SellableUnit {
  id: string; // uuid-v4
  name: string;
  sku: string;
  barcode: string;
  price: number; // Unit price in currency units (e.g. MXN)
  stock: number;
  category?: string;
}

export interface PosCartItem {
  sellableUnit: SellableUnit;
  quantity: number;
}

export type PosPaymentChannel = 'cash' | 'card_reference';

export interface PosCashPaymentInput {
  channel: 'cash';
  amountTendered: number;
}

export interface PosCardReferencePaymentInput {
  channel: 'card_reference';
  referenceCode: string; // 4-64 characters
  cardBrand?: string;
  last4?: string; // Exactly 4 digits if supplied
}

export type PosPaymentInput = PosCashPaymentInput | PosCardReferencePaymentInput;

export interface PosSaleItemPayload {
  sellableUnitId: string;
  quantity: number;
}

export interface PosSalePayload {
  clientRequestId: string;
  terminalId: string;
  items: PosSaleItemPayload[];
  payment: PosPaymentInput;
}

export interface PosSaleSuccessResponse {
  success: true;
  saleId: string;
  clientRequestId: string;
  terminalId: string;
  items: PosSaleItemPayload[];
  payment: PosPaymentInput;
  timestamp: string;
}

export interface PosSaleErrorResponse {
  success: false;
  error: {
    code: PosErrorCode;
    message: string;
  };
}

export type PosSaleResponse = PosSaleSuccessResponse | PosSaleErrorResponse;

/**
 * Generate a client request ID (UUID v4) for idempotency.
 * Must be preserved across retries of the same tender attempt.
 */
export function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Canonical payload builder for POS sale submission.
 * Enforces CCP-43 contract prohibitions:
 * - NO channel at root
 * - NO posTerminalId
 * - NO payments[]
 * - NO payment.amount
 * - NO cashTendered
 * - NO changeDue
 */
export function buildPosSalePayload(params: {
  clientRequestId: string;
  terminalId?: string;
  items: Array<{ sellableUnitId: string; quantity: number } | PosCartItem>;
  payment: PosPaymentInput;
}): PosSalePayload {
  const terminalId = params.terminalId || 'TERM-POS-01';

  const mappedItems: PosSaleItemPayload[] = params.items.map((item) => {
    if ('sellableUnit' in item) {
      return {
        sellableUnitId: item.sellableUnit.id,
        quantity: item.quantity,
      };
    }
    return {
      sellableUnitId: item.sellableUnitId,
      quantity: item.quantity,
    };
  });

  return {
    clientRequestId: params.clientRequestId,
    terminalId,
    items: mappedItems,
    payment: params.payment,
  };
}

/**
 * Canonical mapping of backend POS error codes to user-friendly messages.
 */
export function getPosErrorMessage(code: PosErrorCode): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Error de validación: Verifique los datos de la venta y los parámetros del pago.';
    case 'AUTH_REQUIRED':
      return 'Autenticación requerida: La sesión ha expirado o no es válida. Inicie sesión nuevamente.';
    case 'FORBIDDEN':
      return 'Acceso denegado: El usuario actual no cuenta con permisos para operar la terminal POS.';
    case 'SELLABLE_UNIT_NOT_FOUND':
      return 'Producto no encontrado: Una o más unidades seleccionadas no existen en el catálogo.';
    case 'INSUFFICIENT_STOCK':
      return 'Stock insuficiente: No hay suficiente inventario disponible para completar la venta.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Conflicto de idempotencia: Esta transacción ya fue procesada o tiene una solicitud previa en curso.';
    case 'INTERNAL_ERROR':
      return 'Error interno del servidor: Ocurrió un problema en el servidor al registrar la venta. Intente de nuevo.';
    default:
      return 'Ocurrió un error inesperado al procesar la venta POS.';
  }
}

/**
 * Currency formatter helper for POS UI.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Mock Catalog of SellableUnits for isolated POS UI exploration.
 */
export const MOCK_SELLABLE_UNITS: SellableUnit[] = [
  {
    id: 'b7c3d1e0-4a8f-4d91-8e3b-9a1c2d3e4f50',
    name: 'Serum Facial Hidratante de Ácido Hialurónico 50ml',
    sku: 'SKU-SRM-HA50',
    barcode: '7501234567890',
    price: 389.0,
    stock: 25,
    category: 'Cuidado Facial',
  },
  {
    id: 'c8d4e2f1-5b9a-4e02-9f4c-0b2d3e4f5a61',
    name: 'Crema Reparadora de Noche con Péptidos 60g',
    sku: 'SKU-CRM-NGHT60',
    barcode: '7501234567891',
    price: 549.0,
    stock: 14,
    category: 'Cuidado Facial',
  },
  {
    id: 'd9e5f3a2-6c0b-4f13-a05d-1c3e4f5a6b72',
    name: 'Gel Limpiador Botánico Purificante 200ml',
    sku: 'SKU-GEL-CLN200',
    barcode: '7501234567892',
    price: 279.0,
    stock: 35,
    category: 'Limpieza',
  },
  {
    id: 'e0f6a4b3-7d1c-4024-b16e-2d4f5a6b7c83',
    name: 'Protector Solar Toque Seco FPS 50+ 50ml',
    sku: 'SKU-SUN-FPS50',
    barcode: '7501234567893',
    price: 420.0,
    stock: 18,
    category: 'Protección Solar',
  },
  {
    id: 'f1a7b5c4-8e2d-4135-c27f-3e5a6b7c8d94',
    name: 'Exfoliante Líquido BHA 2% Renovador 120ml',
    sku: 'SKU-EXF-BHA120',
    barcode: '7501234567894',
    price: 410.0,
    stock: 0, // Out of stock example
    category: 'Tratamiento',
  },
  {
    id: 'a2b8c6d5-9f3e-4246-d38a-4f6b7c8d9e05',
    name: 'Bálsamo Labial Nutritivo Karité 15g',
    sku: 'SKU-LIP-KRT15',
    barcode: '7501234567895',
    price: 135.0,
    stock: 60,
    category: 'Cuidado Labial',
  },
  {
    id: 'b3c9d7e6-0a4f-4357-e49b-5a7c8d9e0f16',
    name: 'Mascarilla Calmante de Centella Asiática 100ml',
    sku: 'SKU-MSK-CENT100',
    barcode: '7501234567896',
    price: 320.0,
    stock: 8,
    category: 'Tratamiento',
  },
];

/**
 * Canonical Hook managing POS cart state.
 */
export function usePosCart(initialItems: PosCartItem[] = []) {
  const [items, setItems] = useState<PosCartItem[]>(initialItems);

  const addItem = useCallback((unit: SellableUnit, quantity = 1) => {
    if (quantity <= 0) return;
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.sellableUnit.id === unit.id);
      if (existingIndex >= 0) {
        const next = [...prevItems];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }
      return [...prevItems, { sellableUnit: unit, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((unitId: string, quantity: number) => {
    setItems((prevItems) => {
      if (quantity <= 0) {
        return prevItems.filter((item) => item.sellableUnit.id !== unitId);
      }
      return prevItems.map((item) =>
        item.sellableUnit.id === unitId ? { ...item, quantity } : item
      );
    });
  }, []);

  const incrementQuantity = useCallback((unitId: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.sellableUnit.id === unitId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }, []);

  const decrementQuantity = useCallback((unitId: string) => {
    setItems((prevItems) => {
      const target = prevItems.find((item) => item.sellableUnit.id === unitId);
      if (!target) return prevItems;
      if (target.quantity <= 1) {
        return prevItems.filter((item) => item.sellableUnit.id !== unitId);
      }
      return prevItems.map((item) =>
        item.sellableUnit.id === unitId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  }, []);

  const removeItem = useCallback((unitId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.sellableUnit.id !== unitId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const estimatedSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.sellableUnit.price * item.quantity, 0),
    [items]
  );

  return {
    items,
    setItems,
    addItem,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
    totalItems,
    estimatedSubtotal,
  };
}
