import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Imports
if (!code.includes("import { HelmetProvider }")) {
    code = code.replace(
        "import { BrowserRouter",
        "import { HelmetProvider } from 'react-helmet-async';\nimport { BrowserRouter"
    );
}

if (!code.includes("import { TrackOrderPage }")) {
    code = code.replace(
        "import { HomePage }",
        "import { HomePage }\nimport { TrackOrderPage } from './pages/store/TrackOrderPage';\nimport { MyOrdersPage } from './pages/store/MyOrdersPage';"
    );
}

// Router config
const queryClientProviderStr = '<QueryClientProvider client={queryClient}>';
if (!code.includes("<HelmetProvider>")) {
    code = code.replace(
        queryClientProviderStr,
        `<HelmetProvider>\n      ${queryClientProviderStr}`
    );
    code = code.replace(
        "</QueryClientProvider>",
        "</QueryClientProvider>\n    </HelmetProvider>"
    );
}

// Routes
if (!code.includes("path=\"/track\"")) {
    code = code.replace(
        '<Route path="/checkout/success" element={<CheckoutSuccessPage />} />',
        '<Route path="/checkout/success" element={<CheckoutSuccessPage />} />\n          <Route path="/track" element={<TrackOrderPage />} />\n          <Route path="/my-orders" element={<SignedIn><MyOrdersPage /></SignedIn>} />'
    );
}

fs.writeFileSync('src/App.tsx', code);
