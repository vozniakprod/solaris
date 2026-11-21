import crypto from 'node:crypto';
import type { FunnelMode, ReportModuleId } from './solarisPricing';

export type StripeRuntimeMode = 'test' | 'live' | 'unconfigured';

export interface StripeCheckoutMetadata {
  sessionId: string;
  orderId: string;
  mode: FunnelMode;
  personName: string;
  modules: string; // comma-separated ReportModuleId
  calendar: 'true' | 'false';
  pdf: 'true' | 'false';
  priceGrossPln: string;
  isUpsell: 'true' | 'false';
}

export interface CreateStripeCheckoutInput {
  secretKey: string;
  amountGrosze: number;
  productName: string;
  productDescription: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata: StripeCheckoutMetadata;
  idempotencyKey?: string;
}

export interface StripeCheckoutSessionObject {
  id: string;
  url: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required' | string;
  status: 'open' | 'complete' | 'expired' | string;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  metadata?: Partial<StripeCheckoutMetadata> | null;
}

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9_]{8,120}$/;

export type StripeSecretKeyStatus =
  | 'test'
  | 'live'
  | 'missing'
  | 'publishable_key_instead_of_secret'
  | 'unrecognized_format';

export function normalizeStripeEnvValue(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function diagnoseStripeSecretKey(secretKey: string | undefined): StripeSecretKeyStatus {
  const cleaned = normalizeStripeEnvValue(secretKey);
  if (!cleaned) return 'missing';
  if (cleaned.startsWith('sk_live_') || cleaned.startsWith('rk_live_')) return 'live';
  if (cleaned.startsWith('sk_test_') || cleaned.startsWith('rk_test_')) return 'test';
  if (cleaned.startsWith('pk_test_') || cleaned.startsWith('pk_live_')) {
    return 'publishable_key_instead_of_secret';
  }
  return 'unrecognized_format';
}

export function getStripeRuntimeMode(secretKey: string | undefined): StripeRuntimeMode {
  const status = diagnoseStripeSecretKey(secretKey);
  if (status === 'live') return 'live';
  if (status === 'test') return 'test';
  return 'unconfigured';
}

export function isValidStripeCheckoutSessionId(id: string): boolean {
  return STRIPE_SESSION_ID_RE.test(id.trim());
}

export function buildStripeCheckoutFormParams(input: CreateStripeCheckoutInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('locale', 'pl');
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  params.set('allow_promotion_codes', 'false');

  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'pln');
  params.set('line_items[0][price_data][unit_amount]', String(Math.round(input.amountGrosze)));
  params.set('line_items[0][price_data][product_data][name]', input.productName.slice(0, 120));
  params.set(
    'line_items[0][price_data][product_data][description]',
    input.productDescription.slice(0, 240),
  );

  if (input.customerEmail && input.customerEmail.includes('@')) {
    params.set('customer_email', input.customerEmail.trim().slice(0, 120));
  }

  for (const [key, val] of Object.entries(input.metadata)) {
    params.set(`metadata[${key}]`, String(val).slice(0, 200));
  }

  return params;
}

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutInput,
): Promise<
  | { ok: true; session: StripeCheckoutSessionObject }
  | { ok: false; error: string; status: number }
> {
  const params = buildStripeCheckoutFormParams(input);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.secretKey.trim()}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (input.idempotencyKey) {
    headers['Idempotency-Key'] = input.idempotencyKey;
  }

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  const data = (await res.json()) as StripeCheckoutSessionObject & {
    error?: { message?: string; code?: string };
  };

  if (!res.ok || !data.id || !data.url) {
    return {
      ok: false,
      status: res.status || 502,
      error: data?.error?.message || 'Nie udało się utworzyć sesji płatności Stripe.',
    };
  }

  return { ok: true, session: data };
}

export async function retrieveStripeCheckoutSession(
  stripeSessionId: string,
  secretKey: string,
): Promise<
  | { ok: true; session: StripeCheckoutSessionObject }
  | { ok: false; error: string; status: number }
> {
  const cleanId = stripeSessionId.trim();
  if (!isValidStripeCheckoutSessionId(cleanId)) {
    return { ok: false, status: 400, error: 'Nieprawidłowy identyfikator sesji Stripe.' };
  }

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(cleanId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
    },
  });

  const data = (await res.json()) as StripeCheckoutSessionObject & {
    error?: { message?: string };
  };

  if (!res.ok || !data.id) {
    return {
      ok: false,
      status: res.status || 502,
      error: data?.error?.message || 'Nie udało się zweryfikować płatności w Stripe.',
    };
  }

  return { ok: true, session: data };
}

/**
 * Verifies Stripe's `Stripe-Signature` header (supports multiple `v1=` signatures during key rotation)
 * with constant-time comparison and a 5-minute replay tolerance window.
 */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
  nowUnixSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !secret.trim()) return false;

  let timestamp: string | null = null;
  const v1Signatures: string[] = [];

  for (const part of signatureHeader.split(',')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === 't' && !timestamp) timestamp = v;
    if (k === 'v1' && v.length > 0) v1Signatures.push(v);
  }

  if (!timestamp || v1Signatures.length === 0) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(nowUnixSec - tsNum) > 300) {
    return false;
  }

  const expectedHex = crypto
    .createHmac('sha256', secret.trim())
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  for (const sig of v1Signatures) {
    if (!/^[a-fA-F0-9]+$/.test(sig) || sig.length !== expectedHex.length) {
      continue;
    }
    const actualBuf = Buffer.from(sig, 'hex');
    if (actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return true;
    }
  }

  return false;
}

const ALLOWED_MODULES: ReadonlySet<string> = new Set([
  'finanse',
  'relacje',
  'energia',
  'zmiany',
  'zgodnosc',
]);

export function parseModulesFromMetadata(raw: string | undefined): ReportModuleId[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((m): m is ReportModuleId => ALLOWED_MODULES.has(m));
}
