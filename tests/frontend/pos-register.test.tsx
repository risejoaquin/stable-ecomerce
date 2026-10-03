import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { PosRegisterPage } from '../../src/pages/pos/PosRegisterPage';
import {
  MOCK_SELLABLE_UNITS,
  buildPosSalePayload,
  createClientRequestId,
  PosSalePayload,
  PosSaleResponse,
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

      // Unit with stock = 0 is 'Exfoliante Líquido BHA 2% Renovador 120ml' (id ending 8d94)
      const outOfStockUnit = MOCK_SELLABLE_UNITS.find((u) => u.stock === 0);
      expect(outOfStockUnit).toBeDefined();

      const addBtn = screen.getByTestId(`add-to-cart-${outOfStockUnit!.id}`);
      expect(addBtn).toBeDisabled();
      expect(screen.getByText('Agotado')).toBeInTheDocument();
    });
  });

  describe('2. Cart Operations (Single Canonical Hook State)', () => {
    it('adds, increments, decrements, and removes items from cart', async () => {
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

      // Remove unit2 using trash button
      fireEvent.click(screen.getByTestId(`cart-item-remove-${unit2.id}`));
      expect(screen.queryByTestId(`cart-item-${unit2.id}`)).not.toBeInTheDocument();
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('1');

      // Decrement unit1 to 0 -> removes it
      fireEvent.click(screen.getByTestId(`cart-item-decrement-${unit1.id}`));
      expect(screen.getByTestId('pos-cart-empty-state')).toBeInTheDocument();
    });

    it('supports clear cart with confirmation cancel and confirmation accept paths', () => {
      render(<PosRegisterPage />);

      const unit1 = MOCK_SELLABLE_UNITS[0];
      fireEvent.click(screen.getByTestId(`add-to-cart-${unit1.id}`));
      expect(screen.getByTestId('cart-summary-items-count')).toHaveTextContent('1');

      // Click Vaciar Carrito
      fireEvent.click(screen.getByTestId('pos-cart-clear-btn'));
      expect(screen.getByTestId('pos-clear-confirm-dialog')).toBeInTheDocument();

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
      const mockSubmit = vi.fn().mockResolvedValue({
        success: true,
        saleId: 'SALE-10001',
        clientRequestId: 'test-req-id',
        terminalId: 'TERM-POS-01',
        items: [{ sellableUnitId: MOCK_SELLABLE_UNITS[0].id, quantity: 1 }],
        payment: { channel: 'cash', amountTendered: 500 },
        timestamp: new Date().toISOString(),
      });

      render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

      // Add Serum ($389.00)
      fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));

      // Open Tender
      fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));
      expect(screen.getByTestId('pos-tender-modal')).toBeInTheDocument();

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
      expect((payload.payment as any).amount).toBeUndefined();
      expect((payload.payment as any).cashTendered).toBeUndefined();
      expect((payload.payment as any).changeDue).toBeUndefined();
    });
  });

  describe('4. Tender Modal & Card Reference Validation', () => {
    it('validates referenceCode length and optional last4 format', async () => {
      const mockSubmit = vi.fn().mockResolvedValue({
        success: true,
        saleId: 'SALE-10002',
        clientRequestId: 'test-req-id',
        terminalId: 'TERM-POS-01',
        items: [{ sellableUnitId: MOCK_SELLABLE_UNITS[0].id, quantity: 1 }],
        payment: {
          channel: 'card_reference',
          referenceCode: 'AUTH-994411',
          cardBrand: 'Visa',
          last4: '4321',
        },
        timestamp: new Date().toISOString(),
      });

      render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

      // Add item and open tender
      fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));
      fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));

      // Switch to Card tab
      fireEvent.click(screen.getByTestId('payment-channel-card'));
      expect(screen.getByTestId('pos-card-section')).toBeInTheDocument();

      const refInput = screen.getByTestId('pos-card-reference-input');
      const submitBtn = screen.getByTestId('pos-tender-submit-btn');

      // Reference code too short (e.g. 2 chars < 4)
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
    it('preserves the exact same clientRequestId during commercial retry of a failed attempt', async () => {
      let attemptCount = 0;
      let firstReqId = '';
      let secondReqId = '';

      const mockSubmit = vi.fn().mockImplementation(async (payload: PosSalePayload) => {
        attemptCount++;
        if (attemptCount === 1) {
          firstReqId = payload.clientRequestId;
          return {
            success: false,
            error: {
              code: 'INSUFFICIENT_STOCK' as PosErrorCode,
              message: 'Inventario insuficiente al reservar unidades.',
            },
          };
        } else {
          secondReqId = payload.clientRequestId;
          return {
            success: true,
            saleId: 'SALE-RETRY-SUCCESS',
            clientRequestId: payload.clientRequestId,
            terminalId: payload.terminalId,
            items: payload.items,
            payment: payload.payment,
            timestamp: new Date().toISOString(),
          };
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
      expect(screen.getByTestId('receipt-sale-id')).toHaveTextContent('SALE-RETRY-SUCCESS');
    });
  });

  describe('6. Canonical Error Code Branching', () => {
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
        const mockSubmit = vi.fn().mockResolvedValue({
          success: false,
          error: {
            code,
            message: `Detalle simulado para ${code}`,
          },
        });

        render(<PosRegisterPage onSaleSubmit={mockSubmit} />);

        fireEvent.click(screen.getByTestId(`add-to-cart-${MOCK_SELLABLE_UNITS[0].id}`));
        fireEvent.click(screen.getByTestId('pos-proceed-to-tender-btn'));

        fireEvent.click(screen.getByTestId('pos-tender-submit-btn'));

        await waitFor(() => {
          expect(screen.getByTestId('pos-tender-error-banner')).toBeInTheDocument();
        });

        expect(screen.getByTestId('pos-tender-error-banner')).toHaveTextContent(expectedText);
      });
    });
  });

  describe('7. Success Transition & Cart Clear', () => {
    it('clears cart and transitions to receipt view on success, then resets on new sale', async () => {
      const mockSubmit = vi.fn().mockResolvedValue({
        success: true,
        saleId: 'SALE-883311',
        clientRequestId: 'req-success-123',
        terminalId: 'TERM-POS-01',
        items: [{ sellableUnitId: MOCK_SELLABLE_UNITS[0].id, quantity: 1 }],
        payment: { channel: 'cash', amountTendered: 400 },
        timestamp: new Date().toISOString(),
      });

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

      expect(screen.getByTestId('receipt-sale-id')).toHaveTextContent('SALE-883311');

      // Click Nueva Venta
      fireEvent.click(screen.getByTestId('pos-new-sale-btn'));

      // Receipt modal closes and cart is empty
      expect(screen.queryByTestId('pos-receipt-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('pos-cart-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('cart-badge-total-items')).toHaveTextContent('0 artículos');
    });
  });

  describe('8. Contract Builder & Helper Validation', () => {
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
      const raw = payload as any;
      expect(raw.channel).toBeUndefined();
      expect(raw.posTerminalId).toBeUndefined();
      expect(raw.payments).toBeUndefined();
      expect(raw.payment.amount).toBeUndefined();
      expect(raw.payment.cashTendered).toBeUndefined();
      expect(raw.payment.changeDue).toBeUndefined();
    });
  });
});
