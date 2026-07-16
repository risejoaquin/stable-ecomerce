import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

const heroPattern = `{(layout === 'hero' || config.heroBanner?.image) && (
        <div className="relative w-full h-[50vh] min-h-[400px] flex items-center justify-center text-center p-8 bg-gray-100 overflow-hidden"
             style={{
               backgroundImage: config.heroBanner?.image ? \\\`url(\\\${config.heroBanner.image})\\\` : 'none',
               backgroundSize: 'cover',
               backgroundPosition: 'center',
             }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 text-white max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">{config.heroBanner?.title || 'Welcome'}</h1>
            <p className="text-xl md:text-2xl opacity-90 font-light">{config.heroBanner?.subtitle || 'Discover our collection'}</p>
          </div>
        </div>
      )}`;

code = code.replace(heroPattern, `<HeroBanner config={config} />`);
code = `import { HeroBanner } from '../../components/store/HeroBanner';\n` + code;

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
