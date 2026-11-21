interface TikTokPixelApi {
  page?: () => void;
  track?: (
    event: string,
    properties?: Record<string, unknown>,
    options?: { event_id?: string },
  ) => void;
  grantConsent?: () => void;
  revokeConsent?: () => void;
}

declare global {
  interface Window {
    ttq?: TikTokPixelApi;
  }
}

function getTtq(): TikTokPixelApi | null {
  if (typeof window === 'undefined') return null;
  return window.ttq ?? null;
}

export function parsePlnAmountToNumber(amountPln?: string | null): number {
  if (!amountPln) return 0;
  const normalized = amountPln.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
}

export function syncTikTokConsent(marketingAllowed: boolean): void {
  try {
    const ttq = getTtq();
    if (!ttq) return;
    if (marketingAllowed) {
      ttq.grantConsent?.();
    } else {
      ttq.revokeConsent?.();
    }
  } catch {
    // never break UI on third-party pixel errors
  }
}

export function trackTikTokViewContent(params: {
  contentId: string;
  contentName: string;
  value?: number;
}): void {
  try {
    const ttq = getTtq();
    if (!ttq?.track) return;
    ttq.track('ViewContent', {
      contents: [
        {
          content_id: params.contentId,
          content_type: 'product',
          content_name: params.contentName,
        },
      ],
      value: params.value ?? 29.99,
      currency: 'PLN',
    });
  } catch {
    // ignore pixel errors
  }
}

export function trackTikTokInitiateCheckout(params: {
  contentId: string;
  contentName: string;
  value: number;
}): void {
  try {
    const ttq = getTtq();
    if (!ttq?.track) return;
    ttq.track('InitiateCheckout', {
      contents: [
        {
          content_id: params.contentId,
          content_type: 'product',
          content_name: params.contentName,
        },
      ],
      value: params.value,
      currency: 'PLN',
    });
  } catch {
    // ignore pixel errors
  }
}

export function trackTikTokCompletePayment(params: {
  eventId: string;
  contentId: string;
  contentName: string;
  value: number;
}): void {
  try {
    const dedupKey = `solaris_ttq_paid_${params.eventId}`;
    if (window.sessionStorage.getItem(dedupKey) === '1') {
      return;
    }
    const ttq = getTtq();
    if (!ttq?.track) return;
    ttq.track(
      'CompletePayment',
      {
        contents: [
          {
            content_id: params.contentId,
            content_type: 'product',
            content_name: params.contentName,
          },
        ],
        value: params.value,
        currency: 'PLN',
      },
      { event_id: params.eventId },
    );
    window.sessionStorage.setItem(dedupKey, '1');
  } catch {
    // ignore pixel/storage errors
  }
}

export function trackTikTokSubmitForm(contentName = 'Solaris 2027 Lead -20%'): void {
  try {
    const ttq = getTtq();
    if (!ttq?.track) return;
    ttq.track('SubmitForm', {
      contents: [
        {
          content_id: 'solaris-2027-followup',
          content_type: 'product',
          content_name: contentName,
        },
      ],
    });
  } catch {
    // ignore pixel errors
  }
}
