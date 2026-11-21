import type { SolarisFullReport } from './ephemerisEngine.js';
import type { ReportModuleId } from './solarisPricing.js';
import { buildSolaris2027Ics } from './icsExport.js';
import {
  LEGAL_TEXTS,
  SELLER_LEGAL_CONFIG,
  type DurableOrderConfirmation,
} from '../data/legalDocuments.js';
import { normalizeEnvSecret } from './openaiEditorial.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_RESEND_FROM = 'Solaris 2027 <onboarding@resend.dev>';

export interface ResendEmailAttachment {
  filename: string;
  content: string; // base64
}

export interface EmailPayload {
  subject: string;
  html: string;
  text: string;
  attachments?: ResendEmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  reason?: 'not_configured' | 'invalid_recipient' | 'provider_error' | 'network_error';
  messageId?: string;
  error?: string;
}

export function isResendConfigured(apiKey: string | undefined): boolean {
  const cleaned = normalizeEnvSecret(apiKey);
  return cleaned.length > 10 && cleaned.startsWith('re_');
}

export function resolveEmailFromAddress(rawFrom: string | undefined): string {
  const cleaned = normalizeEnvSecret(rawFrom);
  return cleaned.length > 3 ? cleaned : DEFAULT_RESEND_FROM;
}

function escapeHtml(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function maskEmailForUi(email: string): string {
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf('@');
  if (atIdx <= 1) return trimmed;
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function buildFullReportEmailPayload(params: {
  report: SolarisFullReport;
  unlockedModules: ReportModuleId[];
  calendarUnlocked: boolean;
  confirmation: DurableOrderConfirmation;
}): EmailPayload {
  const { report, unlockedModules, calendarUnlocked, confirmation } = params;

  const uniqueUnlocked = Array.from(new Set(unlockedModules)).filter((id) =>
    Boolean(report.modules[id]),
  );

  const safeName = escapeHtml(report.person1.name);
  const safeCoreTitle = escapeHtml(report.freeCoreVectorTitle);
  const safeCoreBody = escapeHtml(report.freeCoreVectorBody);
  const safeOrderId = escapeHtml(confirmation.orderId);

  const modulesHtml = uniqueUnlocked
    .map((id) => {
      const mod = report.modules[id];
      const actionsHtml = mod.keyActions
        .map(
          (a) =>
            `<li style="margin:0 0 6px;color:#1F2937;font-size:14px;line-height:1.55;">${escapeHtml(a)}</li>`,
        )
        .join('');
      const avoidHtml = mod.avoidList
        .map(
          (a) =>
            `<li style="margin:0 0 6px;color:#7F1D1D;font-size:14px;line-height:1.55;">${escapeHtml(a)}</li>`,
        )
        .join('');

      return `
        <div style="margin:0 0 22px;padding:22px;border-radius:16px;background:#FFFFFF;border:1px solid #E5E1D6;">
          <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#8C321A;">
            Potencjał ${mod.scoreOutOf10}/10 · ${escapeHtml(mod.watchDates)}
          </p>
          <h2 style="margin:6px 0 12px;font-size:20px;line-height:1.25;color:#111114;">
            ${escapeHtml(mod.title)}
          </h2>
          <p style="margin:0 0 10px;font-size:14px;line-height:1.65;color:#2B2A26;">
            ${escapeHtml(mod.summary)}
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#44423C;">
            ${escapeHtml(mod.deepDive)}
          </p>
          <div style="margin:0 0 12px;padding:14px 16px;border-radius:12px;background:#F3FAF5;border:1px solid #BBF7D0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#166534;">
              Rób to w 2027 (3 konkretne kroki)
            </p>
            <ul style="margin:0;padding-left:18px;">${actionsHtml}</ul>
          </div>
          <div style="margin:0 0 12px;padding:14px 16px;border-radius:12px;background:#FEF2F2;border:1px solid #FECACA;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#991B1B;">
              Czerwone flagi — tego unikaj
            </p>
            <ul style="margin:0;padding-left:18px;">${avoidHtml}</ul>
          </div>
          <p style="margin:0;padding:12px 14px;border-radius:10px;background:#F5F3EC;font-size:13px;line-height:1.55;color:#2B2A26;">
            <strong>Punkt kontrolny:</strong> ${escapeHtml(mod.checkpoint)}
          </p>
        </div>
      `;
    })
    .join('\n');

  const monthsHtml = report.monthlyTimeline
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E1D6;font-weight:600;color:#111114;white-space:nowrap;">${escapeHtml(m.monthFull)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E1D6;font-family:monospace;font-size:12px;color:#3E3C37;white-space:nowrap;">Energia ${m.energy}% · Ryzyko ${m.risk}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E1D6;font-size:13px;line-height:1.5;color:#2B2A26;">
          <strong>${escapeHtml(m.headline)}</strong><br/>${escapeHtml(m.actionNote)}
        </td>
      </tr>
    `,
    )
    .join('\n');

  const pairHtml =
    report.mode === 'pair' && report.person2 && report.compatibilityScore !== null
      ? `
        <div style="margin:0 0 22px;padding:20px;border-radius:16px;background:#F3E8FF;border:1px solid #D8B4FE;">
          <p style="margin:0;font-family:monospace;font-size:11px;text-transform:uppercase;color:#5B21B6;">
            Zgodność dla dwojga · ${escapeHtml(report.person1.name)} + ${escapeHtml(report.person2.name)}
          </p>
          <h2 style="margin:6px 0 8px;font-size:20px;color:#111114;">
            Indeks 2027: ${report.compatibilityScore}% — ${escapeHtml(report.compatibilityHeadline)}
          </h2>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#2F2440;">
            ${escapeHtml(report.compatibilityFreeInsight)}
          </p>
        </div>
      `
      : '';

  const unknownTimeHtml =
    report.ephemeris.omittedTimeDependentElements && report.ephemeris.unknownTimeNotePl
      ? `<p style="margin:12px 0 0;font-size:12px;color:#D8B4FE;">Uwaga: ${escapeHtml(report.ephemeris.unknownTimeNotePl)}</p>`
      : '';

  const calendarBannerHtml = calendarUnlocked
    ? `
      <div style="margin:0 0 22px;padding:18px 20px;border-radius:16px;background:#111114;color:#FFFFFF;">
        <p style="margin:0;font-family:monospace;font-size:11px;text-transform:uppercase;color:#4ADE80;">
          Załącznik w tej wiadomości
        </p>
        <p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#E4E4EA;">
          Do tego e-maila dołączyliśmy plik <strong>solaris-2027.ics</strong> z Twoimi 12 złotymi i ryzykownymi oknami na 2027 rok. Kliknij załącznik na telefonie lub komputerze, aby dodać wszystkie daty do Apple Calendar lub Google Calendar.
        </p>
      </div>
    `
    : '';

  const html = `<!doctype html>
<html lang="pl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#F0EDE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111114;">
  <div style="max-width:680px;margin:0 auto;padding:28px 16px 48px;">
    <div style="padding:26px 24px;border-radius:20px;background:#111114;color:#FFFFFF;margin-bottom:20px;">
      <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#FF7B5A;">
        SOLARIS 2027 · PEŁNY RAPORT · NR ${safeOrderId}
      </p>
      <h1 style="margin:10px 0 10px;font-size:26px;line-height:1.2;color:#FFFFFF;">
        ${safeCoreTitle}
      </h1>
      <p style="margin:0;font-size:14px;line-height:1.65;color:#D4D4DC;">
        ${safeCoreBody}
      </p>
      <p style="margin:14px 0 0;font-family:monospace;font-size:12px;color:#A1A1AA;">
        Solariusz 2027: ${escapeHtml(report.ephemeris.solarReturnDisplayPl)} · Słońce ${report.ephemeris.natalSunDeg}° ${escapeHtml(report.ephemeris.natalSunSignPl)} · ${escapeHtml(report.ephemeris.cityResolved)} (${escapeHtml(report.ephemeris.timeZoneUsed)})
      </p>
      ${unknownTimeHtml}
    </div>

    <p style="margin:0 0 18px;padding:12px 16px;border-radius:12px;background:#E6E1D5;font-size:12px;line-height:1.55;color:#4A4842;">
      ${escapeHtml(LEGAL_TEXTS.reportTopBottomDisclaimer)}
    </p>

    ${calendarBannerHtml}
    ${pairHtml}

    <div style="margin:0 0 22px;padding:20px;border-radius:16px;background:#FFFFFF;border:1px solid #E5E1D6;">
      <p style="margin:0;font-family:monospace;font-size:11px;text-transform:uppercase;color:#57544D;">
        Główny wniosek dla ${safeName}
      </p>
      <h2 style="margin:6px 0 10px;font-size:19px;color:#111114;">
        ${escapeHtml(report.freeOpenInsightTitle)}
      </h2>
      <p style="margin:0;font-size:14px;line-height:1.65;color:#2B2A26;">
        ${escapeHtml(report.freeOpenInsightBody)}
      </p>
    </div>

    ${modulesHtml}

    <div style="margin:0 0 22px;padding:20px;border-radius:16px;background:#FFFFFF;border:1px solid #E5E1D6;">
      <p style="margin:0;font-family:monospace;font-size:11px;text-transform:uppercase;color:#57544D;">
        Oś 12 miesięcy 2027
      </p>
      <h2 style="margin:6px 0 14px;font-size:19px;color:#111114;">
        Twój harmonogram Styczeń – Grudzień 2027
      </h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${monthsHtml}
      </table>
    </div>

    <div style="padding:20px;border-radius:16px;background:#E6E1D5;font-size:12px;line-height:1.65;color:#3E3C37;">
      <p style="margin:0 0 8px;font-weight:700;color:#111114;">
        Potwierdzenie zamówienia (trwały nośnik) · Nr ${safeOrderId}
      </p>
      <p style="margin:0 0 6px;">
        Produkt: Raport Solaris 2027 (${escapeHtml(confirmation.variantLabel)}) · Cena brutto: <strong>${escapeHtml(confirmation.priceGrossPln)}</strong> · Data: ${escapeHtml(confirmation.orderedAtPl)}
      </p>
      <p style="margin:0 0 6px;">
        • Na Twoje wyraźne żądanie rozpoczęliśmy dostarczanie Raportu przed upływem 14-dniowego terminu do odstąpienia od umowy. Zgodnie z art. 38 ustawy o prawach konsumenta oznacza to utratę prawa odstąpienia, o czym zostałeś/aś poinformowany/a przed zakupem.
      </p>
      <p style="margin:0 0 6px;">
        • Dokumenty: <a href="${escapeHtml(confirmation.regulaminUrl)}" style="color:#8C321A;">Regulamin</a> · <a href="${escapeHtml(confirmation.politykaUrl)}" style="color:#8C321A;">Polityka prywatności</a>
      </p>
      <p style="margin:0;">
        • Kontakt i reklamacje: <a href="mailto:${escapeHtml(confirmation.contactEmail)}" style="color:#8C321A;">${escapeHtml(confirmation.contactEmail)}</a> · ${escapeHtml(confirmation.sellerName)}
      </p>
    </div>
  </div>
</body>
</html>`;

  const modulesText = uniqueUnlocked
    .map((id) => {
      const mod = report.modules[id];
      return [
        `=== ${mod.title} (Potencjał ${mod.scoreOutOf10}/10 · ${mod.watchDates}) ===`,
        mod.summary,
        '',
        mod.deepDive,
        '',
        'Rób to w 2027:',
        ...mod.keyActions.map((a, idx) => `${idx + 1}. ${a}`),
        '',
        'Czerwone flagi:',
        ...mod.avoidList.map((a) => `- ${a}`),
        '',
        `Punkt kontrolny: ${mod.checkpoint}`,
      ].join('\n');
    })
    .join('\n\n');

  const monthsText = report.monthlyTimeline
    .map(
      (m) =>
        `- ${m.monthFull} (Energia ${m.energy}% / Ryzyko ${m.risk}%): ${m.headline} — ${m.actionNote}`,
    )
    .join('\n');

  const text = [
    `SOLARIS 2027 — TWÓJ PEŁNY RAPORT (${confirmation.orderId})`,
    '',
    report.freeCoreVectorTitle,
    report.freeCoreVectorBody,
    `Solariusz 2027: ${report.ephemeris.solarReturnDisplayPl} | ${report.ephemeris.cityResolved} (${report.ephemeris.timeZoneUsed})`,
    '',
    LEGAL_TEXTS.reportTopBottomDisclaimer,
    '',
    `GŁÓWNY WNIOSEK: ${report.freeOpenInsightTitle}`,
    report.freeOpenInsightBody,
    '',
    modulesText,
    '',
    'OŚ 12 MIESIĘCY 2027:',
    monthsText,
    '',
    '---',
    confirmation.plainTextBody,
  ].join('\n');

  const attachments: ResendEmailAttachment[] = [];
  if (calendarUnlocked && report.calendarEvents.length > 0) {
    const icsContent = buildSolaris2027Ics(report.person1.name, report.calendarEvents);
    attachments.push({
      filename: 'solaris-2027-kalendarz.ics',
      content: Buffer.from(icsContent, 'utf8').toString('base64'),
    });
  }

  return {
    subject: `Twój pełny Raport Solaris 2027 (nr ${confirmation.orderId})`,
    html,
    text,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

export function buildFollowUpReminderEmailPayload(params: {
  baseUrl: string;
}): EmailPayload {
  const safeBaseUrl = escapeHtml(params.baseUrl);
  const html = `<!doctype html>
<html lang="pl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#F0EDE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111114;">
  <div style="max-width:600px;margin:0 auto;padding:28px 16px 40px;">
    <div style="padding:26px 24px;border-radius:20px;background:#111114;color:#FFFFFF;">
      <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#FF7B5A;">
        SOLARIS 2027 · RABAT POWROTNY -20%
      </p>
      <h1 style="margin:10px 0 10px;font-size:23px;line-height:1.25;color:#FFFFFF;">
        Twój rabat -20% na Pełny Raport Solaris 2027 jest gotowy
      </h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#D4D4DC;">
        Zapisaliśmy Twój adres. Gdy będziesz gotowy/a wrócić po pełną mapę 2027 roku (wszystkie sfery + kalendarz .ics + wersja PDF A4), pełny pakiet kosztuje <strong>35,99 zł</strong> zamiast 44,99 zł.
      </p>
      <a href="${safeBaseUrl}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#FF5C35;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;">
        Wróć do Solaris 2027 →
      </a>
    </div>
    <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#57544D;">
      Otrzymujesz tę wiadomość, ponieważ zapisałeś/aś się w serwisie Solaris 2027. Zgodę możesz wycofać w każdej chwili, pisząc na ${escapeHtml(SELLER_LEGAL_CONFIG.contactEmail)}.
    </p>
  </div>
</body>
</html>`;

  const text = [
    'SOLARIS 2027 — Twój rabat powrotny -20%',
    '',
    'Zapisaliśmy Twój adres. Pełny Raport Solaris 2027 (wszystkie obszary + kalendarz .ics + PDF A4) z rabatem -20% kosztuje 35,99 zł zamiast 44,99 zł.',
    `Wróć do serwisu: ${params.baseUrl}`,
    '',
    `Zgodę na wiadomości e-mail możesz wycofać w każdej chwili: ${SELLER_LEGAL_CONFIG.contactEmail}`,
  ].join('\n');

  return {
    subject: 'Solaris 2027 — Twój rabat powrotny -20% na pełny raport',
    html,
    text,
  };
}

export async function sendEmailViaResend(params: {
  apiKey: string | undefined;
  from: string | undefined;
  to: string;
  replyTo?: string;
  payload: EmailPayload;
}): Promise<SendEmailResult> {
  if (!isResendConfigured(params.apiKey)) {
    return { ok: false, reason: 'not_configured' };
  }

  const recipient = params.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) {
    return { ok: false, reason: 'invalid_recipient', error: 'Nieprawidłowy adres e-mail odbiorcy.' };
  }

  const apiKey = normalizeEnvSecret(params.apiKey);
  const from = resolveEmailFromAddress(params.from);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: params.replyTo || SELLER_LEGAL_CONFIG.contactEmail,
        subject: params.payload.subject,
        html: params.payload.html,
        text: params.payload.text,
        ...(params.payload.attachments && params.payload.attachments.length > 0
          ? { attachments: params.payload.attachments }
          : {}),
      }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.warn(`[Resend email error ${res.status}]:`, data.message || res.statusText);
      return {
        ok: false,
        reason: 'provider_error',
        error: data.message || 'Nie udało się wysłać wiadomości e-mail.',
      };
    }

    return { ok: true, messageId: data.id };
  } catch (err) {
    console.warn('[Resend network error]:', err instanceof Error ? err.message : err);
    return {
      ok: false,
      reason: 'network_error',
      error: 'Chwilowy problem z połączeniem do serwera pocztowego.',
    };
  } finally {
    clearTimeout(timer);
  }
}
