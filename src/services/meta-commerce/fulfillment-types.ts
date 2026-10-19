import { z } from 'zod';
import type { ConversationShippingLocation, CustomerInfo, DeliveryMethod, PaymentChoice } from './order-types';

/**
 * Authoritative store fulfillment & payment capabilities configuration.
 * Dialogue logic MUST strictly respect these capabilities.
 */
export const StoreShippingCapabilitiesSchema = z.object({
  enabled: z.boolean().default(true),
  flatRateMxn: z.number().finite().nonnegative().default(150),
  freeShippingThresholdMxn: z.number().finite().nonnegative().default(2000),
  standardDeliveryDays: z
    .object({
      min: z.number().int().min(1),
      max: z.number().int().min(1),
    })
    .nullable()
    .default({ min: 3, max: 5 }),
  carrierPartners: z.array(z.string()).default(['Estafeta', 'FedEx', 'DHL']),
  supportedCoverage: z.enum(['national_mx', 'local_only', 'custom']).default('national_mx'),
  requireConfirmationIfUnknownZone: z.boolean().default(true),
  requireConfirmationIfUnknownTime: z.boolean().default(true),
  knownZones: z
    .record(
      z.string(),
      z.object({
        feeMxn: z.number().finite().nonnegative(),
        estimateDays: z.string(),
      }),
    )
    .optional(),
});
export type StoreShippingCapabilities = z.infer<typeof StoreShippingCapabilitiesSchema>;

export const StorePickupCapabilitiesSchema = z.object({
  enabled: z.boolean().default(true),
  feeMxn: z.literal(0).default(0),
  locationName: z.string().min(1).default('Showroom BLACK RELIC'),
  address: z
    .string()
    .min(1)
    .default('Colima 123, Roma Norte, Cuauhtémoc, 06700 Ciudad de México, CDMX'),
  schedule: z.string().nullable().default('Lunes a Sábado de 11:00 a 19:00 hrs'),
  requireConfirmationIfUnknownSchedule: z.boolean().default(true),
});
export type StorePickupCapabilities = z.infer<typeof StorePickupCapabilitiesSchema>;

export const StorePaymentStripeCapabilitiesSchema = z.object({
  enabled: z.boolean().default(true),
  displayName: z.string().default('Tarjeta de crédito / débito (Enlace seguro)'),
  checkoutUrlTemplate: z.string().default('https://selfcaresinners.com/checkout/:orderId'),
  cardCollectionInDmAllowed: z.literal(false).default(false), // STRICT INVARIANT: never true!
});
export type StorePaymentStripeCapabilities = z.infer<typeof StorePaymentStripeCapabilitiesSchema>;

export const StorePaymentTransferCapabilitiesSchema = z.object({
  enabled: z.boolean().default(true),
  displayName: z.string().default('Transferencia electrónica SPEI'),
  bankName: z.string().default('BBVA México'),
  clabe: z.string().default('646180123456789012'),
  accountHolder: z.string().default('BLACK RELIC / Selfcare Sinners S.A. de C.V.'),
});
export type StorePaymentTransferCapabilities = z.infer<typeof StorePaymentTransferCapabilitiesSchema>;

export const StorePaymentCashCapabilitiesSchema = z.object({
  enabled: z.boolean().default(true),
  displayName: z.string().default('Efectivo en showroom / contra entrega'),
  allowedOnlyForPickup: z.boolean().default(true),
});
export type StorePaymentCashCapabilities = z.infer<typeof StorePaymentCashCapabilitiesSchema>;

export const StorePaymentCapabilitiesSchema = z.object({
  stripe: StorePaymentStripeCapabilitiesSchema,
  transfer: StorePaymentTransferCapabilitiesSchema,
  cash: StorePaymentCashCapabilitiesSchema,
});
export type StorePaymentCapabilities = z.infer<typeof StorePaymentCapabilitiesSchema>;

export const StoreFulfillmentCapabilitiesSchema = z.object({
  storeId: z.string().min(1).default('store_black_relic_main'),
  storeName: z.string().min(1).default('BLACK RELIC'),
  delivery: z.object({
    shipping: StoreShippingCapabilitiesSchema,
    pickup: StorePickupCapabilitiesSchema,
  }),
  payments: StorePaymentCapabilitiesSchema,
});
export type StoreFulfillmentCapabilities = z.infer<typeof StoreFulfillmentCapabilitiesSchema>;

/**
 * Standard default configuration for BLACK RELIC / Selfcare Sinners.
 */
export const DEFAULT_BLACK_RELIC_CAPABILITIES: StoreFulfillmentCapabilities = {
  storeId: 'store_black_relic_main',
  storeName: 'BLACK RELIC',
  delivery: {
    shipping: {
      enabled: true,
      flatRateMxn: 150,
      freeShippingThresholdMxn: 2000,
      standardDeliveryDays: { min: 3, max: 5 },
      carrierPartners: ['Estafeta', 'FedEx', 'DHL'],
      supportedCoverage: 'national_mx',
      requireConfirmationIfUnknownZone: true,
      requireConfirmationIfUnknownTime: true,
      knownZones: {
        cdmx_metropolitana: { feeMxn: 150, estimateDays: '2 a 3 días hábiles' },
        nacional_estandar: { feeMxn: 150, estimateDays: '3 a 5 días hábiles' },
      },
    },
    pickup: {
      enabled: true,
      feeMxn: 0,
      locationName: 'Showroom BLACK RELIC',
      address: 'Colima 123, Roma Norte, Cuauhtémoc, 06700 Ciudad de México, CDMX',
      schedule: 'Lunes a Sábado de 11:00 a 19:00 hrs',
      requireConfirmationIfUnknownSchedule: true,
    },
  },
  payments: {
    stripe: {
      enabled: true,
      displayName: 'Tarjeta de crédito / débito (Enlace seguro)',
      checkoutUrlTemplate: 'https://selfcaresinners.com/checkout/:orderId',
      cardCollectionInDmAllowed: false,
    },
    transfer: {
      enabled: true,
      displayName: 'Transferencia electrónica SPEI',
      bankName: 'BBVA México',
      clabe: '646180123456789012',
      accountHolder: 'BLACK RELIC / Selfcare Sinners S.A. de C.V.',
    },
    cash: {
      enabled: true,
      displayName: 'Efectivo en showroom / contra entrega',
      allowedOnlyForPickup: true,
    },
  },
};

/**
 * Structured response from fulfillment dialogue operations.
 */
export interface FulfillmentDialogueResponse {
  success: boolean;
  prompt: string;
  confirmationRequired: boolean;
  confirmationReason?: string;
  securityWarning?: string;
  technicalDetails?: Record<string, unknown>;
  sanitizedLogPayload?: Record<string, unknown>;
  collectedData?: Partial<CustomerInfo>;
  missingFields?: string[];
  suggestedAction?: 'select_delivery' | 'provide_customer_data' | 'select_payment' | 'confirm_order' | 'human_handoff';
}

/**
 * Audit log entry for fulfillment dialogue actions with sanitized PII.
 */
export interface FulfillmentAuditLog {
  timestamp: string;
  action: string;
  conversationId: string;
  channel: string;
  data: Record<string, unknown>;
}
