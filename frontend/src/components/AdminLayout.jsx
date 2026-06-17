import { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { LogOut, Menu, Plus, Search, XCircle } from "lucide-react";
import { Button } from "./ui.jsx";
import { getToken } from "../api.js";
import { useClock } from "../hooks/useClock.js";
import { adminMenus } from "../utils/helpers.js";

export function LoaderAnimation({ compact = false }) {
  return (
    <div className={`route-loader-card ${compact ? "route-loader-card-compact" : ""}`}>
      <div className="loader-road" />
      <img src="/img/Simodar-logo.png" alt="SIMODAR" className="loader-car" />
    </div>
  );
}

export function RouteLoader({ show }) {
  if (!show) return null;
  return (
    <div className="route-loader" aria-label="Memuat halaman" role="status">
      <LoaderAnimation />
    </div>
  );
}

export function AuthGate({ user, authReady, children }) {
  if (!getToken()) return <Navigate to="/" replace />;
  if (!authReady) return <LoadingPanel />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export function LoadingPanel() {
  return (
    <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white p-6 text-center font-bold text-slate-500 shadow-soft">
      <LoaderAnimation compact />
      <span className="mt-3 text-sm">Memuat data SIMODAR...</span>
    </div>
  );
}

export function AdminLayout({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { greeting, text } = useClock();
  const navigate = useNavigate();

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside
        className={`admin-sidebar-scroll fixed inset-y-0 left-0 z-40 h-dvh w-[290px] overflow-y-auto overscroll-contain border-r border-slate-200 bg-white p-5 shadow-soft transition-transform duration-300 ease-out simodar-scrollbar lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <img src="/img/Simodar-logo.png" alt="SIMODAR" className="h-16 w-auto object-contain" />
            <h1 className="mt-3 font-display text-2xl font-extrabold text-simodar-red">SIMODAR</h1>
            <p className="text-sm font-semibold text-slate-500">Sistem Informasi Mobile Unit Donor Darah</p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-extrabold text-slate-900">{greeting}, {user?.name || user?.username}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{text}</p>
            </div>
          </div>
          <button className="lg:hidden" type="button" onClick={() => setOpen(false)}><XCircle /></button>
        </div>

        <nav className="mt-7 grid gap-5">
          {adminMenus.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-extrabold uppercase tracking-[.2em] text-slate-400">{group.title}</p>
              <div className="grid gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-300 hover:translate-x-1 ${active ? "bg-simodar-red text-white shadow-[0_12px_28px_rgba(186,18,27,.16)]" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:translate-x-1 hover:bg-slate-100" type="button" onClick={onLogout}>
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </aside>
      {open && <button type="button" className="modal-backdrop fixed inset-0 z-30 bg-slate-900/20 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu" />}
      <main className="admin-content-scroll h-dvh min-w-0 overflow-y-auto overscroll-contain p-4 simodar-scrollbar md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="sticky top-0 z-20 mb-5 flex items-center justify-between gap-3 rounded-2xl bg-slate-50/90 py-2 backdrop-blur lg:static lg:rounded-none lg:bg-transparent lg:py-0 lg:backdrop-blur-0">
            <Button type="button" variant="soft" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu size={18} />
            </Button>
            <div />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="soft" onClick={() => navigate("/cek-pengajuan?from=admin")}>
                <Search size={17} /> Cek Status
              </Button>
              <Button type="button" onClick={() => navigate("/pengajuan?from=admin")}>
                <Plus size={18} /> Tambah Pengajuan
              </Button>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
