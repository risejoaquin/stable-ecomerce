import { describe, expect, it } from 'vitest';
import { addCartLine, type CartProductInput } from '../src/lib/cart-line';

const product = (changes: Partial<CartProductInput> = {}): CartProductInput => ({
  id: 'ui-shirt',
  productId: 'shirt-1',
  name: 'Camiseta',
  price: 350,
  quantity: 1,
  variant: 'M',
  sku: 'SHIRT-M',
  images: ['shirt.jpg'],
  ...changes,
});

describe('Commerce Starter cart sellable identity', () => {
  it('increments only the matching product/variant/SKU and preserves the original cart', () => {
    const first = addCartLine([], product());
    const next = addCartLine(first, product({ id: 'another-ui-key' }));
    expect(first[0].quantity).toBe(1);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      productId: 'shirt-1', variant: 'M', sku: 'SHIRT-M',
      quantity: 2, image: 'shirt.jpg',
    });
  });

  it('does not merge distinct variants with the same UI identifier', () => {
    const first = addCartLine([], product());
    const next = addCartLine(first, product({ variant: 'L', sku: 'SHIRT-L' }));
    expect(next).toHaveLength(2);
    expect(new Set(next.map(item => item.id)).size).toBe(2);
  });

  it('does not merge distinct SKUs for the same product and variant', () => {
    const first = addCartLine([], product());
    const next = addCartLine(first, product({ sku: 'SHIRT-M-PREMIUM' }));
    expect(next).toHaveLength(2);
  });

  it('does not merge distinct products sharing the same UI identifier', () => {
    const first = addCartLine([], product());
    const next = addCartLine(first, product({ productId: 'shirt-2' }));
    expect(next).toHaveLength(2);
    expect(next.map(item => item.productId)).toEqual(['shirt-1', 'shirt-2']);
  });

  it('recovers a legacy line only when its original UI identifier matches', () => {
    const legacy = [{ id: 'ui-shirt', name: 'Camiseta', price: 350, quantity: 1 }];
    const next = addCartLine(legacy, product());
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ productId: 'shirt-1', variant: 'M', sku: 'SHIRT-M', quantity: 2 });
    const different = addCartLine(legacy, product({ id: 'different-ui' }));
    expect(different).toHaveLength(2);
  });

  it('fails closed if a generated line identifier already belongs to another item', () => {
    const reserved = 'cart-line:7:shirt-1|1:L|7:SHIRT-L';
    const existing = [
      ...addCartLine([], product()),
      { id: reserved, productId: 'another-product', name: 'Otro', price: 1, quantity: 1 },
    ];
    expect(() => addCartLine(existing, product({ variant: 'L', sku: 'SHIRT-L' })))
      .toThrow('CART_LINE_ID_COLLISION');
  });

  it('retains checkout identifiers for two sellable variants', () => {
    const lines = addCartLine(addCartLine([], product()), product({ variant: 'L', sku: 'SHIRT-L' }));
    const checkout = lines.map(item => ({
      productId: item.productId || item.id,
      quantity: item.quantity,
      variantName: item.variant,
      sku: item.sku,
    }));
    expect(checkout).toEqual([
      { productId: 'shirt-1', quantity: 1, variantName: 'M', sku: 'SHIRT-M' },
      { productId: 'shirt-1', quantity: 1, variantName: 'L', sku: 'SHIRT-L' },
    ]);
  });
});
