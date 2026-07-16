const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use('/api', (req, res, next) => {
  console.log("Intercepted /api:", req.url);
  next();
}, createProxyMiddleware({
  target: 'http://localhost:8080',
  changeOrigin: true,
}));

app.use('*', (req, res) => {
  res.send('FALLBACK');
});

app.listen(3001, () => console.log('listening on 3001'));
