export type TypeSpecimenVariant =
  | "metric"
  | "cover-title"
  | "chapter-title"
  | "section-title"
  | "body"
  | "caption";

export interface TypeSpecimenRow {
  name: string;
  spec: string;
  sample: string;
  sampleVariant: TypeSpecimenVariant;
}

export interface TypeSpecimenProps {
  ariaLabel?: string;
  rows: TypeSpecimenRow[];
}

const SPECIMEN_CLASS =
  "my-[var(--openpress-space-3)] mb-[var(--openpress-space-4)] break-inside-avoid border-t border-[var(--openpress-color-line)]";
const ROW_CLASS =
  "grid min-h-[20mm] grid-cols-[minmax(30mm,38mm)_minmax(0,1fr)] items-center gap-[var(--openpress-space-3)] border-b border-[var(--openpress-color-line)] py-[3mm]";
const META_NAME_CLASS =
  "block !text-[8.8pt] !font-semibold !leading-[1.35] !tracking-normal !text-[var(--openpress-color-ink)]";
const META_SPEC_CLASS =
  "mt-[1mm] block text-[8pt] leading-[1.45] tracking-normal text-[var(--openpress-color-muted)] [font-variant-numeric:tabular-nums]";
const SAMPLE_BASE_CLASS =
  "!m-0 text-center !text-[var(--openpress-color-ink)] [overflow-wrap:anywhere]";
const SAMPLE_CLASS_BY_VARIANT: Record<TypeSpecimenVariant, string> = {
  metric:
    `${SAMPLE_BASE_CLASS} !text-[34pt] !font-bold !leading-none !tracking-normal [font-family:var(--openpress-font-body)] [font-variant-numeric:tabular-nums]`,
  "cover-title":
    `${SAMPLE_BASE_CLASS} !text-[30pt] !font-light !leading-[1.05] !tracking-[0.01em] [font-family:var(--openpress-font-serif)]`,
  "chapter-title":
    `${SAMPLE_BASE_CLASS} !text-[17pt] !font-light !leading-[1.35] !tracking-[0.04em] [font-family:var(--openpress-font-serif)]`,
  "section-title":
    `${SAMPLE_BASE_CLASS} !text-[13pt] !font-normal !leading-[1.45] !tracking-[0.03em] [font-family:var(--openpress-font-serif)]`,
  body:
    `${SAMPLE_BASE_CLASS} !mx-auto max-w-[112mm] !text-[10pt] !font-normal !leading-[1.75] !tracking-normal [font-family:var(--openpress-font-body)]`,
  caption:
    `${SAMPLE_BASE_CLASS} !text-[8pt] !font-normal !leading-[1.5] !tracking-[0.02em] !text-[var(--openpress-color-muted)] [font-family:var(--openpress-font-body)]`,
};

export default function TypeSpecimen({
  ariaLabel = "Typography specimen",
  rows,
}: TypeSpecimenProps) {
  return (
    <section className={SPECIMEN_CLASS} data-openpress-component="TypeSpecimen" aria-label={ariaLabel}>
      {rows.map((row) => (
        <div className={ROW_CLASS} key={row.name}>
          <div>
            <strong className={META_NAME_CLASS}>{row.name}</strong>
            <span className={META_SPEC_CLASS}>{row.spec}</span>
          </div>
          <p className={SAMPLE_CLASS_BY_VARIANT[row.sampleVariant]}>{row.sample}</p>
        </div>
      ))}
    </section>
  );
}
