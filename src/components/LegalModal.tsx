import { X } from 'lucide-react';

interface LegalModalProps {
  doc: 'regulamin' | 'polityka' | null;
  onClose: () => void;
}

export function LegalModal({ doc, onClose }: LegalModalProps) {
  if (!doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={doc === 'regulamin' ? 'Regulamin serwisu Solaris 2027' : 'Polityka prywatności'}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-white/[0.12] bg-[#141418] p-5 text-white sm:rounded-[28px] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <h2 className="font-display text-xl font-semibold text-white">
            {doc === 'regulamin' ? 'Regulamin — Solaris 2027' : 'Polityka prywatności (RODO)'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij dokument"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white hover:bg-white/[0.12]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {doc === 'regulamin' ? (
          <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#C4C4CE]">
            <p>
              <strong className="text-white">1. Charakter usługi:</strong> Serwis Solaris 2027 dostarcza cyfrowe opracowania analityczne o charakterze informacyjno-rozrywkowym oparte na efemerydach astronomicznych (Solariusz 2027) oraz kwestionariuszu preferencji. Raporty nie stanowią porady finansowej, inwestycyjnej, prawnej, psychologicznej ani medycznej.
            </p>
            <p>
              <strong className="text-white">2. Dostarczanie treści cyfrowych i prawo odstąpienia:</strong> Zgodnie z art. 38 ust. 1 pkt 13 Ustawy z dnia 30 maja 2014 r. o prawach konsumenta, prawo odstąpienia od umowy zawartej na odległość nie przysługuje konsumentowi w odniesieniu do umów o dostarczanie treści cyfrowych niedostarczanych na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną zgodą konsumenta przed upływem terminu do odstąpienia od umowy.
            </p>
            <p>
              <strong className="text-white">3. Płatności i reklamacje:</strong> Płatności realizowane są jednorazowo w PLN (bez ukrytych subskrypcji). Reklamacje techniczne można zgłaszać pod adresem kontakt@solaris2027.pl — rozpatrujemy je w terminie do 14 dni kalendarzowych.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#C4C4CE]">
            <p>
              <strong className="text-white">1. Zakres przetwarzanych danych:</strong> Przetwarzamy wyłącznie dane niezbędne do wygenerowania matrycy 2027 (imię, data, godzina i miasto urodzenia oraz odpowiedzi w krótkim kwestionariuszu), a w przypadku dobrowolnego zapisu — adres e-mail do przesłania skrótu raportu i przypomnienia.
            </p>
            <p>
              <strong className="text-white">2. Czas przechowywania:</strong> Sesje raportowe przechowywane są maksymalnie przez 90 dni, po czym podlegają automatycznemu usunięciu.
            </p>
            <p>
              <strong className="text-white">3. Twoje prawa:</strong> Masz prawo dostępu do danych, ich sprostowania, usunięcia oraz wycofania zgody na kontakt e-mail w dowolnym momencie, pisząc na kontakt@solaris2027.pl.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
