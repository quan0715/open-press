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

export default function TypeSpecimen({
  ariaLabel = "Typography specimen",
  rows,
}: TypeSpecimenProps) {
  return (
    <section className="type-specimen" data-openpress-component="TypeSpecimen" aria-label={ariaLabel}>
      {rows.map((row) => (
        <div className="type-specimen__row" key={row.name}>
          <div className="type-specimen__meta">
            <strong>{row.name}</strong>
            <span>{row.spec}</span>
          </div>
          <p className={`type-specimen__sample type-specimen__sample--${row.sampleVariant}`}>{row.sample}</p>
        </div>
      ))}
    </section>
  );
}
