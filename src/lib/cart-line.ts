export interface CartLine {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
  sku?: string;
}

export interface CartProductInput extends CartLine {
  images?: string[];
}

/** Preserve the canonical product/variant identity across cart state updates. */
export function addCartLine(items: CartLine[], product: CartProductInput): CartLine[] {
  const image = product.image || product.images?.[0];
  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    return items.map((item) => item.id === product.id
      ? {
          ...item,
          quantity: item.quantity + 1,
          productId: item.productId || product.productId || product.id,
          variant: item.variant || product.variant,
          sku: item.sku || product.sku,
          image: item.image || image,
        }
      : item);
  }
  return [
    ...items,
    {
      id: product.id,
      productId: product.productId || product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image,
      variant: product.variant,
      sku: product.sku,
    },
  ];
}
