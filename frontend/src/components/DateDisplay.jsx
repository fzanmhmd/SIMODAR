import {
  formatDate,
  formatClock,
  formatDateTime,
  formatLongDate,
  activityDateText,
} from "../utils/formatters.js";

export function latestUpdate(row) {
  return (
    row?.history_updated_at ||
    row?.updated_at ||
    row?.completed_at ||
    row?.finished_at ||
    row?.assigned_at ||
    row?.approved_at ||
    row?.created_at ||
    row?.tanggal_pengajuan
  );
}

export function ApprovalSubmissionDate({ row }) {
  const value = row.tanggal_pengajuan || row.created_at;
  return (
    <div className="min-w-[150px] leading-snug">
      <p className="text-xs font-extrabold text-slate-700">{formatLongDate(value)}</p>
      <p className="mt-1 text-[11px] font-bold text-slate-400">{formatClock(value)}</p>
    </div>
  );
}

export function ApprovalAccDate({ row }) {
  const value = row.approved_at || row.updated_at || row.tanggal_pengajuan || row.created_at;
  return (
    <div className="min-w-[150px] leading-snug">
      <p className="text-xs font-extrabold text-slate-700">{formatLongDate(value)}</p>
      <p className="mt-1 text-[11px] font-bold text-slate-400">{formatClock(value)}</p>
    </div>
  );
}

export function ApprovalActivityDate({ row }) {
  const time = [row?.jam_mulai, row?.jam_selesai].filter(Boolean).join(" - ");
  return (
    <div className="min-w-[150px] leading-snug">
      <p className="text-xs font-extrabold text-slate-700">{formatLongDate(row.tanggal)}</p>
      {time && <p className="mt-1 text-[11px] font-bold text-slate-400">{time}</p>}
    </div>
  );
}

export function DateStack({ rows }) {
  const visibleRows = rows.filter((row) => row.value);
  if (!visibleRows.length) return <span className="text-slate-400">-</span>;

  return (
    <dl className="grid min-w-[190px] gap-1 text-xs leading-snug">
      {visibleRows.map((row) => (
        <div key={row.label} className="grid gap-0.5">
          <dt className="font-extrabold uppercase tracking-wide text-slate-400">{row.label}</dt>
          <dd className="font-bold text-slate-700">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WorkflowDates({ row }) {
  return (
    <DateStack
      rows={[
        { label: "Pengajuan", value: formatDateTime(row.tanggal_pengajuan || row.created_at) },
        { label: "Kegiatan", value: activityDateText(row) },
        { label: "Update Data", value: formatDateTime(latestUpdate(row)) },
      ]}
    />
  );
}

export function ScheduleUpdateDate({ row }) {
  const value = latestUpdate(row);
  return (
    <div className="min-w-[140px] leading-snug">
      <p className="text-xs font-extrabold text-slate-700">{formatLongDate(value)}</p>
      <p className="mt-1 text-[11px] font-bold text-slate-400">{formatClock(value)}</p>
    </div>
  );
}

export function EntityDates({ row }) {
  return (
    <DateStack
      rows={[
        { label: "Dibuat", value: formatDateTime(row.created_at) },
        { label: "Update Data", value: formatDateTime(row.updated_at) },
      ]}
    />
  );
}
