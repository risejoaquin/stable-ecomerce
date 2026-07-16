import { createServer } from 'vite';
(async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  console.log(server.environments.client.config.env);
  process.exit(0);
})();
