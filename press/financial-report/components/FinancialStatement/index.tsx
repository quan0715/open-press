import { financialReportData } from "../../data.mjs";

type StatementKind = "highlights" | "operations" | "position" | "cash-flow";

const format = (value: number) => value.toLocaleString("en-US");

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-t border-[var(--op-theme-color-ink)] pt-[3mm]">
      <p className="m-0 [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.14em] text-[var(--op-theme-color-muted)]">{label}</p>
      <p className="mb-0 mt-[2mm] [font-family:var(--op-theme-type-title-font-family)] text-[24pt] leading-none">{value}</p>
      {note ? <p className="mb-0 mt-[2mm] text-[7.5pt] text-[var(--op-theme-color-muted)]">{note}</p> : null}
    </div>
  );
}

function Statement({ rows, total }: { rows: Array<[string, number]>; total: [string, number] }) {
  return (
    <div className="mt-[6mm] border-t-2 border-[var(--op-theme-color-ink)] [font-variant-numeric:tabular-nums]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[1fr_auto] border-b border-[var(--op-theme-color-line)] py-[3mm] text-[9pt]">
          <span>{label}</span><span>{format(value)}</span>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_auto] border-b-2 border-[var(--op-theme-color-ink)] py-[3.5mm] text-[10pt] font-bold">
        <span>{total[0]}</span><span>{format(total[1])}</span>
      </div>
    </div>
  );
}

export default function FinancialStatement({ kind }: { kind: StatementKind }) {
  if (kind === "highlights") {
    return (
      <div className="my-[7mm] grid grid-cols-2 gap-x-[8mm] gap-y-[7mm]">
        <Metric label="Revenue" value={format(financialReportData.revenue)} note={financialReportData.currency} />
        <Metric label="Gross profit" value={format(financialReportData.grossProfit)} note="56.0% sample margin" />
        <Metric label="Operating income" value={format(financialReportData.operatingIncome)} note="16.9% sample margin" />
        <Metric label="Closing cash" value={format(financialReportData.cashFlow.closingCash)} note={financialReportData.currency} />
      </div>
    );
  }
  if (kind === "operations") {
    return <Statement rows={[["Revenue", financialReportData.revenue], ["Cost of revenue", -financialReportData.costOfRevenue], ["Gross profit", financialReportData.grossProfit], ["Operating expenses", -financialReportData.operatingExpenses]]} total={["Operating income", financialReportData.operatingIncome]} />;
  }
  if (kind === "position") {
    return <Statement rows={[["Total assets", financialReportData.assets], ["Total liabilities", financialReportData.liabilities]]} total={["Total equity", financialReportData.equity]} />;
  }
  return <Statement rows={[["Opening cash", financialReportData.cashFlow.openingCash], ["Net change in cash", financialReportData.cashFlow.netChange]]} total={["Closing cash", financialReportData.cashFlow.closingCash]} />;
}
