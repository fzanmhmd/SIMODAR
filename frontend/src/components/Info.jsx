export function Info({ label, value, wide }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value || "-"}</dd>
    </div>
  );
}
