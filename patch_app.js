import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace {clerkPubKey ? (...) : (...)} in App return
code = code.replace(/\{clerkPubKey \? \([\s\S]*?\{routerContent\}[\s\S]*?\) : \(\s*routerContent\s*\)\}/, '{routerContent}');

// Replace clerkPubKey in Route path="/admin"
const adminRouteCode = `          {/* Admin Panel */}
          <Route path="/admin" element={
              <>
                <SafeSignedIn>
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                </SafeSignedIn>
                <SafeSignedOut><SafeRedirectToSignIn /></SafeSignedOut>
              </>
          }>`;
code = code.replace(/\{\/\* Admin Panel \*\/\}[\s\S]*?\}\s*>/, adminRouteCode);

// Remove clerkPubKey declaration
code = code.replace(/const clerkPubKey = import\.meta\.env\.VITE_CLERK_PUBLISHABLE_KEY(?: \|\| '')?;/g, '');

fs.writeFileSync('src/App.tsx', code);
