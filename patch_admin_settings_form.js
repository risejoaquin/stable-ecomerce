import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminSettingsPage.tsx', 'utf-8');

const startStr = `{activeTab === 'theme' && (`;
const endStr = `</header>`;
const endFormStr = `      </div>\n    </div>\n  );\n}`;

let newCode = code.slice(0, code.indexOf(endStr) + endStr.length) + `
      <StoreSettingsForm 
        activeTab={activeTab} 
        config={config} 
        handleUpload={handleUpload} 
        updateConfigField={updateConfigField} 
        updateHeroField={updateHeroField} 
      />
    </div>
  );
}`;

newCode = `import { StoreSettingsForm } from '../../components/admin/StoreSettingsForm';\n` + newCode;

fs.writeFileSync('src/pages/admin/AdminSettingsPage.tsx', newCode);
