import { Field, Input } from "./ui.jsx";

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="smooth-card mb-5 flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft md:flex-row md:items-center">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.22em] text-simodar-red">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function MonthFilter({ month, setMonth }) {
  return (
    <Field label="Filter Bulan">
      <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
    </Field>
  );
}
