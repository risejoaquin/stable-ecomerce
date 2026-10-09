import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { PosRegisterPage } from '../../src/pages/pos/PosRegisterPage';
import {
  MOCK_SELLABLE_UNITS,
  buildPosSalePayload,
  createClientRequestId,
  toMinorUnits,
  fromMinorUnits,
  addMoney,
  subtractMoney,
  multiplyMoney,
  PosSalePayload,
  PosSaleSuccessResponse,
  PosSaleErrorResponse,
  PosErrorCode,
} from '../../src/hooks/usePosCart';

describe('CCP-43: Web POS Register UI (Isolated Wave - FASE A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Catalog Search & Filter', () => {
    it('searches and filters products by name, SKU, and barcode', async () => {
      render(<PosRegisterPage />);

      const searchInput = screen.getByTestId('pos-catalog-search-input');

      // Filter by text / name
      fireEvent.change(searchInput, { target: { value: 'Serum' } });
      expect(screen.getByText(/Serum Facial Hidratante/i)).toBeInTheDocument();
      expect(screen.queryByText(/Crema Reparadora de Noche/i)).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText(/Crema Reparadora de Noche/i)).toBeInTheDocument();

      // Filter by SKU
      fireEvent.change(searchInput, { target: { value: 'SKU-CRM-NGHT60' } });
      expect(screen.getByText(/Crema Reparadora de Noche/i)).toBeInTheDocument();
      expect(screen.queryByText(/Serum Facial Hidratante/i)).not.toBeInTheDocument();

      // Filter by Barcode
      fireEvent.change(searchInput, { target: { value: '7501234567892' } });
      expect(screen.getByText(/Gel Limpiador Botánico/i)).toBeInTheDocument();
      expect(screen.queryByText(/Crema Reparadora de Noche/i)).not.toBeInTheDocument();
    });

    it('handles simulated barcode scan on Enter key', async () => {
      render(<PosRegisterPage />);

      const searchInput = screen.getByTestId('pos-catalog-search-input');

      // Enter barcode and press Enter
      fireEvent.change(searchInput, { target: { value: '7501234567890' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      // Verifies notification feedback and that item was added to cart
      expect(screen.getByTestId('pos-scanner-feedback')).toHaveTextContent(/Escaneado: Serum Facial/i);
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('1');
    });

    it('disables add button for out of stock items', () => {
      render(<PosRegisterPage />);

      const outOfStockUnit = MOCK_SELLABLE_UNITS.find((u) => u.stock === 0);
      expect(outOfStockUnit).toBeDefined();

      const addBtn = screen.getByTestId(`add-to-cart-${outOfStockUnit!.id}`);
      expect(addBtn).toBeDisabled();
      expect(screen.getByText('Agotado')).toBeInTheDocument();
    });
  });

  describe('2. Cart Operations & Money Precision', () => {
    it('adds, increments, decrements, and removes items from cart with accurate money calculation', async () => {
      render(<PosRegisterPage />);

      const unit1 = MOCK_SELLABLE_UNITS[0]; // Serum $389.00
      const unit2 = MOCK_SELLABLE_UNITS[1]; // Crema $549.00

      // Add unit1
      fireEvent.click(screen.getByTestId(`add-to-cart-${unit1.id}`));
      expect(screen.getByTestId('cart-badge-total-items')).toHaveTextContent('1 artículo');
      expect(screen.getByTestId(`cart-item-quantity-${unit1.id}`)).toHaveTextContent('1');
      expect(screen.getByTestId('cart-summary-estimated-subtotal')).toHaveTextContent('$389.00');

      // Increment unit1
      fireEvent.click(screen.getByTestId(`cart-item-increment-${unit1.id}`));
      expect(screen.getByTestId(`cart-item-quantity-${unit1.id}`)).toHaveTextContent('2');
      expect(screen.getByTestId(`cart-item-subtotal-${unit1.id}`)).toHaveTextContent('$778.00');
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('2');

      // Decrement unit1
      fireEvent.click(screen.getByTestId(`cart-item-decrement-${unit1.id}`));
      expect(screen.getByTestId(`cart-item-quantity-${unit1.id}`)).toHaveTextContent('1');

      // Add unit2
      fireEvent.click(screen.getByTestId(`add-to-cart-${unit2.id}`));
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('2');
      // Subtotal should be 389.00 + 549.00 = 938.00
      expect(screen.getByTestId('cart-summary-estimated-subtotal')).toHaveTextContent('$938.00');

      // Remove unit2 using trash button
      fireEvent.click(screen.getByTestId(`cart-item-remove-${unit2.id}`));
      expect(screen.queryByTestId(`cart-item-${unit2.id}`)).not.toBeInTheDocument();
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('1');

      // Decrement unit1 to 0 -> removes it
      fireEvent.click(screen.getByTestId(`cart-item-decrement-${unit1.id}`));
      expect(screen.getByTestId('pos-cart-empty-state')).toBeInTheDocument();
    });

    it('supports clear cart with accessible confirmation dialog', () => {
      render(<PosRegisterPage />);

      const unit1 = MOCK_SELLABLE_UNITS[0];
      fireEvent.click(screen.getByTestId(`add-to-cart-${unit1.id}`));
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('1');

      // Click Vaciar Carrito
      fireEvent.click(screen.getByTestId('pos-cart-clear-btn'));
      const confirmDialog = screen.getByTestId('pos-clear-confirm-dialog');
      expect(confirmDialog).toBeInTheDocument();
      expect(confirmDialog).toHaveAttribute('role', 'alertdialog');
      expect(confirmDialog).toHaveAttribute('aria-modal', 'true');
      expect(confirmDialog).toHaveAttribute('aria-label', 'Confirmación para vaciar carrito');

      // Cancel path
      fireEvent.click(screen.getByTestId('pos-clear-confirm-no'));
      expect(screen.queryByTestId('pos-clear-confirm-dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('1');

      // Confirm path
      fireEvent.click(screen.getByTestId('pos-cart-clear-btn'));
      fireEvent.click(screen.getByTestId('pos-clear-confirm-yes'));
      expect(screen.getByTestId('pos-cart-empty-state')).toBeInTheDocument();
    });
  });

  describe('3. Tender Modal & Cash Payment Validation', () => {
    it('disables submit when cash tendered is insufficient and calculates visual change when sufficient', async () => {
      const canonicalSuccessResponse: PosSaleSuccessResponse = {
        order: {
          id: 'ord-canon-cash-01',
          clientRequestId: 'test-req-id-1',
          terminalId: 'TERM-POS-01',
          receiptNumber: 'REC-2026-CASH',
          channel: 'pos_register',
          status: 'pagado',
          subtotal: 389.0,
          total: 389.0,
          currency: 'mxn',
        },
        receipt: {
          id: 'rcpt-canon-cash-01',
          receiptNumber: 'REC-2026-CASH',
          tenderType: 'cash',
          amountTendered: 500,
          changeGiven: 111,
          total: 389.0,
        },
      };

      const mockSubmit = vi.fn().mockResolvedValue(canonicalSuccessResponse);

      render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

      // Add Serum ($389.00)
      fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));

      // Open Tender
      fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));
      const modal = screen.getByTestId('pos-tender-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');

      const amountInput = screen.getByTestId('pos-amount-tendered-input');
      const submitBtn = screen.getByTestId('pos-tender-submit-btn');

      // Enter insufficient cash ($200)
      fireEvent.change(amountInput, { target: { value: '200' } });
      expect(screen.getByTestId('pos-insufficient-cash-alert')).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();

      // Enter sufficient cash ($500)
      fireEvent.change(amountInput, { target: { value: '500' } });
      expect(screen.getByTestId('pos-visual-change-display')).toBeInTheDocument();
      expect(screen.getByTestId('pos-calculated-change')).toHaveTextContent('$111.00'); // 500 - 389 = 111
      expect(submitBtn).not.toBeDisabled();

      // Submit
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });

      const payload: PosSalePayload = mockSubmit.mock.calls[0][0];

      // Verify canonical shape
      expect(payload).toMatchObject({
        terminalId: 'TERM-POS-01',
        items: [{ sellableUnitId: MOCK_SELLABLE_UNITS[0].id, quantity: 1 }],
        payment: {
          channel: 'cash',
          amountTendered: 500,
        },
      });
      expect(payload.clientRequestId).toBeDefined();

      // Verify contract prohibitions
      expect(payload).not.toHaveProperty('channel');
      expect(payload).not.toHaveProperty('posTerminalId');
      expect(payload).not.toHaveProperty('payments');
      expect((payload.payment as unknown as Record<string, unknown>).amount).toBeUndefined();
      expect((payload.payment as unknown as Record<string, unknown>).cashTendered).toBeUndefined();
      expect((payload.payment as unknown as Record<string, unknown>).changeDue).toBeUndefined();
    });
  });

  describe('4. Tender Modal & Card Reference Validation', () => {
    it('validates referenceCode length and optional last4 format', async () => {
      const canonicalSuccessResponse: PosSaleSuccessResponse = {
        order: {
          id: 'ord-canon-card-02',
          clientRequestId: 'test-req-id-2',
          terminalId: 'TERM-POS-01',
          receiptNumber: 'REC-2026-CARD',
          channel: 'pos_register',
          status: 'pagado',
          subtotal: 389.0,
          total: 389.0,
          currency: 'mxn',
        },
        receipt: {
          id: 'rcpt-canon-card-02',
          receiptNumber: 'REC-2026-CARD',
          tenderType: 'card_reference',
          referenceCode: 'AUTH-994411',
          cardBrand: 'Visa',
          last4: '4321',
          total: 389.0,
        },
      };

      const mockSubmit = vi.fn().mockResolvedValue(canonicalSuccessResponse);

      render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

      // Add item and open tender
      fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));
      fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));

      // Switch to Card tab
      fireEvent.click(screen.getByTestId('payment-channel-card'));
      expect(screen.getByTestId('pos-card-section')).toBeInTheDocument();

      const refInput = screen.getByTestId('pos-card-reference-input');
      const submitBtn = screen.getByTestId('pos-tender-submit-btn');

      // Reference code too short (< 4 chars)
      fireEvent.change(refInput, { target: { value: 'AB' } });
      expect(screen.getByTestId('card-ref-error')).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();

      // Valid reference code (>= 4 chars)
      fireEvent.change(refInput, { target: { value: 'AUTH-994411' } });
      expect(screen.queryByTestId('card-ref-error')).not.toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();

      // Invalid last4 (not 4 chars)
      const last4Input = screen.getByTestId('pos-card-last4-input');
      fireEvent.change(last4Input, { target: { value: '12' } });
      expect(screen.getByTestId('card-last4-error')).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();

      // Valid last4 exactly 4 digits
      fireEvent.change(last4Input, { target: { value: '4321' } });
      expect(screen.queryByTestId('card-last4-error')).not.toBeInTheDocument();

      // Select brand
      fireEvent.change(screen.getByTestId('pos-card-brand-select'), {
        target: { value: 'Visa' },
      });

      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });

      const payload: PosSalePayload = mockSubmit.mock.calls[0][0];
      expect(payload.payment).toEqual({
        channel: 'card_reference',
        referenceCode: 'AUTH-994411',
        cardBrand: 'Visa',
        last4: '4321',
      });
      expect(payload).not.toHaveProperty('channel');
      expect(payload).not.toHaveProperty('posTerminalId');
    });
  });

  describe('5. Idempotency & Retry Stability', () => {
    it('fails closed when crypto.randomUUID is not available', () => {
      const originalCrypto = globalThis.crypto;
      try {
        Object.defineProperty(globalThis, 'crypto', {
          value: { randomUUID: undefined },
          configurable: true,
          writable: true,
        });
        expect(() => createClientRequestId()).toThrow(/crypto\.randomUUID/);
      } finally {
        Object.defineProperty(globalThis, 'crypto', {
          value: originalCrypto,
          configurable: true,
          writable: true,
        });
      }
    });

    it('generates a valid UUID string when crypto.randomUUID is present', () => {
      const id = createClientRequestId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('preserves the exact same clientRequestId during commercial retry of a failed attempt', async () => {
      let attemptCount = 0;
      let firstReqId = '';
      let secondReqId = '';

      const mockSubmit = vi.fn().mockImplementation(async (payload: PosSalePayload) => {
        attemptCount++;
        if (attemptCount === 1) {
          firstReqId = payload.clientRequestId;
          const errorResponse: PosSaleErrorResponse = {
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: 'Inventario insuficiente al reservar unidades.',
            },
          };
          return errorResponse;
        } else {
          secondReqId = payload.clientRequestId;
          const successResponse: PosSaleSuccessResponse = {
            order: {
              id: 'ord-retry-success',
              clientRequestId: payload.clientRequestId,
              terminalId: payload.terminalId,
              receiptNumber: 'REC-RETRY-SUCCESS',
              channel: 'pos_register',
              status: 'pagado',
              total: 389.0,
            },
            receipt: {
              id: 'rcpt-retry-success',
              receiptNumber: 'REC-RETRY-SUCCESS',
              tenderType: 'cash',
              amountTendered: 400,
              changeGiven: 11,
              total: 389.0,
            },
          };
          return successResponse;
        }
      });

      render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

      fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));
      fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));

      // Submit attempt 1
      fireEvent.click(screen.getByTestId('pos-tender-submit-btn'));

      // Wait for error banner
      await waitFor(() => {
        expect(screen.getByTestId('pos-tender-error-banner')).toBeInTheDocument();
      });

      expect(screen.getByTestId('pos-tender-error-banner')).toHaveTextContent(/Inventario Insuficiente/i);
      expect(firstReqId).toBeTruthy();

      // Click Reintentar Venta
      const retryBtn = screen.getByTestId('pos-tender-retry-btn');
      fireEvent.click(retryBtn);

      // Wait for success receipt
      await waitFor(() => {
        expect(screen.getByTestId('pos-receipt-modal')).toBeInTheDocument();
      });

      // Verify that retry used the EXACT SAME clientRequestId
      expect(secondReqId).toBe(firstReqId);
      expect(screen.getByTestId('receipt-sale-id')).toHaveTextContent('REC-RETRY-SUCCESS');
      expect(screen.getByTestId('receipt-request-id')).toHaveTextContent(firstReqId);
    });
  });

  describe('6. Canonical Error Responses & Code Branching', () => {
    const errorCodes: Array<{ code: PosErrorCode; expectedText: RegExp }> = [
      { code: 'AUTH_REQUIRED', expectedText: /Autenticación Requerida/i },
      { code: 'FORBIDDEN', expectedText: /Acceso Denegado/i },
      { code: 'INSUFFICIENT_STOCK', expectedText: /Inventario Insuficiente/i },
      { code: 'IDEMPOTENCY_CONFLICT', expectedText: /Conflicto de Idempotencia/i },
      { code: 'VALIDATION_ERROR', expectedText: /Datos de Venta Inválidos/i },
      { code: 'SELLABLE_UNIT_NOT_FOUND', expectedText: /Unidad no encontrada/i },
      { code: 'INTERNAL_ERROR', expectedText: /Error del Servidor/i },
    ];

    errorCodes.forEach(({ code, expectedText }) => {
      it(`branches properly for canonical error code ${code}`, async () => {
        const canonicalErrorResponse: PosSaleErrorResponse = {
          error: {
            code,
            message: `Detalle simulado para ${code}`,
            requestId: 'req-err-branch-test',
            details: { reason: 'test failure' },
          },
        };

        const mockSubmit = vi.fn().mockResolvedValue(canonicalErrorResponse);

        render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

        fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));
        fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));

        fireEvent.click(screen.getByTestId('pos-tender-submit-btn'));

        await waitFor(() => {
          expect(screen.getByTestId('pos-tender-error-banner')).toBeInTheDocument();
        });

        expect(screen.getByTestId('pos-tender-error-banner')).toHaveTextContent(expectedText);
        expect(screen.getByTestId('pos-error-request-id')).toHaveTextContent('req-err-branch-test');
        expect(screen.getByTestId('pos-error-details')).toHaveTextContent('test failure');
      });
    });
  });

  describe('7. Canonical Success Transition & Receipt Model', () => {
    it('renders canonical receipt fields without root success/saleId, and clears cart', async () => {
      const canonicalSuccessResponse: PosSaleSuccessResponse = {
        order: {
          id: 'ord-canon-883311',
          clientRequestId: 'req-success-123',
          terminalId: 'TERM-POS-01',
          receiptNumber: 'REC-20260928-8833',
          channel: 'pos_register',
          status: 'pagado',
          cashierUserId: 'usr-cashier-01',
          subtotal: 389.0,
          total: 389.0,
          currency: 'mxn',
          paidAt: '2026-09-28T14:30:00Z',
          createdAt: '2026-09-28T14:30:00Z',
          items: [{ sellableUnitId: MOCK_SELLABLE_UNITS[0].id, quantity: 1 }],
        },
        receipt: {
          id: 'rcpt-canon-883311',
          orderId: 'ord-canon-883311',
          receiptNumber: 'REC-20260928-8833',
          storeName: 'Selfcare Sinners',
          issuedAt: '2026-09-28T14:30:00Z',
          cashierName: 'Julian Staff',
          subtotal: 389.0,
          total: 389.0,
          tenderType: 'cash',
          amountTendered: 400.0,
          changeGiven: 11.0,
        },
      };

      // Explicit verification: the response does NOT have non-canonical root fields
      expect((canonicalSuccessResponse as unknown as Record<string, unknown>).success).toBeUndefined();
      expect((canonicalSuccessResponse as unknown as Record<string, unknown>).saleId).toBeUndefined();
      expect((canonicalSuccessResponse as unknown as Record<string, unknown>).payment).toBeUndefined();
      expect((canonicalSuccessResponse as unknown as Record<string, unknown>).timestamp).toBeUndefined();

      const mockSubmit = vi.fn().mockResolvedValue(canonicalSuccessResponse);

      render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

      fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));
      fireEvent.change(screen.getByTestId('pos-amount-tendered-input'), {
        target: { value: '400' },
      });

      fireEvent.click(screen.getByTestId('pos-tender-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('pos-receipt-modal')).toBeInTheDocument();
      });

      const receiptModal = screen.getByTestId('pos-receipt-modal');
      expect(receiptModal).toHaveAttribute('role', 'dialog');
      expect(receiptModal).toHaveAttribute('aria-modal', 'true');

      // Canonical receipt fields assertions
      expect(screen.getByTestId('receipt-sale-id')).toHaveTextContent('REC-20260928-8833');
      expect(screen.getByTestId('receipt-order-id')).toHaveTextContent('ord-canon-883311');
      expect(screen.getByTestId('receipt-request-id')).toHaveTextContent('req-success-123');
      expect(screen.getByTestId('receipt-payment-channel')).toHaveTextContent('Efectivo');
      expect(screen.getByTestId('receipt-amount-tendered')).toHaveTextContent('$400.00');
      expect(screen.getByTestId('receipt-change-due')).toHaveTextContent('$11.00');
      expect(screen.getByTestId('receipt-total-amount')).toHaveTextContent('$389.00');

      // Click Nueva Venta
      fireEvent.click(screen.getByTestId('pos-new-sale-btn'));

      // Receipt modal closes and cart is empty
      expect(screen.queryByTestId('pos-receipt-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('pos-cart-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('cart-badge-total-items')).toHaveTextContent('0 artículos');
    });
  });

  describe('8. Demo / Isolated UI Mode Claim Safety', () => {
    it('does NOT render "En Línea" and instead renders explicit isolated demo mode badge', () => {
      render(<PosRegisterPage />);

      // Prohibited: "En Línea" must NOT be rendered
      expect(screen.queryByText(/En Línea/i)).not.toBeInTheDocument();

      // Required: explicit demo mode badge must be rendered
      const demoBadge = screen.getByTestId('pos-demo-mode-badge');
      expect(demoBadge).toBeInTheDocument();
      expect(demoBadge).toHaveTextContent(/Modo demostración \/ Datos simulados \/ UI aislada/i);
    });
  });

  describe('9. Money Precision Helper Functions', () => {
    it('performs exact minor units conversion and operations without float drift', () => {
      expect(toMinorUnits(0.1 + 0.2)).toBe(30);
      expect(fromMinorUnits(30)).toBe(0.3);

      // Float addition precision
      expect(addMoney(0.1, 0.2)).toBe(0.3);

      // Float subtraction precision (500 - 389 = 111, 0.3 - 0.1 = 0.2)
      expect(subtractMoney(500, 389)).toBe(111);
      expect(subtractMoney(0.3, 0.1)).toBe(0.2);

      // Float multiplication precision (19.99 * 3 = 59.97)
      expect(multiplyMoney(19.99, 3)).toBe(59.97);
    });
  });

  describe('10. Contract Builder Validation', () => {
    it('buildPosSalePayload adheres strictly to CCP-43 schema rules', () => {
      const clientRequestId = createClientRequestId();
      const payload = buildPosSalePayload({
        clientRequestId,
        terminalId: 'TERM-POS-01',
        items: [{ sellableUnitId: 'u-1', quantity: 2 }],
        payment: { channel: 'cash', amountTendered: 300 },
      });

      expect(payload).toEqual({
        clientRequestId,
        terminalId: 'TERM-POS-01',
        items: [{ sellableUnitId: 'u-1', quantity: 2 }],
        payment: { channel: 'cash', amountTendered: 300 },
      });

      // Assert non-existence of deprecated or invalid fields
      const raw = payload as unknown as Record<string, unknown>;
      expect(raw.channel).toBeUndefined();
      expect(raw.posTerminalId).toBeUndefined();
      expect(raw.payments).toBeUndefined();
      expect((raw.payment as unknown as Record<string, unknown>).amount).toBeUndefined();
      expect((raw.payment as unknown as Record<string, unknown>).cashTendered).toBeUndefined();
      expect((raw.payment as unknown as Record<string, unknown>).changeDue).toBeUndefined();
    });
  });
});
