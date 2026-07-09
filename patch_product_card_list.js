import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

const oldCardPattern = `const StyledProductCard: React.FC<{ product: any, config: any, themeColor: string, textColor: string }> = ({ product, config, themeColor, textColor }) => {`;

const newCardCode = `const StyledProductCard: React.FC<{ product: any, config: any, themeColor: string, textColor: string }> = ({ product, config, themeColor, textColor }) => {
  const { addItem } = useCart();
  const isList = config.layout === 'list';
  
  return (
    <div className={\`group overflow-hidden flex bg-white transition-transform hover:-translate-y-1 \${isList ? 'flex-col sm:flex-row' : 'flex-col'}\`} style={{
      borderRadius: 'var(--border-radius-base)',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
    }}>
      <Link to={\`/product/\${product.id}\`} className={\`bg-gray-50 overflow-hidden relative block \${isList ? 'w-full sm:w-1/3 aspect-square sm:aspect-auto' : 'aspect-square'}\`}>
        {product.images && product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">No Image</div>
        )}
      </Link>
      <div className={\`p-5 flex flex-col \${isList ? 'w-full sm:w-2/3 justify-center' : 'flex-1'}\`}>
        <ProductRating productId={product.id} themeColor={themeColor} />
        <Link to={\`/product/\${product.id}\`}><h3 className="font-bold text-lg mb-1 line-clamp-1 hover:underline cursor-pointer" style={{ color: textColor }}>{product.name}</h3></Link>
        <p className="opacity-70 text-sm line-clamp-2 mb-4 flex-1" style={{ color: config.secondaryColor || '#666' }}>{product.description}</p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t" style={{ borderColor: (config.secondaryColor || '#ccc') + '30' }}>
          <p className="font-semibold text-lg" style={{ color: themeColor }}>\${Number(product.price).toFixed(2)}</p>
          <button 
            onClick={() => {
              addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] });
              toast.success('Added to cart');
            }}
            className="px-4 py-2 text-white text-sm font-medium transition-opacity hover:opacity-90 active:scale-95" 
            style={{ 
              backgroundColor: config.buttonColor || themeColor,
              borderRadius: 'var(--border-radius-sm)'
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}`;

if (code.includes(oldCardPattern)) {
    const parts = code.split(oldCardPattern);
    code = parts[0] + newCardCode;
}

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
