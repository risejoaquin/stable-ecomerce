import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

const bagStr = `<button 
            onClick={() => setIsCartOpen(true)}`;
            
const heartStr = `          <Link to="/wishlist" className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors relative" style={{ borderColor: secondaryColor + '40', backgroundColor: backgroundColor }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = secondaryColor + '10'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = backgroundColor}>
            <Heart size={20} style={{ color: themeColor }} />
          </Link>\n          <button 
            onClick={() => setIsCartOpen(true)}`;

if (!code.includes('to="/wishlist"')) {
  code = code.replace(bagStr, heartStr);
  code = `import { Heart } from 'lucide-react';\n` + code;
  fs.writeFileSync('src/pages/store/HomePage.tsx', code);
}
