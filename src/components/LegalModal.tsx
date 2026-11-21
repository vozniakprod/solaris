import { ExternalLink, X } from 'lucide-react';
import { LEGAL_DOCUMENTS, type LegalDocId } from '../data/legalDocuments';

interface LegalModalProps {
  doc: LegalDocId | null;
  onClose: () => void;
}

export function LegalModal({ doc, onClose }: LegalModalProps) {
  if (!doc) return null;
  const documentData = LEGAL_DOCUMENTS[doc];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={documentData.title}
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-white/[0.12] bg-[#141418] p-5 text-white sm:rounded-[28px] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              {documentData.title}
            </h2>
            <p className="mt-1 font-mono text-[11px] text-[#9A9AA3]">
              Obowiązuje od: {documentData.effectiveDate} · Wersja {documentData.version}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij dokument"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white hover:bg-white/[0.12]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-xs leading-relaxed text-[#D4D4DC]">
          {documentData.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h3 className="font-display text-sm font-semibold text-white">
                {section.heading}
              </h3>

              {section.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}

              {section.bullets && (
                <ul className="list-disc space-y-1.5 pl-5 text-[#C4C4CE]">
                  {section.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}

              {section.table && (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="bg-white/[0.05] text-white">
                        {section.table.headers.map((h) => (
                          <th
                            key={h}
                            className="border border-white/[0.1] px-2.5 py-2 font-semibold"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="border border-white/[0.08] px-2.5 py-2 align-top text-[#C4C4CE]"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-xs">
          <a
            href={documentData.path}
            className="inline-flex items-center gap-1.5 font-medium text-[#FF7B5A] underline underline-offset-4 hover:text-white"
          >
            <span>Otwórz pełną wersję do wydruku ({documentData.path})</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[38px] items-center justify-center rounded-full bg-white/10 px-4 py-1.5 font-medium text-white hover:bg-white/20"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
