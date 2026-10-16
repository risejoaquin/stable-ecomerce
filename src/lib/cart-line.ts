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

/** The cart id is a UI key; productId + variant + SKU identify the sellable line. */
function sameIdentity(item: CartLine, product: CartProductInput): boolean {
  const productId = product.productId || product.id;
  // A legacy line with no canonical identity may be recovered only when its
  // original UI id matches. Do not use missing variant/SKU as wildcards for
  // modern lines: doing so silently merges distinct sellable units.
  if (!item.productId) {
    // Legacy records have no canonical product identity. Only their original
    // UI id can authorize recovery; matching a new productId is ambiguous.
    return item.id === product.id && (
      (!item.variant && !item.sku)
      || ((item.variant || '') === (product.variant || '')
        && (item.sku || '') === (product.sku || ''))
    );
  }
  return item.productId === productId
    && (item.variant || '') === (product.variant || '')
    && (item.sku || '') === (product.sku || '');
}

function collisionSafeId(items: CartLine[], product: CartProductInput): string {
  if (!items.some(item => item.id === product.id)) return product.id;

  // Length-prefix each component so separators inside values cannot collide.
  const identity = [product.productId || product.id, product.variant || '', product.sku || ''];
  const suffix = identity.map(value => `${value.length}:${value}`).join('|');
  const candidate = `cart-line:${suffix}`;
  if (items.some(item => item.id === candidate)) {
    throw new Error('CART_LINE_ID_COLLISION');
  }
  return candidate;
}

/** Preserve product/variant/SKU identity and never merge distinct sellable lines. */
export function addCartLine(items: CartLine[], product: CartProductInput): CartLine[] {
  const image = product.image || product.images?.[0];
  const existing = items.find(item => sameIdentity(item, product));
  if (existing) {
    return items.map(item => item === existing
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
      id: collisionSafeId(items, product),
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
