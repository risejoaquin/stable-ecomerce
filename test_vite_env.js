import { createServer } from 'vite';
async function test() {
  const vite = await createServer({
    appType: 'spa',
  });
  console.log(vite.environments?.client?.config?.env || vite.config.env);
  process.exit(0);
}
test();
