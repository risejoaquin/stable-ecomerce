import fs from 'fs';

function updateLegal(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(
    /className="max-w-3xl mx-auto px-8 py-16 prose prose-slate"/g,
    'className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-16 prose prose-slate"'
  );
  code = code.replace(
    /className="max-w-2xl mx-auto px-8 py-16"/g, // ContactPage
    'className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-16"'
  );
  code = code.replace(
    /className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"/g, // ContactPage form
    'className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-gray-100"'
  );
  fs.writeFileSync(file, code);
}

updateLegal('src/pages/legal/TermsAndConditionsPage.tsx');
updateLegal('src/pages/legal/PrivacyPolicyPage.tsx');
updateLegal('src/pages/legal/ReturnPolicyPage.tsx');
updateLegal('src/pages/legal/ContactPage.tsx');
