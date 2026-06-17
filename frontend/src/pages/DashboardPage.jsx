import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "../components/ui.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { readSeenApprovals, approvalCodes } from "../utils/approvalStore.js";

export default function DashboardPage() {
  const { data, loading, reload } = useApiData("/admin/overview", []);
  const [seenApprovals, setSeenApprovals] = useState(() => readSeenApprovals());
  const snapshot = data?.data;

  useEffect(() => {
    const timer = window.setInterval(() => reload({ silent: true }), 8000);
    return () => window.clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    const syncSeenApprovals = () => setSeenApprovals(readSeenApprovals());
    window.addEventListener("storage", syncSeenApprovals);
    window.addEventListener("simodar:approval-seen", syncSeenApprovals);
    return () => {
      window.removeEventListener("storage", syncSeenApprovals);
      window.removeEventListener("simodar:approval-seen", syncSeenApprovals);
    };
  }, []);

  if (loading || !snapshot) return <LoadingPanel />;
  const unseenApprovalCount = approvalCodes(snapshot.approvals).filter((code) => !seenApprovals.includes(code)).length;
  return (
    <>
      <PageHeader eyebrow="Dashboard" title="Beranda SIMODAR" subtitle="Ringkasan workflow kegiatan mobile unit donor darah." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.cards.map((card) => (
          <Link key={card.key} to={card.href} className="group relative rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_18px_45px_rgba(190,18,60,.10)]">
            {card.key === "approvals" && unseenApprovalCount > 0 && (
              <span className="absolute right-4 top-4 rounded-full bg-simodar-red px-2.5 py-1 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(190,18,60,.22)]">
                +{unseenApprovalCount}
              </span>
            )}
            <p className="text-sm font-bold text-slate-500">{card.label}</p>
            <strong className="mt-2 block text-4xl font-extrabold text-slate-950">{card.value}</strong>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold text-simodar-red transition-all duration-300 group-hover:bg-rose-50 group-hover:text-simodar-deep">
              Lihat detail <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
      <Card className="mt-5 p-5">
        <h2 className="font-display text-xl font-extrabold text-slate-900">Kegiatan Hari Ini</h2>
        <div className="mt-4 grid gap-3">
          {snapshot.todayRunning.length ? snapshot.todayRunning.map((item) => <ActivityRow key={item.kode_pengajuan} item={item} />) : <EmptyState>Tidak ada kegiatan mobile unit berjalan hari ini.</EmptyState>}
        </div>
      </Card>
    </>
  );
}

function ActivityRow({ item }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center">
      <div>
        <p className="font-bold text-slate-900">{item.instansi}</p>
        <p className="text-xs font-semibold text-slate-400">{item.kode_pengajuan}</p>
      </div>
      <StatusBadge>{item.runtime_status || item.status}</StatusBadge>
    </div>
  );
}
