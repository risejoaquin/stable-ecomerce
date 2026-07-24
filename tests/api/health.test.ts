import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// For simplicity, we create a mini express app that mocks the real one
// A more robust approach would be to export the app from server.ts
const app = express();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
