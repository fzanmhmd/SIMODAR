import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, KeyRound, Instagram, Mail } from "lucide-react";
import { Button } from "../components/ui.jsx";
import { WhatsAppIcon, BloodBagIcon, ProgressIcon } from "../components/Icons.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { monthKey, formatDate, formatMonthLabel } from "../utils/formatters.js";

export default function Landing() {
  const navigate = useNavigate();
  const { data } = useApiData("/public/summary", []);
  const publicInfo = data?.info || {};
  const todayRunning = publicInfo.todayRunning || [];
  const lastMonthHistory = publicInfo.lastMonthHistory || { totalActivities: 0, bloodBags: 0, totalLocations: 0 };
  const monthSchedules = publicInfo.monthSchedules || [];
  const currentMonthLabel = formatMonthLabel(monthKey());

  return (
    <main className="relative min-h-dvh md:h-dvh md:overflow-hidden bg-[#fafafa] flex flex-col z-0">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.15)_0%,transparent_60%)] rounded-full animate-blob"></div>
        <div className="absolute top-[10%] right-[-20%] w-[900px] h-[900px] bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.12)_0%,transparent_60%)] rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-30%] left-[10%] w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.15)_0%,transparent_60%)] rounded-full animate-blob animation-delay-4000"></div>
      </div>

      {/* Top Section: Hero & Buttons */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
        <img src="/img/Simodar-logo.png" alt="SIMODAR" className="mx-auto h-20 w-auto object-contain md:h-28" />
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">SIMODAR</h1>
        <p className="mt-3 text-center text-base font-semibold text-slate-700 md:text-lg">Sistem Informasi Mobile Unit Donor Darah</p>
        <p className="mt-1 text-center text-sm text-slate-500">Setetes darah anda, Sejuta Harapan Mereka.</p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button type="button" className="min-h-12 shadow-lg shadow-rose-200/50 px-6 text-base" onClick={() => navigate("/pengajuan")}>
            Ajukan Kegiatan <ArrowRight size={18} className="ml-1" />
          </Button>
          <Button type="button" variant="soft" className="min-h-12 bg-white px-6 text-base" onClick={() => navigate("/cek-pengajuan")}>
            Cek Status Pengajuan
          </Button>
          <Button type="button" variant="outline" className="min-h-12 px-6 text-base" onClick={() => navigate("/login")}>
            <KeyRound size={18} className="mr-2" /> Login Petugas
          </Button>
        </div>
      </div>

      {/* Bottom Section: Info Cards */}
      <div className="w-full max-w-6xl mx-auto p-4 lg:p-6 grid gap-4 grid-cols-1 lg:grid-cols-4 shrink-0 h-auto md:h-[45dvh] lg:h-[40dvh] mb-8 md:mb-0">
        
        {/* Jadwal Bulan Ini (Made Larger, Span 2 Columns) */}
        <div className="flex flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/40 backdrop-blur-lg p-4 md:p-5 shadow-2xl shadow-rose-900/15 lg:col-span-2 order-3 lg:order-1 h-[400px] md:h-auto">
          <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">Jadwal Bulan Ini</p>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-simodar-red">{currentMonthLabel}</span>
              </div>
              <strong className="mt-2 block text-3xl font-extrabold text-slate-950">{monthSchedules.length} Kegiatan</strong>
            </div>
            <span className="rounded-full bg-rose-100 p-3 text-simodar-red"><CalendarDays size={24} /></span>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 simodar-scrollbar transform-gpu">
            <div className="grid gap-2">
              {monthSchedules.length ? monthSchedules.map((item, index) => (
                <div key={item.kode_pengajuan} className="rounded-2xl bg-white/80 p-3.5 shadow-sm border border-slate-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-extrabold text-simodar-red">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <b className="block text-sm text-slate-800 break-words leading-tight">{item.instansi}</b>
                      <span className="block text-[10px] leading-relaxed font-semibold text-slate-500 mt-1 break-words line-clamp-2">{item.lokasi}</span>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 sm:gap-0 pl-10 sm:pl-0 shrink-0">
                    <time className="text-xs font-extrabold text-simodar-red">{formatDate(item.tanggal)}</time>
                    <span className="text-[11px] font-bold text-slate-600">{item.peserta || 0} pendonor</span>
                  </div>
                </div>
              )) : (
                <p className="rounded-2xl bg-white/60 px-4 py-4 text-center text-sm font-semibold text-slate-500 border border-dashed border-slate-200">Belum ada jadwal bulan ini.</p>
              )}
            </div>
          </div>
        </div>

        {/* Kegiatan Hari Ini (Span 1 Column) */}
        <div className="flex flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/40 backdrop-blur-lg p-4 md:p-5 shadow-2xl shadow-rose-900/15 lg:col-span-1 order-1 lg:order-2 h-[300px] md:h-auto">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">Hari Ini</p>
              </div>
              <strong className="mt-2 block text-4xl font-extrabold text-simodar-deep">{todayRunning.length}</strong>
            </div>
            <span className="rounded-full bg-rose-100 p-3 text-simodar-red"><ProgressIcon size={24} /></span>
          </div>
          <div className="mt-5 flex-1 overflow-y-auto pr-1 simodar-scrollbar bg-white/40 rounded-2xl p-1 transform-gpu">
            {todayRunning.length ? todayRunning.map((item) => (
              <div key={item.kode_pengajuan} className="flex flex-col gap-1.5 border-b border-white/60 px-2 py-2.5 last:border-0">
                <b className="block min-w-0 truncate text-xs text-slate-800">{item.instansi}</b>
                <span className={`self-start rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                  String(item.runtime_status || item.status).toLowerCase().includes("selesai")
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {item.runtime_status || item.status}
                </span>
              </div>
            )) : (
              <p className="px-2 py-4 text-center text-xs font-semibold text-slate-500">Kosong.</p>
            )}
          </div>
        </div>

        {/* Histori Bulan Lalu */}
        <div className="flex flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/40 backdrop-blur-lg p-4 md:p-5 shadow-2xl shadow-rose-900/15 lg:col-span-1 order-2 lg:order-3 h-auto md:h-auto">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">Bulan Lalu</p>
              <strong className="mt-2 block text-4xl font-extrabold text-simodar-deep">{lastMonthHistory.bloodBags}</strong>
              <p className="text-xs font-bold text-slate-400 mt-1">Kantong Darah</p>
            </div>
            <span className="rounded-full bg-rose-100 p-3 text-simodar-red"><BloodBagIcon size={24} /></span>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
            <div className="rounded-2xl bg-white/80 p-3 border border-slate-100/50">
              <b className="block text-2xl text-slate-900">{lastMonthHistory.totalActivities}</b>
              <span className="text-[11px] font-semibold text-slate-500">Kegiatan</span>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 border border-slate-100/50">
              <b className="block text-2xl text-slate-900">{lastMonthHistory.totalLocations}</b>
              <span className="text-[11px] font-semibold text-slate-500">Lokasi</span>
            </div>
          </div>
        </div>

      </div>

      <footer className="shrink-0 p-4 pb-6 text-center z-10 relative">
        <div className="flex items-center justify-center gap-4">
          <a className="text-slate-400 hover:text-simodar-red transition-colors" href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <Instagram size={18} />
          </a>
          <a className="text-slate-400 hover:text-simodar-red transition-colors" href="https://wa.me/6281214021000" target="_blank" rel="noreferrer" aria-label="WhatsApp">
            <WhatsAppIcon size={19} />
          </a>
          <a className="text-slate-400 hover:text-simodar-red transition-colors" href="mailto:fauzan@simodar.id" aria-label="Email">
            <Mail size={18} />
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold text-slate-400/80 uppercase tracking-wider">
          <span>Designed & Developed by MFauzan</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span>© Copyright 2026</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span>V 1.0.1</span>
        </div>
      </footer>
    </main>
  );
}
