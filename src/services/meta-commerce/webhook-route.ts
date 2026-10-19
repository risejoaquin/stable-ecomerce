import type { Request, Response } from 'express';
import { MetaWebhookIngestionService } from './webhook-ingestion';
import { sanitizeLogData } from './webhook-sanitizer';

let sharedService: MetaWebhookIngestionService | null = null;

export function getSharedMetaWebhookService(): MetaWebhookIngestionService {
  if (!sharedService) {
    sharedService = new MetaWebhookIngestionService();
  }
  return sharedService;
}

export function setSharedMetaWebhookService(service: MetaWebhookIngestionService | null): void {
  sharedService = service;
}

/**
 * Express handler for GET /api/webhooks/meta (Handshake challenge verification).
 */
export function handleMetaWebhookHandshake(req: Request, res: Response) {
  const service = getSharedMetaWebhookService();
  const result = service.handleVerificationHandshake(req.query as Record<string, unknown>);

  if (result.statusCode === 200 && result.challenge !== undefined) {
    return res.status(200).type('text/plain').send(result.challenge);
  }

  return res.status(result.statusCode).json({
    error: result.error || 'forbidden',
  });
}

/**
 * Express handler for POST /api/webhooks/meta (Inbound webhook event ingestion).
 */
export async function handleMetaWebhookIngress(req: Request, res: Response) {
  const service = getSharedMetaWebhookService();
  const signatureHeader = (req.headers['x-hub-signature-256'] || req.headers['x-hub-signature']) as string | undefined;

  const rawBody: Buffer | string = Buffer.isBuffer(req.body)
    ? req.body
    : typeof req.body === 'string'
      ? req.body
      : null;

  if (rawBody === null) return res.status(400).json({ error: 'raw_body_required' });

  const result = await service.ingestPayload(rawBody, signatureHeader);

  // Return appropriate response code and body
  return res.status(result.statusCode).json(result.body);
}
