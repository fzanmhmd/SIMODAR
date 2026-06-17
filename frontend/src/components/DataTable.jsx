import { EmptyState } from "./ui.jsx";

export function DataTable({ columns, rows, empty }) {
  return (
    <div className="smooth-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="overflow-x-auto simodar-scrollbar">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3 font-extrabold">{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map((row, index) => (
              <tr key={row.kode_pengajuan || row.id || row.name || index} className="smooth-table-row align-top">
                {columns.map((column) => <td key={column.key} className="px-4 py-4">{column.render ? column.render(row, index) : row[column.key]}</td>)}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="p-4"><EmptyState>{empty}</EmptyState></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
