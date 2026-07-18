import fs from 'fs';
let authMock = fs.readFileSync('src/components/AuthMock.tsx', 'utf-8');

const target = `      localStorage.setItem('auth_token', data.token);
      window.location.reload(); // Recargamos para que toda la app tome el nuevo estado
    } catch (err: any) {`;

const replacement = `      localStorage.setItem('auth_token', data.token);
      if (mode === 'signup' && data.message) {
        alert(data.message);
      }
      window.location.reload(); // Recargamos para que toda la app tome el nuevo estado
    } catch (err: any) {`;

authMock = authMock.replace(target, replacement);
fs.writeFileSync('src/components/AuthMock.tsx', authMock);
