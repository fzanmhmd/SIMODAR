import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Github,
  Home,
  Instagram,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Eye,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { api, downloadFile, getToken, setToken } from "./api.js";
import { Button, Card, EmptyState, Field, Input, Modal, Select, StatusBadge, Textarea } from "./components/ui.jsx";
import LocationPicker from "./components/LocationPicker.jsx";

const adminMenus = [
  { title: "Dashboard", items: [{ path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Kegiatan",
    items: [
      { path: "/admin/approval-pengajuan", label: "Approval Pengajuan", icon: FileCheck2 },
      { path: "/admin/penugasan-petugas", label: "Penugasan Petugas", icon: UsersRound },
      { path: "/admin/jadwal-kegiatan", label: "Jadwal Kegiatan", icon: CalendarDays },
      { path: "/admin/hasil-kegiatan", label: "Hasil Kegiatan", icon: CheckCircle2 },
      { path: "/admin/histori-kegiatan", label: "Histori Kegiatan", icon: Clock3 },
    ],
  },
  {
    title: "Master Petugas",
    items: [
      { path: "/admin/data-petugas", label: "Data Petugas", icon: UserRound },
      { path: "/admin/histori-petugas", label: "Histori Petugas", icon: Activity },
    ],
  },
  {
    title: "Master Lokasi",
    items: [
      { path: "/admin/data-lokasi", label: "Data Lokasi", icon: MapPin },
      { path: "/admin/kegiatan-lokasi", label: "Kegiatan Lokasi", icon: CalendarDays },
    ],
  },
];

const roleOptions = ["dokter", "hb", "aftap", "admin", "driver", "other"];
const logistikOptions = ["listrik", "kursi", "meja", "ruang_tunggu", "parkir", "konsumsi"];

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatClock(value) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value).slice(11, 19);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const clock = formatClock(value);
  return `${formatDate(value)}${clock ? `, ${clock}` : ""}`;
}

function formatMonthLabel(value) {
  if (!value) return "-";
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function activityDateText(row) {
  const date = formatDate(row?.tanggal);
  const time = [row?.jam_mulai, row?.jam_selesai].filter(Boolean).join(" - ");
  return time ? `${date}, ${time}` : date;
}

function latestUpdate(row) {
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

function DateStack({ rows }) {
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

function WorkflowDates({ row }) {
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

function EntityDates({ row }) {
  return (
    <DateStack
      rows={[
        { label: "Dibuat", value: formatDateTime(row.created_at) },
        { label: "Update Data", value: formatDateTime(row.updated_at) },
      ]}
    />
  );
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const greeting = now.getHours() < 11 ? "SELAMAT PAGI" : now.getHours() < 15 ? "SELAMAT SIANG" : now.getHours() < 18 ? "SELAMAT SORE" : "SELAMAT MALAM";
  const text = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  return { greeting, text };
}

function useApiData(path, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const reload = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      setState({ loading: false, data: await api(path), error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  };
  useEffect(() => {
    reload();
  }, deps);
  return { ...state, reload };
}

function useToast() {
  const [toast, setToast] = useState("");
  const show = (message) => setToast(message);
  return { toast, show, clear: () => setToast("") };
}

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <button
      type="button"
      onClick={onClose}
      className="toast-pop fixed left-1/2 top-4 z-[70] max-w-[calc(100vw-24px)] rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-soft"
    >
      {message}
    </button>
  );
}

function ConfirmModal({ confirm, onClose }) {
  if (!confirm) return null;
  return (
    <Modal open title="Konfirmasi Aksi" description={confirm.message} onClose={onClose} size="sm">
      <div className="flex justify-end gap-2">
        <Button variant="soft" type="button" onClick={onClose}>
          Batal
        </Button>
        <Button type="button" onClick={confirm.onAccept}>
          Lanjutkan
        </Button>
      </div>
    </Modal>
  );
}

function RouteLoader({ show }) {
  if (!show) return null;
  return (
    <div className="route-loader" aria-label="Memuat halaman" role="status">
      <div className="route-loader-card">
        <div className="loader-road" />
        <img src="/img/Simodar-logo.png" alt="SIMODAR" className="loader-car" />
      </div>
    </div>
  );
}

function AuthGate({ user, authReady, children }) {
  if (!getToken()) return <Navigate to="/" replace />;
  if (!authReady) return <LoadingPanel />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function Landing({ onLogin, toast }) {
  const navigate = useNavigate();
  const [login, setLogin] = useState({ username: "", password: "" });
  const [supportOpen, setSupportOpen] = useState(false);
  const { data } = useApiData("/public/summary", []);
  const publicInfo = data?.info || {};
  const todayRunning = publicInfo.todayRunning || [];
  const lastMonthHistory = publicInfo.lastMonthHistory || { totalActivities: 0, bloodBags: 0, totalLocations: 0 };
  const monthSchedules = publicInfo.monthSchedules || [];

  async function submitLogin(event) {
    event.preventDefault();
    try {
      const result = await api("/auth/login", { method: "POST", body: login });
      setToken(result.token);
      onLogin(result.user);
      navigate("/admin/dashboard");
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:grid md:place-items-center md:p-4">
      <section className="grid w-full max-w-6xl gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-[1.08fr_.92fr] md:p-5">
        <div className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-white via-rose-50 to-slate-50 p-5">
          <div>
            <img src="/img/Simodar-logo.png" alt="SIMODAR" className="h-24 w-auto object-contain md:h-32" />
            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">SIMODAR</h1>
            <p className="mt-2 max-w-xl text-base font-semibold text-slate-700 md:text-lg">Sistem Informasi Mobile Unit Donor Darah</p>
            <p className="mt-1 text-sm text-slate-500 md:text-base">Setetes darah anda, Sejuta Harapan Mereka.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button type="button" onClick={() => navigate("/pengajuan")}>
                Ajukan Kegiatan Donor <ArrowRight size={17} />
              </Button>
              <Button type="button" variant="soft" onClick={() => navigate("/cek-pengajuan")}>
                Cek Kode Pengajuan
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white bg-white/90 p-4 shadow-[0_12px_34px_rgba(15,23,42,.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-500">Kegiatan Hari Ini</p>
                  <strong className="mt-1 block text-2xl font-extrabold text-simodar-deep">{todayRunning.length}</strong>
                </div>
                <span className="rounded-2xl bg-rose-50 p-3 text-simodar-red"><Activity size={19} /></span>
              </div>
              <div className="mt-3 grid gap-2">
                {todayRunning.length ? todayRunning.slice(0, 2).map((item) => (
                  <div key={item.kode_pengajuan} className="rounded-2xl bg-slate-50 px-3 py-2">
                    <b className="block truncate text-sm text-slate-800">{item.instansi}</b>
                    <small className="font-semibold text-slate-500">{item.jam_mulai} - {item.jam_selesai} | On Going</small>
                  </div>
                )) : (
                  <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">Tidak ada kegiatan berjalan hari ini.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white bg-white/90 p-4 shadow-[0_12px_34px_rgba(15,23,42,.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-500">Histori Perolehan</p>
                  <strong className="mt-1 block text-2xl font-extrabold text-simodar-deep">{lastMonthHistory.bloodBags}</strong>
                </div>
                <span className="rounded-2xl bg-rose-50 p-3 text-simodar-red"><ShieldCheck size={19} /></span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <b className="block text-slate-900">{lastMonthHistory.totalActivities}</b>
                  <span className="font-semibold text-slate-500">Kegiatan bulan lalu</span>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <b className="block text-slate-900">{lastMonthHistory.totalLocations}</b>
                  <span className="font-semibold text-slate-500">Tempat donor</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white bg-white/95 p-4 shadow-[0_14px_40px_rgba(15,23,42,.06)] sm:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-500">Jadwal Bulan Ini</p>
                  <strong className="mt-1 block text-xl font-extrabold text-slate-950">{monthSchedules.length} kegiatan mobile unit</strong>
                </div>
                <span className="rounded-2xl bg-rose-50 p-3 text-simodar-red"><CalendarDays size={20} /></span>
              </div>
              <div className="max-h-36 overflow-y-auto pr-1 simodar-scrollbar">
                {monthSchedules.length ? monthSchedules.map((item, index) => (
                  <div key={item.kode_pengajuan} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-t border-slate-100 py-2.5 first:border-t-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-extrabold text-simodar-red">{index + 1}</span>
                    <div className="min-w-0">
                      <b className="block truncate text-sm text-slate-900">{item.instansi}</b>
                      <small className="block truncate font-semibold text-slate-500">{item.lokasi}</small>
                    </div>
                    <time className="text-right text-xs font-extrabold text-slate-600">{formatDate(item.tanggal)}</time>
                  </div>
                )) : (
                  <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-500">Belum ada jadwal kegiatan bulan ini.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center p-1 md:p-6">
          <div className="mb-6">
            <p className="text-sm font-extrabold uppercase tracking-[.24em] text-simodar-red">Login Petugas</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-slate-950">Masuk ke dashboard</h2>
            <p className="mt-2 text-sm text-slate-500">Akses sementara: admin / admin123, atau akun petugas dari master petugas.</p>
          </div>
          <form className="grid gap-4" onSubmit={submitLogin}>
            <Field label="Username" required>
              <Input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} placeholder="Masukkan username" required />
            </Field>
            <Field label="Password" required>
              <Input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} placeholder="Masukkan password" required />
            </Field>
            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                className="font-semibold text-slate-500 underline-offset-4 hover:text-simodar-red hover:underline"
                type="button"
                onClick={() => setSupportOpen(true)}
              >
                Butuh bantuan?
              </button>
              <button
                className="font-extrabold text-simodar-red underline-offset-4 hover:underline"
                type="button"
                onClick={() => setSupportOpen(true)}
              >
                Hubungi admin SIMODAR
              </button>
            </div>
            <Button type="submit" className="min-h-12 text-base">
              Masuk Sekarang
            </Button>
          </form>
          <footer className="mt-8 text-center">
            <p className="text-xs font-bold text-slate-400">Made with love by MFauzan</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Copyright 2026</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <a className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-simodar-red" href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram SIMODAR">
                <Instagram size={17} />
              </a>
              <a className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-simodar-red" href="https://wa.me/6281214021000" target="_blank" rel="noreferrer" aria-label="WhatsApp SIMODAR">
                <MessageCircle size={17} />
              </a>
              <a className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-simodar-red" href="https://github.com/fzanmhmd/SIMODAR" target="_blank" rel="noreferrer" aria-label="GitHub SIMODAR">
                <Github size={17} />
              </a>
            </div>
          </footer>
        </div>
      </section>
      <Modal
        open={supportOpen}
        title="Bantuan Login"
        description="Hubungi admin SIMODAR jika lupa password, akun terkunci, atau belum mendapat akses petugas."
        onClose={() => setSupportOpen(false)}
        size="sm"
      >
        <div className="grid gap-3">
          <a className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-simodar-deep" href="https://wa.me/6281214021000" target="_blank" rel="noreferrer">
            WhatsApp Admin: 0812-1402-1000
          </a>
          <a className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700" href="mailto:admin@simodar.id">
            Email: admin@simodar.id
          </a>
          <a className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700" href="tel:0215550123">
            Telepon: 021-555-0123
          </a>
          <Button type="button" onClick={() => setSupportOpen(false)}>
            Mengerti
          </Button>
        </div>
      </Modal>
    </main>
  );
}

function PengajuanPage({ toast }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [locations, setLocations] = useState([]);
  const [success, setSuccess] = useState(null);
  const [newLocation, setNewLocation] = useState(false);
  const [form, setForm] = useState({
    instansi: "",
    lokasi: "",
    tanggal: "",
    jam_mulai: "",
    jam_selesai: "",
    peserta: "",
    nama_pic: "",
    whatsapp_pic: "",
    email_pic: "",
    latitude: "-6.208800",
    longitude: "106.845600",
    logistik: [],
  });

  useEffect(() => {
    Promise.all([api("/submissions/next-code"), api("/locations")]).then(([next, locs]) => {
      setCode(next.code);
      setLocations(locs.locations || []);
    });
  }, []);

  function chooseLocation(name) {
    const location = locations.find((item) => item.name === name);
    setForm({
      ...form,
      instansi: name,
      lokasi: location?.address || "",
      latitude: location?.latitude || form.latitude,
      longitude: location?.longitude || form.longitude,
    });
  }

  function setMapPoint(point) {
    setForm((current) => ({
      ...current,
      latitude: point.lat,
      longitude: point.lng,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (form.jam_selesai <= form.jam_mulai) return toast("Jam selesai harus lebih besar dari jam mulai.");
    const payload = new FormData(event.currentTarget);
    payload.set("kode_pengajuan", code);
    payload.set("instansi", form.instansi);
    payload.set("logistik", form.logistik.join(","));
    try {
      const result = await api("/submissions", { method: "POST", body: payload });
      setSuccess(result.submission);
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Button type="button" variant="soft" onClick={() => navigate(-1)}>
            Kembali
          </Button>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold text-simodar-red">Pengajuan Mobile Unit</p>
            <p className="text-sm text-slate-500">Kode otomatis: {code}</p>
          </div>
        </header>

        <form className="grid gap-5 lg:grid-cols-[1fr_360px]" onSubmit={submit}>
          <Card className="p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kode Pengajuan" required>
                <Input name="kode_pengajuan_view" value={code} readOnly />
              </Field>
              <Field label="Instansi/Tempat Donor" required>
                <Input list="locations" value={form.instansi} onChange={(event) => chooseLocation(event.target.value)} placeholder="Cari lokasi terdaftar" required={!newLocation} />
                <datalist id="locations">
                  {locations.map((item) => (
                    <option key={item.id || item.name} value={item.name} />
                  ))}
                </datalist>
              </Field>
              <label className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" className="h-4 w-4 accent-simodar-red" checked={newLocation} onChange={(event) => setNewLocation(event.target.checked)} />
                Lokasi belum ada di daftar
              </label>
              {newLocation && (
                <Field label="Nama Instansi/Tempat Baru" required>
                  <Input value={form.instansi} onChange={(event) => setForm({ ...form, instansi: event.target.value })} placeholder="Masukkan tempat baru" required />
                </Field>
              )}
              <div className="md:col-span-2">
                <Field label="Alamat Lokasi" required>
                  <Input name="lokasi" value={form.lokasi} onChange={(event) => setForm({ ...form, lokasi: event.target.value })} required />
                </Field>
              </div>
              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <p className="font-display text-lg font-extrabold text-slate-900">Titik Lokasi</p>
                    <p className="text-sm font-medium text-slate-500">Klik titik di peta sesuai lokasi donor. Marker bisa digeser jika perlu.</p>
                  </div>
                  <a
                    className="text-sm font-extrabold text-simodar-red"
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka Google Maps
                  </a>
                </div>
                <LocationPicker latitude={form.latitude} longitude={form.longitude} onChange={setMapPoint} />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Latitude" required>
                    <Input name="latitude" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required />
                  </Field>
                  <Field label="Longitude" required>
                    <Input name="longitude" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required />
                  </Field>
                </div>
              </div>
              <Field label="Tanggal Kegiatan" required>
                <Input name="tanggal" type="date" value={form.tanggal} onChange={(event) => setForm({ ...form, tanggal: event.target.value })} required />
              </Field>
              <Field label="Estimasi Peserta" required>
                <Input name="peserta" type="number" min="50" value={form.peserta} onChange={(event) => setForm({ ...form, peserta: event.target.value })} required />
              </Field>
              <Field label="Jam Mulai" required>
                <Input name="jam_mulai" type="time" min="00:00" max="23:59" value={form.jam_mulai} onChange={(event) => setForm({ ...form, jam_mulai: event.target.value })} required />
              </Field>
              <Field label="Jam Selesai" required>
                <Input name="jam_selesai" type="time" min="00:00" max="23:59" value={form.jam_selesai} onChange={(event) => setForm({ ...form, jam_selesai: event.target.value })} required />
              </Field>
              <Field label="Nama PIC" required>
                <Input name="nama_pic" value={form.nama_pic} onChange={(event) => setForm({ ...form, nama_pic: event.target.value })} required />
              </Field>
              <Field label="WhatsApp PIC" required>
                <Input name="whatsapp_pic" value={form.whatsapp_pic} onChange={(event) => setForm({ ...form, whatsapp_pic: event.target.value })} required />
              </Field>
              <Field label="Email PIC" required>
                <Input name="email_pic" type="email" value={form.email_pic} onChange={(event) => setForm({ ...form, email_pic: event.target.value })} required />
              </Field>
              <Field label="Surat Pengajuan" required>
                <Input name="surat_pengajuan" type="file" required />
              </Field>
            </div>
            <div className="mt-5">
              <p className="mb-3 text-sm font-extrabold text-slate-700">Kuesioner logistik opsional</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {logistikOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      className="accent-simodar-red"
                      checked={form.logistik.includes(option)}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          logistik: event.target.checked ? [...form.logistik, option] : form.logistik.filter((item) => item !== option),
                        })
                      }
                    />
                    {option.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" className="mt-6 w-full min-h-12">
              Kirim Pengajuan
            </Button>
          </Card>

          <aside className="grid content-start gap-4">
            <Card className="p-5">
              <h3 className="font-display text-lg font-extrabold text-slate-900">Informasi Penting</h3>
              <ol className="mt-3 grid gap-2 text-sm text-slate-600">
                <li>1. Pengajuan H-1 atau dadakan H-10 hubungi admin terlebih dahulu.</li>
                <li>2. Estimasi peserta minimal 50 calon pendonor.</li>
                <li>3. Lokasi wajib memiliki akses parkir dan ventilasi memadai.</li>
              </ol>
            </Card>
          </aside>
        </form>
      </div>

      <Modal open={Boolean(success)} title="Pengajuan Terkirim" description="Simpan kode ini untuk cek status pengajuan." onClose={() => setSuccess(null)} size="sm">
        {success && (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-rose-50 p-5 text-center">
              <p className="text-sm font-bold text-slate-500">Kode Pengajuan</p>
              <strong className="mt-2 block text-3xl font-extrabold text-simodar-red">{success.kode_pengajuan}</strong>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="soft" onClick={() => navigator.clipboard?.writeText(success.kode_pengajuan)}>
                Salin Kode
              </Button>
              <Button type="button" onClick={() => navigate(`/cek-pengajuan?kode=${success.kode_pengajuan}`)}>
                Cek Status
              </Button>
            </div>
            <Button type="button" variant="ghost" onClick={() => navigate("/")}>
              Kembali
            </Button>
          </div>
        )}
      </Modal>
    </main>
  );
}

function CheckSubmissionPage() {
  const params = new URLSearchParams(useLocation().search);
  const [code, setCode] = useState(params.get("kode") || "");
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState("");

  async function search(event) {
    event?.preventDefault();
    setError("");
    setSubmission(null);
    if (!code) return;
    try {
      const result = await api(`/submissions/${code}`);
      setSubmission(result.submission);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (code) search();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:grid md:place-items-center">
      <Card className="w-full max-w-3xl p-6">
        <Link to="/" className="text-sm font-bold text-simodar-red">Kembali</Link>
        <h1 className="mt-5 font-display text-3xl font-extrabold text-slate-950">Cek Kode Pengajuan</h1>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={search}>
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Contoh: 2026060001" />
          <Button type="submit">Cek Status</Button>
        </form>
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        {submission && (
          <div className="mt-6 rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">{submission.kode_pengajuan}</p>
                <h2 className="font-display text-2xl font-extrabold text-slate-900">{submission.instansi}</h2>
              </div>
              <StatusBadge>{submission.status}</StatusBadge>
            </div>
            <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <Info label="Alamat" value={submission.lokasi} />
              <Info label="Tanggal" value={formatDate(submission.tanggal)} />
              <Info label="Waktu" value={`${submission.jam_mulai} - ${submission.jam_selesai}`} />
              <Info label="PIC" value={`${submission.nama_pic} | ${submission.whatsapp_pic}`} />
              <Info label="Deskripsi" value={submission.deskripsi} wide />
            </dl>
            {submission.surat_file && (
              <a className="mt-5 inline-flex rounded-xl bg-simodar-red px-4 py-2 text-sm font-bold text-white" href={`/api/submissions/${submission.kode_pengajuan}/file`} target="_self">
                View Surat Pengajuan
              </a>
            )}
          </div>
        )}
      </Card>
    </main>
  );
}

function Info({ label, value, wide }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value || "-"}</dd>
    </div>
  );
}

function AdminLayout({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { greeting, text } = useClock();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[290px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[290px] border-r border-slate-200 bg-white p-5 shadow-soft transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
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
      <main className="min-w-0 p-4 md:p-6 lg:p-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button type="button" variant="soft" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </Button>
          <div />
          <Button type="button" onClick={() => navigate("/pengajuan?from=admin")}>
            <Plus size={18} /> Tambah Pengajuan
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}

function PageHeader({ eyebrow, title, subtitle, children }) {
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

function DashboardPage() {
  const { data, loading } = useApiData("/admin/overview", []);
  const snapshot = data?.data;
  if (loading || !snapshot) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Dashboard" title="Beranda SIMODAR" subtitle="Ringkasan workflow kegiatan mobile unit donor darah." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.cards.map((card) => (
          <Link key={card.key} to={card.href} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_18px_45px_rgba(190,18,60,.10)]">
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
        <p className="text-sm text-slate-500">Tanggal kegiatan: {activityDateText(item)}</p>
        <p className="text-xs font-semibold text-slate-400">Update data: {formatDateTime(latestUpdate(item))}</p>
      </div>
      <StatusBadge>{item.status}</StatusBadge>
    </div>
  );
}

function LoadingPanel() {
  return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center font-bold text-slate-500 shadow-soft">Memuat data SIMODAR...</div>;
}

function MonthFilter({ month, setMonth }) {
  return (
    <Field label="Filter Bulan">
      <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
    </Field>
  );
}

function DataTable({ columns, rows, empty }) {
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

function ApprovalPage({ toast, confirm }) {
  const [sort, setSort] = useState("terbaru");
  const { data, loading, reload } = useApiData(`/admin/approvals?sort=${sort}`, [sort]);
  const [reject, setReject] = useState(null);
  const approvals = data?.approvals || [];

  async function approve(row) {
    confirm(`ACC pengajuan ${row.kode_pengajuan}?`, async () => {
      const result = await api(`/admin/approvals/${row.kode_pengajuan}/approve`, { method: "POST" });
      toast(result.message);
      reload();
    });
  }

  async function saveReject(event) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("keterangan");
    if (!note) return toast("Isi keterangan tolak terlebih dahulu.");
    confirm(`Tolak pengajuan ${reject.kode_pengajuan}?`, async () => {
      const result = await api(`/admin/approvals/${reject.kode_pengajuan}/reject`, { method: "POST", body: { keterangan: note } });
      toast(result.message);
      setReject(null);
      reload();
    });
  }

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Approval Pengajuan" subtitle="Verifikasi pengajuan user eksternal sebelum masuk penugasan.">
        <Select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="terbaru">Terbaru</option>
          <option value="terlama">Terlama</option>
        </Select>
      </PageHeader>
      <DataTable
        rows={approvals}
        empty="Belum ada pengajuan masuk."
        columns={[
          { key: "kode_pengajuan", label: "Kode" },
          { key: "dates", label: "Tanggal", render: (row) => <WorkflowDates row={row} /> },
          { key: "instansi", label: "Instansi" },
          { key: "lokasi", label: "Alamat" },
          {
            key: "aksi",
            label: "Aksi",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex min-h-10 items-center rounded-xl border border-rose-200 px-3 text-sm font-bold text-simodar-red" to={`/cek-pengajuan?kode=${row.kode_pengajuan}`}>Preview</Link>
                <Button type="button" onClick={() => approve(row)}>ACC</Button>
                <Button type="button" variant="danger" onClick={() => setReject(row)}>Tolak</Button>
              </div>
            ),
          },
        ]}
      />
      <Modal open={Boolean(reject)} title="Tolak Pengajuan" description={reject ? `Sedang eksekusi data: ${reject.instansi} - ${reject.lokasi}` : ""} onClose={() => setReject(null)} size="sm">
        <form className="grid gap-4" onSubmit={saveReject}>
          <Field label="Keterangan Tolak" required>
            <Input name="keterangan" placeholder="Contoh: Jadwal bentrok atau data belum lengkap" autoFocus={false} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="soft" onClick={() => setReject(null)}>Batal</Button>
            <Button type="submit" variant="danger">Simpan Tolak</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function AssignmentPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/assignments", []);
  const [active, setActive] = useState(null);
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Penugasan Petugas" subtitle="Tambahkan petugas dan PJ untuk pengajuan yang sudah ACC." />
      <DataTable
        rows={data.assignments || []}
        empty="Tidak ada kegiatan menunggu penugasan."
        columns={[
          { key: "no", label: "No", render: (_, i) => i + 1 },
          { key: "instansi", label: "Nama Tempat" },
          { key: "dates", label: "Tanggal", render: (row) => <WorkflowDates row={row} /> },
          { key: "peserta", label: "Estimasi", render: (row) => `${row.peserta} donor` },
          { key: "aksi", label: "Aksi", render: (row) => <Button type="button" onClick={() => setActive(row)}>Tambah Petugas</Button> },
        ]}
      />
      <StaffAssignModal
        open={Boolean(active)}
        title="Tambah Petugas"
        activity={active}
        staff={data.staff || []}
        onClose={() => setActive(null)}
        onSave={(payload) =>
          confirm(`Simpan penugasan ${active.kode_pengajuan}?`, async () => {
            const result = await api(`/admin/assignments/${active.kode_pengajuan}/save`, { method: "POST", body: payload });
            toast(result.message);
            setActive(null);
            reload();
          })
        }
      />
    </>
  );
}

function StaffAssignModal({ open, title, activity, staff, onClose, onSave }) {
  const [rows, setRows] = useState([{ name: "", role: "dokter" }]);
  const [pj, setPj] = useState("");
  useEffect(() => {
    setRows(activity?.staff_assignments?.length ? activity.staff_assignments : [{ name: "", role: "dokter" }]);
    setPj(activity?.pj_petugas || activity?.staff_assignments?.[0]?.name || "");
  }, [activity]);
  return (
    <Modal open={open} title={title} description={activity ? `Sedang eksekusi data: ${activity.instansi}` : ""} onClose={onClose} size="md">
      <div className="grid gap-4">
        <Field label="PJ Petugas" required>
          <Select value={pj} onChange={(event) => setPj(event.target.value)}>
            <option value="">Pilih PJ</option>
            {staff.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_160px_auto]">
              <Select value={row.name} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, name: event.target.value } : item))}>
                <option value="">Pilih petugas</option>
                {staff.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </Select>
              <Select value={row.role} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, role: event.target.value } : item))}>
                {roleOptions.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
              </Select>
              <Button type="button" variant="soft" onClick={() => setRows(rows.filter((_, i) => i !== index))}>Hapus</Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="soft" onClick={() => setRows([...rows, { name: "", role: "dokter" }])}>Tambah Kolom Petugas</Button>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="soft" onClick={onClose}>Batal</Button>
          <Button type="button" onClick={() => onSave({ pj_petugas: pj || rows.find((row) => row.name)?.name, staff_assignments: rows.filter((row) => row.name) })}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}

function SchedulePage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/schedules", []);
  const [edit, setEdit] = useState(null);
  const [cancel, setCancel] = useState(null);
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Jadwal Kegiatan" subtitle="Jadwal yang sudah siap berangkat dan menunggu waktu pelaksanaan." />
      <DataTable
        rows={data.schedules || []}
        empty="Belum ada jadwal siap kegiatan."
        columns={[
          { key: "no", label: "No", render: (_, i) => i + 1 },
          { key: "instansi", label: "Nama Lokasi", render: (row) => <><b>{row.instansi}</b><small className="block text-slate-500">{row.lokasi}</small></> },
          { key: "dates", label: "Tanggal", render: (row) => <WorkflowDates row={row} /> },
          { key: "pj_petugas", label: "PJ Petugas" },
          { key: "jumlah", label: "Jumlah Petugas", render: (row) => row.staff_assignments?.length || 0 },
          {
            key: "aksi",
            label: "Aksi",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="soft" onClick={() => downloadFile(`/admin/schedules/${row.kode_pengajuan}/pdf`, `jadwal-simodar-${row.kode_pengajuan}.pdf`)}><Download size={16} /> PDF</Button>
                <Button type="button" variant="soft" onClick={() => setEdit(row)}>Ubah</Button>
                <Button type="button" onClick={() => confirm(`Selesaikan kegiatan ${row.instansi}?`, async () => { const result = await api(`/admin/schedules/${row.kode_pengajuan}/finish`, { method: "POST" }); toast(result.message); reload(); })}>Selesai</Button>
                <Button type="button" variant="danger" onClick={() => setCancel(row)}>Batal</Button>
              </div>
            ),
          },
        ]}
      />
      <StaffAssignModal
        open={Boolean(edit)}
        title="Ubah Petugas Jadwal"
        activity={edit}
        staff={data.staff || []}
        onClose={() => setEdit(null)}
        onSave={(payload) => confirm(`Simpan perubahan petugas ${edit.kode_pengajuan}?`, async () => { const result = await api(`/admin/schedules/${edit.kode_pengajuan}/staff`, { method: "PUT", body: payload }); toast(result.message); setEdit(null); reload(); })}
      />
      <NoteModal
        open={Boolean(cancel)}
        title="Batalkan Jadwal"
        description={cancel ? `Sedang eksekusi data: ${cancel.instansi}` : ""}
        label="Keterangan Batal"
        onClose={() => setCancel(null)}
        onSave={(note) => confirm(`Batalkan jadwal ${cancel.kode_pengajuan}?`, async () => { const result = await api(`/admin/schedules/${cancel.kode_pengajuan}/cancel`, { method: "POST", body: { keterangan: note } }); toast(result.message); setCancel(null); reload(); })}
      />
    </>
  );
}

function NoteModal({ open, title, description, label, onClose, onSave }) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(""), [open]);
  return (
    <Modal open={open} title={title} description={description} onClose={onClose} size="sm">
      <div className="grid gap-4">
        <Field label={label} required><Input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="soft" onClick={onClose}>Batal</Button>
          <Button type="button" variant="danger" onClick={() => note ? onSave(note) : null}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}

function ResultsPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/results", []);
  const [active, setActive] = useState(null);
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Hasil Kegiatan" subtitle="Input hasil kegiatan setelah jadwal ditandai selesai." />
      <DataTable rows={data.results || []} empty="Tidak ada hasil kegiatan yang perlu diinput." columns={[
        { key: "no", label: "No", render: (_, i) => i + 1 },
        { key: "instansi", label: "Lokasi" },
        { key: "dates", label: "Tanggal", render: (row) => <WorkflowDates row={row} /> },
        { key: "aksi", label: "Aksi", render: (row) => <Button type="button" onClick={() => setActive(row)}>Input Hasil</Button> },
      ]} />
      <ResultModal open={Boolean(active)} activity={active} onClose={() => setActive(null)} onSave={(payload) => confirm(`Simpan hasil ${active.kode_pengajuan}?`, async () => { const result = await api(`/admin/results/${active.kode_pengajuan}/save`, { method: "POST", body: payload }); toast(result.message); setActive(null); reload(); })} />
    </>
  );
}

function ResultModal({ open, activity, onClose, onSave }) {
  const [form, setForm] = useState({ donor_terdaftar: "", donor_berhasil: "", donor_gagal: "", kantong_darah: "", snack_terpakai: "", catatan: "" });
  useEffect(() => setForm({ donor_terdaftar: "", donor_berhasil: "", donor_gagal: "", kantong_darah: "", snack_terpakai: "", catatan: "" }), [activity]);
  return (
    <Modal open={open} title="Input Hasil Kegiatan" description={activity ? `Sedang eksekusi data: ${activity.instansi}` : ""} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["donor_terdaftar", "Donor Terdaftar"],
          ["donor_berhasil", "Donor Berhasil"],
          ["donor_gagal", "Donor Gagal"],
          ["kantong_darah", "Kantong Darah"],
          ["snack_terpakai", "Snack Terpakai"],
        ].map(([key, label]) => (
          <Field key={key} label={label}><Input type="number" min="0" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></Field>
        ))}
        <div className="md:col-span-2"><Field label="Catatan"><Textarea value={form.catatan} onChange={(event) => setForm({ ...form, catatan: event.target.value })} /></Field></div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="soft" onClick={onClose}>Batal</Button><Button onClick={() => onSave(form)}>Simpan Hasil</Button></div>
    </Modal>
  );
}

function HistoriesPage({ toast, confirm }) {
  const [month, setMonth] = useState(monthKey());
  const { data, loading, reload } = useApiData(`/admin/histories?month=${month}`, [month]);
  const [edit, setEdit] = useState(null);
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Histori Kegiatan" subtitle="Data permanen kegiatan selesai, batal, dan ditolak.">
        <MonthFilter month={month} setMonth={setMonth} />
      </PageHeader>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {Object.entries(data.counts || {}).map(([key, value]) => <Card key={key} className="p-4"><p className="text-sm font-bold capitalize text-slate-500">{key}</p><b className="text-3xl text-slate-950">{value}</b></Card>)}
      </div>
      <DataTable rows={data.histories || []} empty="Belum ada histori pada bulan ini." columns={[
        { key: "kode_pengajuan", label: "Kode" },
        { key: "instansi", label: "Lokasi" },
        { key: "dates", label: "Tanggal", render: (row) => <WorkflowDates row={row} /> },
        { key: "status", label: "Status", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
        { key: "petugas", label: "Petugas", render: (row) => (row.staff_assignments || []).map((item) => `${item.name} (${item.role})`).join(", ") || "-" },
        { key: "kantong", label: "Kantong", render: (row) => row.result?.kantong_darah || "-" },
        { key: "aksi", label: "Aksi", render: (row) => <Button type="button" variant="soft" onClick={() => setEdit(row)}>Edit</Button> },
      ]} />
      <ResultModal open={Boolean(edit)} activity={edit} onClose={() => setEdit(null)} onSave={(payload) => confirm(`Update histori ${edit.kode_pengajuan}?`, async () => { const result = await api(`/admin/histories/${edit.kode_pengajuan}/result`, { method: "PUT", body: payload }); toast(result.message); setEdit(null); reload(); })} />
    </>
  );
}

function StaffPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/staff", []);
  const [active, setActive] = useState(null);
  if (loading) return <LoadingPanel />;
  const rows = data.staff || [];
  return (
    <>
      <PageHeader eyebrow="Master Petugas" title="Data Petugas" subtitle="Kelola nama, role, absen, password, dan rekening petugas.">
        <Button type="button" onClick={() => setActive({ roles: ["other"] })}><Plus size={17} /> Tambah Petugas</Button>
      </PageHeader>
      <DataTable rows={rows} empty="Belum ada petugas." columns={[
        { key: "no", label: "No", render: (_, i) => i + 1 },
        { key: "name", label: "Nama Petugas" },
        { key: "roles", label: "Role", render: (row) => row.roles?.join(", ") },
        { key: "absen", label: "No Absen" },
        { key: "rekening", label: "Rekening" },
        { key: "dates", label: "Tanggal Data", render: (row) => <EntityDates row={row} /> },
        { key: "aksi", label: "Aksi", render: (row) => <div className="flex gap-2"><Button variant="soft" onClick={() => setActive(row)}>Edit</Button><Button variant="danger" onClick={() => confirm(`Hapus petugas ${row.name}?`, async () => { const result = await api(`/admin/staff/${row.id}`, { method: "DELETE" }); toast(result.message); reload(); })}>Hapus</Button></div> },
      ]} />
      <StaffModal open={Boolean(active)} staff={active} onClose={() => setActive(null)} onSave={(payload) => confirm(`Simpan data petugas ${payload.name}?`, async () => { const method = active.id ? "PUT" : "POST"; const path = active.id ? `/admin/staff/${active.id}` : "/admin/staff"; const result = await api(path, { method, body: payload }); toast(result.message); setActive(null); reload(); })} />
    </>
  );
}

function StaffModal({ open, staff, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", roles: ["other"], absen: "", password: "", rekening: "" });
  useEffect(() => setForm({ name: staff?.name || "", roles: staff?.roles || ["other"], absen: staff?.absen || "", password: staff?.password || "", rekening: staff?.rekening || "" }), [staff]);
  return (
    <Modal open={open} title={staff?.id ? "Edit Petugas" : "Tambah Petugas"} description="Data role digunakan untuk login dan penugasan." onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nama Petugas" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="No Absen"><Input value={form.absen} onChange={(e) => setForm({ ...form, absen: e.target.value })} /></Field>
        <Field label="Password Absen"><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Rekening"><Input value={form.rekening} onChange={(e) => setForm({ ...form, rekening: e.target.value })} /></Field>
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-bold text-slate-700">Role</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {roleOptions.map((role) => <label key={role} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm font-semibold"><input type="checkbox" className="accent-simodar-red" checked={form.roles.includes(role)} onChange={(event) => setForm({ ...form, roles: event.target.checked ? [...form.roles, role] : form.roles.filter((item) => item !== role) })} />{role}</label>)}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="soft" onClick={onClose}>Batal</Button><Button onClick={() => onSave(form)}>Simpan</Button></div>
    </Modal>
  );
}

function StaffHistoryPage() {
  const [month, setMonth] = useState(monthKey());
  const { data, loading } = useApiData(`/admin/staff-history?month=${month}`, [month]);
  const [active, setActive] = useState(null);
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Master Petugas" title="Histori Petugas" subtitle="Jumlah dan lokasi penugasan petugas per bulan."><MonthFilter month={month} setMonth={setMonth} /></PageHeader>
      <DataTable rows={data.rows || []} empty="Belum ada histori petugas." columns={[
        {
          key: "staff",
          label: "Petugas",
          render: (row) => (
            <div>
              <b className="block text-slate-900">{row.staff.name}</b>
              <small className="font-semibold text-slate-500">{row.staff.roles?.join(", ") || "Petugas"}</small>
            </div>
          ),
        },
        {
          key: "total",
          label: "Total Tugas",
          render: (row) => (
            <div>
              <b className="block text-2xl text-simodar-red">{row.total}</b>
              <small className="font-semibold text-slate-500">kegiatan</small>
            </div>
          ),
        },
        {
          key: "places",
          label: "Histori Terakhir",
          render: (row) => {
            const latest = row.places?.[0];
            if (!latest) return <span className="font-semibold text-slate-400">Belum ada tugas bulan ini</span>;
            return (
              <div>
                <b className="block text-slate-900">{latest.lokasi}</b>
                <small className="font-semibold text-slate-500">Tanggal kegiatan: {activityDateText(latest)} | Fungsi: {latest.fungsi}</small>
              </div>
            );
          },
        },
        {
          key: "aksi",
          label: "Aksi",
          render: (row) => (
            <Button type="button" variant="soft" disabled={!row.places?.length} onClick={() => setActive(row)}>
              <Eye size={16} /> View Histori
            </Button>
          ),
        },
      ]} />
      <StaffHistoryModal open={Boolean(active)} row={active} month={month} onClose={() => setActive(null)} />
    </>
  );
}

function StaffHistoryModal({ open, row, month, onClose }) {
  const places = row?.places || [];
  return (
    <Modal
      open={open}
      title="View Histori Kegiatan Petugas"
      description={row ? `${row.staff.name} - periode ${formatMonthLabel(month)}` : ""}
      onClose={onClose}
      size="lg"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Petugas</p>
          <b className="mt-1 block text-lg text-slate-950">{row?.staff?.name || "-"}</b>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Total Tugas</p>
          <b className="mt-1 block text-3xl text-simodar-red">{row?.total || 0}</b>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Periode</p>
          <b className="mt-1 block text-lg text-slate-950">{formatMonthLabel(month)}</b>
        </Card>
      </div>

      {places.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto simodar-scrollbar">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-extrabold">No</th>
                  <th className="px-4 py-3 font-extrabold">Kode</th>
                  <th className="px-4 py-3 font-extrabold">Lokasi Kegiatan</th>
                  <th className="px-4 py-3 font-extrabold">Tanggal Kegiatan</th>
                  <th className="px-4 py-3 font-extrabold">Update Data</th>
                  <th className="px-4 py-3 font-extrabold">Fungsi</th>
                  <th className="px-4 py-3 font-extrabold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {places.map((place, index) => (
                  <tr key={`${place.kode}-${place.fungsi}-${index}`}>
                    <td className="px-4 py-4 font-bold text-slate-500">{index + 1}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{place.kode}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{place.lokasi}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{activityDateText(place)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{formatDateTime(place.updated_at)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{place.fungsi}</td>
                    <td className="px-4 py-4"><StatusBadge>{place.status}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState>Petugas ini belum memiliki histori kegiatan pada periode yang dipilih.</EmptyState>
      )}
    </Modal>
  );
}

function LocationPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/locations", []);
  const [active, setActive] = useState(null);
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Master Lokasi" title="Data Lokasi" subtitle="Kelola lokasi donor yang sering digunakan."><Button onClick={() => setActive({})}><Plus size={17} /> Tambah Lokasi</Button></PageHeader>
      <DataTable rows={data.locations || []} empty="Belum ada lokasi." columns={[
        { key: "name", label: "Nama Lokasi" },
        { key: "address", label: "Alamat" },
        { key: "coords", label: "Koordinat", render: (row) => row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : "-" },
        { key: "dates", label: "Tanggal Data", render: (row) => <EntityDates row={row} /> },
        { key: "aksi", label: "Aksi", render: (row) => <div className="flex gap-2"><Button variant="soft" onClick={() => setActive(row)}>Edit</Button><Button variant="danger" onClick={() => confirm(`Hapus lokasi ${row.name}?`, async () => { const result = await api(`/admin/locations/${row.id}`, { method: "DELETE" }); toast(result.message); reload(); })}>Hapus</Button></div> },
      ]} />
      <LocationModal open={Boolean(active)} location={active} onClose={() => setActive(null)} onSave={(payload) => confirm(`Simpan data lokasi ${payload.name}?`, async () => { const method = active.id ? "PUT" : "POST"; const path = active.id ? `/admin/locations/${active.id}` : "/admin/locations"; const result = await api(path, { method, body: payload }); toast(result.message); setActive(null); reload(); })} />
    </>
  );
}

function LocationModal({ open, location, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "" });
  useEffect(() => setForm({ name: location?.name || "", address: location?.address || "", latitude: location?.latitude || "", longitude: location?.longitude || "" }), [location]);
  return (
    <Modal open={open} title={location?.id ? "Edit Lokasi" : "Tambah Lokasi"} description="Data lokasi dipakai pada form pengajuan dan histori kegiatan." onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nama Lokasi" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Alamat" required><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <Field label="Latitude"><Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></Field>
        <Field label="Longitude"><Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="soft" onClick={onClose}>Batal</Button><Button onClick={() => onSave(form)}>Simpan</Button></div>
    </Modal>
  );
}

function LocationActivityPage() {
  const [month, setMonth] = useState(monthKey());
  const { data, loading } = useApiData(`/admin/location-activity?month=${month}`, [month]);
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Master Lokasi" title="Kegiatan Lokasi" subtitle="Rekap lokasi berdasarkan histori kegiatan per bulan."><MonthFilter month={month} setMonth={setMonth} /></PageHeader>
      <DataTable rows={data.rows || []} empty="Belum ada kegiatan lokasi." columns={[
        { key: "name", label: "Lokasi" },
        { key: "address", label: "Alamat" },
        { key: "total", label: "Total" },
        { key: "selesai", label: "Selesai" },
        { key: "batal", label: "Batal" },
        { key: "ditolak", label: "Ditolak" },
        {
          key: "events",
          label: "Tanggal Kegiatan",
          render: (row) => row.events?.length ? (
            <div className="grid gap-1">
              {row.events.slice(0, 4).map((event) => (
                <small key={event.kode_pengajuan} className="font-semibold text-slate-500">
                  {formatDate(event.tanggal)} | {event.status} | update {formatDateTime(latestUpdate(event))}
                </small>
              ))}
            </div>
          ) : "-",
        },
      ]} />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!getToken());
  const [confirmState, setConfirmState] = useState(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const appLocation = useLocation();

  useEffect(() => {
    if (!getToken()) {
      setAuthReady(true);
      return;
    }
    api("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setToken(""))
      .finally(() => setAuthReady(true));
  }, []);

  const confirm = (message, action) => {
    setConfirmState({
      message,
      onAccept: async () => {
        try {
          await action();
        } catch (error) {
          toast.show(error.message);
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  function logout() {
    setToken("");
    setUser(null);
    navigate("/");
  }

  useEffect(() => {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [appLocation.pathname]);

  useEffect(() => {
    setRouteLoading(true);
    document.body.classList.add("route-loading-active");
    const timer = window.setTimeout(() => {
      setRouteLoading(false);
      document.body.classList.remove("route-loading-active");
    }, 620);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("route-loading-active");
    };
  }, [appLocation.pathname, appLocation.search]);

  const adminElement = (page) => <AuthGate user={user} authReady={authReady}><AdminLayout user={user} onLogout={logout}>{page}</AdminLayout></AuthGate>;

  return (
    <>
      <div key={appLocation.pathname} className="page-transition">
        <Routes location={appLocation}>
          <Route path="/" element={<Landing onLogin={setUser} toast={toast.show} />} />
          <Route path="/pengajuan" element={<PengajuanPage toast={toast.show} />} />
          <Route path="/cek-pengajuan" element={<CheckSubmissionPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={adminElement(<DashboardPage />)} />
          <Route path="/admin/approval-pengajuan" element={adminElement(<ApprovalPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/penugasan-petugas" element={adminElement(<AssignmentPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/jadwal-kegiatan" element={adminElement(<SchedulePage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/hasil-kegiatan" element={adminElement(<ResultsPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/histori-kegiatan" element={adminElement(<HistoriesPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/data-petugas" element={adminElement(<StaffPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/histori-petugas" element={adminElement(<StaffHistoryPage />)} />
          <Route path="/admin/data-lokasi" element={adminElement(<LocationPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/kegiatan-lokasi" element={adminElement(<LocationActivityPage />)} />
        </Routes>
      </div>
      <RouteLoader show={routeLoading} />
      <Toast message={toast.toast} onClose={toast.clear} />
      <ConfirmModal confirm={confirmState} onClose={() => setConfirmState(null)} />
    </>
  );
}

export default App;
