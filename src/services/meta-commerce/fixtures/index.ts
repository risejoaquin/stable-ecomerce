import crypto from 'node:crypto';
import textDmFixture from './text-dm.fixture.json';
import storyReplyFixture from './story-reply.fixture.json';
import commentFixture from './comment.fixture.json';
import duplicateEventFixture from './duplicate-event.fixture.json';
import malformedPayloadFixture from './malformed-payload.fixture.json';

export {
  textDmFixture,
  storyReplyFixture,
  commentFixture,
  duplicateEventFixture,
  malformedPayloadFixture,
};

export * from './catalog-fixtures';

/**
 * Creates a signed payload object with raw body buffer, json string, and x-hub-signature-256 header.
 */
export function createSignedMetaPayload(
  payload: unknown,
  secret: string,
): {
  jsonString: string;
  rawBuffer: Buffer;
  signature: string;
  signatureHeader: string;
  headers: Record<string, string>;
} {
  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const rawBuffer = Buffer.from(jsonString, 'utf8');
  const signature = crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex');
  const signatureHeader = `sha256=${signature}`;

  return {
    jsonString,
    rawBuffer,
    signature,
    signatureHeader,
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': signatureHeader,
    },
  };
}
