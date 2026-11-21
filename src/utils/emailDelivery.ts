import type { SolarisFullReport } from './ephemerisEngine.js';
import {
  getAvailableModulesForMode,
  type ReportModuleId,
} from './solarisPricing.js';
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
  baseUrl?: string;
}): EmailPayload {
  const { report, unlockedModules, calendarUnlocked, confirmation } = params;
  const resolvedBaseUrl = (params.baseUrl || SELLER_LEGAL_CONFIG.domain).replace(/\/+$/, '');

  const uniqueUnlocked = Array.from(new Set(unlockedModules)).filter((id) =>
    Boolean(report.modules[id]),
  );
  const availableModules = getAvailableModulesForMode(report.mode);
  const lockedModules = availableModules.filter((m) => !uniqueUnlocked.includes(m.id));
  const isFullBundle = lockedModules.length === 0;

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

  // Full bundle buyers get full action plans for all 12 months; partial buyers get their 2 highlight months (peak + risk) and teasers for the rest
  const peakMonthIdx = report.monthlyTimeline.reduce(
    (best, curr) => (curr.energy > best.energy ? curr : best),
    report.monthlyTimeline[0],
  )?.monthIndex;
  const riskMonthIdx = report.monthlyTimeline.reduce(
    (worst, curr) => (curr.risk > worst.risk ? curr : worst),
    report.monthlyTimeline[0],
  )?.monthIndex;

  const monthsHtml = report.monthlyTimeline
    .map((m) => {
      const showFullAction =
        isFullBundle || m.monthIndex === peakMonthIdx || m.monthIndex === riskMonthIdx;
      const detailHtml = showFullAction
        ? escapeHtml(m.actionNote)
        : '<span style="color:#6E6B63;">Szczegółowy plan decyzji na ten miesiąc w pełnym pakiecie Solaris 2027.</span>';
      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E1D6;font-weight:600;color:#111114;white-space:nowrap;">${escapeHtml(m.monthFull)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E1D6;font-family:monospace;font-size:12px;color:#3E3C37;white-space:nowrap;">Energia ${m.energy}% · Ryzyko ${m.risk}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E1D6;font-size:13px;line-height:1.5;color:#2B2A26;">
          <strong>${escapeHtml(m.headline)}</strong><br/>${detailHtml}
        </td>
      </tr>
    `;
    })
    .join('\n');

  // Segment-specific conversion block:
  // 1) Partial buyer -> show locked module teasers + 19,99 zł upgrade CTA
  // 2) Full Solo buyer -> Pair mode cross-sell CTA (?tryb=para)
  let conversionBlockHtml = '';
  let conversionBlockText = '';

  if (!isFullBundle) {
    const lockedItemsHtml = lockedModules
      .map((m) => {
        const mod = report.modules[m.id];
        return `
          <li style="margin:0 0 10px;padding:12px 14px;border-radius:12px;background:#1A1A20;border:1px solid #2A2A33;">
            <p style="margin:0;font-family:monospace;font-size:11px;color:#FF8566;">
              ZABLOKOWANE · ${escapeHtml(m.shortTitle)} (${mod.scoreOutOf10}/10)
            </p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#FFFFFF;">
              ${escapeHtml(mod.teaserTitle)}
            </p>
          </li>
        `;
      })
      .join('');

    const calendarExtraLine = !calendarUnlocked
      ? '<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#D8B4FE;">+ W pełnym rozszerzeniu dostajesz także gotowy plik <strong>Kalendarz .ics (12 okien)</strong> do Apple / Google Calendar oraz wersję PDF A4.</p>'
      : '';

    conversionBlockHtml = `
      <div style="margin:0 0 22px;padding:24px;border-radius:20px;background:#111114;color:#FFFFFF;border:2px solid #FF5C35;">
        <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#FF8566;">
          POZOSTAŁE ZABLOKOWANE OBSZARY (${lockedModules.length})
        </p>
        <h2 style="margin:8px 0 10px;font-size:20px;line-height:1.25;color:#FFFFFF;">
          Masz już dostęp do ${uniqueUnlocked.length === 1 ? '1 sfery' : `${uniqueUnlocked.length} sfer`}. Zobacz, czego jeszcze nie widzisz w 2027:
        </h2>
        <ul style="margin:0 0 14px;padding:0;list-style:none;">
          ${lockedItemsHtml}
        </ul>
        ${calendarExtraLine}
        <a href="${escapeHtml(confirmation.reportUrl)}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#FF5C35;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;">
          Odblokuj resztę raportu + .ics za 19,99 zł →
        </a>
        <p style="margin:10px 0 0;font-size:11px;color:#A1A1AA;">
          Jednorazowa dopłata (zamiast kupować każdą sferę osobno). Po opłaceniu pełny raport otworzy się od razu i trafi na Twój e-mail.
        </p>
      </div>
    `;

    conversionBlockText = [
      `ZABLOKOWANE OBSZARY TWOJEGO 2027 (${lockedModules.length}):`,
      ...lockedModules.map((m) => `- ${m.shortTitle} (${report.modules[m.id].scoreOutOf10}/10): ${report.modules[m.id].teaserTitle}`),
      `Dobierz pozostałe obszary + kalendarz .ics za 19,99 zł: ${confirmation.reportUrl}`,
    ].join('\n');
  } else if (report.mode === 'solo') {
    const pairUrl = `${resolvedBaseUrl}/?tryb=para`;
    conversionBlockHtml = `
      <div style="margin:0 0 22px;padding:24px;border-radius:20px;background:#D6D1C4;color:#111114;">
        <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#8C321A;">
          TRYB DLA DWOJGA · ZGODNOŚĆ 2027
        </p>
        <h2 style="margin:8px 0 10px;font-size:20px;line-height:1.25;color:#111114;">
          Znasz już swój 2027. Sprawdź, czy Ty i bliska osoba idziecie w tym samym rytmie
        </h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#383631;">
          Dlaczego w 2027 roku w niektórych relacjach pojawi się kryzys, a inne wejdą na nowy poziom? Zestaw daty urodzenia (para, przyjaciel lub wspólnik) i odbierz bezpłatny indeks zgodności w 2 minuty.
        </p>
        <a href="${escapeHtml(pairUrl)}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#111114;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;">
          Sprawdź matrycę Dla dwojga (0 zł na start) →
        </a>
      </div>
    `;

    conversionBlockText = [
      'TRYB DLA DWOJGA — ZGODNOŚĆ 2027:',
      'Znasz już swój 2027. Sprawdź bezpłatny wynik zgodności z partnerem, przyjacielem lub wspólnikiem w 2 minuty:',
      pairUrl,
    ].join('\n');
  }

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

    ${conversionBlockHtml}

    <div style="margin:0 0 22px;padding:20px;border-radius:16px;background:#FFFFFF;border:1px solid #E5E1D6;">
      <p style="margin:0;font-family:monospace;font-size:11px;text-transform:uppercase;color:#57544D;">
        Oś 12 miesięcy 2027
      </p>
      <h2 style="margin:6px 0 14px;font-size:19px;color:#111114;">
        ${isFullBundle ? 'Twój pełny harmonogram Styczeń – Grudzień 2027' : 'Skrót osi 12 miesięcy 2027 (szczyt i miesiąc ryzyka)'}
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
    .map((m) => {
      const showFullAction =
        isFullBundle || m.monthIndex === peakMonthIdx || m.monthIndex === riskMonthIdx;
      const note = showFullAction
        ? m.actionNote
        : 'Szczegółowy plan decyzji w pełnym pakiecie Solaris 2027.';
      return `- ${m.monthFull} (Energia ${m.energy}% / Ryzyko ${m.risk}%): ${m.headline} — ${note}`;
    })
    .join('\n');

  const text = [
    `SOLARIS 2027 — TWÓJ RAPORT (${confirmation.orderId})`,
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
    ...(conversionBlockText ? ['', conversionBlockText] : []),
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
  personName?: string;
  peakMonthPl?: string;
  riskMonthPl?: string;
  reportUrl?: string;
}): EmailPayload {
  const targetUrl = params.reportUrl || params.baseUrl;
  const safeTargetUrl = escapeHtml(targetUrl);
  const safePersonName = params.personName?.trim() ? escapeHtml(params.personName.trim()) : '';
  const safePeak = params.peakMonthPl?.trim() ? escapeHtml(params.peakMonthPl.trim()) : '';
  const safeRisk = params.riskMonthPl?.trim() ? escapeHtml(params.riskMonthPl.trim()) : '';
  const hasPersonalizedHook = Boolean(safeRisk);

  const headline = hasPersonalizedHook
    ? `${safePersonName ? `${safePersonName}, ` : ''}Twój miesiąc napięć w 2027 to ${safeRisk} — sprawdź plan z rabatem -20%`
    : 'Twój rabat -20% na Pełny Raport Solaris 2027 jest gotowy';

  const personalizedBoxHtml = hasPersonalizedHook
    ? `
      <div style="margin:0 0 18px;padding:14px 16px;border-radius:14px;background:#1A1A20;border:1px solid #2A2A33;">
        ${
          safePeak
            ? `<p style="margin:0 0 6px;font-size:13px;color:#4ADE80;"><strong>Okno wzrostu 2027:</strong> ${safePeak}</p>`
            : ''
        }
        <p style="margin:0;font-size:13px;color:#FF8566;">
          <strong>Miesiąc podwyższonego tarcia:</strong> ${safeRisk} — w pełnym raporcie masz dokładne daty, czego nie podpisywać w ciemno oraz 3 kroki na 2027.
        </p>
      </div>
    `
    : '';

  const html = `<!doctype html>
<html lang="pl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#F0EDE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111114;">
  <div style="max-width:600px;margin:0 auto;padding:28px 16px 40px;">
    <div style="padding:26px 24px;border-radius:20px;background:#111114;color:#FFFFFF;">
      <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#FF7B5A;">
        SOLARIS 2027 · RABAT POWROTNY -20%
      </p>
      <h1 style="margin:10px 0 12px;font-size:23px;line-height:1.25;color:#FFFFFF;">
        ${headline}
      </h1>
      ${personalizedBoxHtml}
      <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#D4D4DC;">
        Zapisaliśmy Twój skrót. Gdy wrócisz po pełny raport 2027 (wszystkie sfery + kalendarz .ics do telefonu + PDF A4), pełny pakiet kosztuje <strong>35,99 zł</strong> zamiast 44,99 zł. Możesz też zacząć od 1 wybranej sfery za 14,99 zł.
      </p>
      <a href="${safeTargetUrl}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#FF5C35;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;">
        Wróć do raportu z rabatem -20% →
      </a>
    </div>
    <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#57544D;">
      Otrzymujesz tę wiadomość, ponieważ zapisałeś/aś się w serwisie Solaris 2027. Zgodę możesz wycofać w każdej chwili, pisząc na ${escapeHtml(SELLER_LEGAL_CONFIG.contactEmail)}.
    </p>
  </div>
</body>
</html>`;

  const text = [
    hasPersonalizedHook
      ? `SOLARIS 2027 — Twój miesiąc napięć (${params.riskMonthPl}) + rabat -20%`
      : 'SOLARIS 2027 — Twój rabat powrotny -20%',
    '',
    ...(params.peakMonthPl ? [`Okno wzrostu 2027: ${params.peakMonthPl}`] : []),
    ...(params.riskMonthPl ? [`Miesiąc podwyższonego tarcia: ${params.riskMonthPl}`] : []),
    'Pełny Raport Solaris 2027 (wszystkie obszary + kalendarz .ics + PDF A4) z rabatem -20% kosztuje 35,99 zł zamiast 44,99 zł.',
    `Wróć do raportu: ${targetUrl}`,
    '',
    `Zgodę na wiadomości e-mail możesz wycofać w każdej chwili: ${SELLER_LEGAL_CONFIG.contactEmail}`,
  ].join('\n');

  return {
    subject: hasPersonalizedHook
      ? `Solaris 2027 — Twój miesiąc napięć (${params.riskMonthPl}) + rabat -20%`
      : 'Solaris 2027 — Twój rabat powrotny -20% na pełny raport',
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
