import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Instagram, Mail, Activity, Droplet, HeartPulse, Stethoscope, PlusCircle, Syringe, Pill, Microscope, Thermometer } from "lucide-react";
import { api, setToken } from "../api.js";
import { Button, Field, Input, Modal } from "../components/ui.jsx";

export default function LoginPage({ onLogin, toast }) {
  const navigate = useNavigate();
  const [login, setLogin] = useState({ username: "", password: "" });
  const [supportOpen, setSupportOpen] = useState(false);

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
    <main className="relative min-h-dvh bg-gradient-to-br from-slate-50 via-white to-rose-50 px-6 py-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden z-0">
      
      {/* Premium Faded Grid Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] opacity-60"></div>

      {/* Animated Background Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-24 h-24 bg-rose-100/60 rounded-full flex items-center justify-center text-rose-400/80 animate-f1">
          <Droplet size={40} />
        </div>
        <div className="absolute bottom-[10%] right-[10%] w-36 h-36 bg-red-100/60 rounded-full flex items-center justify-center text-red-400/80 animate-f2" style={{ animationDelay: '2s' }}>
          <Activity size={56} />
        </div>
        <div className="absolute top-[15%] right-[20%] w-20 h-20 bg-pink-100/60 rounded-full flex items-center justify-center text-pink-400/80 animate-f3">
          <HeartPulse size={36} />
        </div>
        <div className="absolute bottom-[15%] left-[20%] w-28 h-28 bg-rose-100/50 rounded-full flex items-center justify-center text-rose-400/80 animate-f4">
          <Stethoscope size={48} />
        </div>
        <div className="absolute top-[45%] left-[5%] w-16 h-16 bg-red-50/80 rounded-full flex items-center justify-center text-red-300/80 animate-f5">
          <PlusCircle size={28} />
        </div>
        <div className="absolute top-[80%] left-[45%] w-32 h-32 bg-rose-50/80 rounded-full flex items-center justify-center text-rose-300/80 animate-f1" style={{ animationDelay: '5s' }}>
          <Syringe size={48} />
        </div>
        <div className="absolute top-[30%] left-[70%] w-20 h-20 bg-pink-50/80 rounded-full flex items-center justify-center text-pink-300/80 animate-f2" style={{ animationDelay: '10s' }}>
          <Pill size={32} />
        </div>
        <div className="absolute bottom-[30%] right-[40%] w-24 h-24 bg-red-50/80 rounded-full flex items-center justify-center text-red-300/80 animate-f3" style={{ animationDelay: '15s' }}>
          <Microscope size={40} />
        </div>
        <div className="absolute top-[60%] right-[5%] w-16 h-16 bg-rose-100/60 rounded-full flex items-center justify-center text-rose-400/80 animate-f4" style={{ animationDelay: '20s' }}>
          <Thermometer size={28} />
        </div>
      </div>

      <div className="w-full max-w-[400px] rounded-[28px] border-[1.5px] border-white/60 bg-white/5 backdrop-blur-sm p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] sm:p-8 relative z-10">
        <div className="mb-8 text-center">
          <img src="/img/Simodar-logo.png" alt="SIMODAR" className="mx-auto h-16 w-auto object-contain" />
          <p className="mt-4 text-sm font-extrabold uppercase tracking-[.24em] text-simodar-red">Login Petugas</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-slate-950">Masuk ke Dashboard</h2>
        </div>
        
        <form className="grid gap-5" onSubmit={submitLogin}>
          <Field label="Username" required>
            <Input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} placeholder="Masukkan username" required />
          </Field>
          <Field label="Password" required>
            <Input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} placeholder="Masukkan password" required />
          </Field>
          <div className="flex items-center justify-end gap-3 text-sm">
            <button
              className="font-semibold text-slate-500 underline-offset-4 hover:text-simodar-red hover:underline"
              type="button"
              onClick={() => setSupportOpen(true)}
            >
              Butuh bantuan?
            </button>
          </div>
          <Button type="submit" className="min-h-12 text-base mt-2">
            Masuk
          </Button>
          <Button type="button" variant="soft" className="min-h-12 text-base mt-2" onClick={() => navigate("/")}>
            <ArrowLeft size={18} /> Kembali ke Beranda
          </Button>
        </form>
      </div>

      <div className="mt-8 text-center text-[10px] font-semibold text-slate-400/80 uppercase tracking-wider relative z-50">
        Designed & Developed by MFauzan • V 1.0.1
      </div>

      <Modal open={supportOpen} title="Bantuan SIMODAR" description="Jika Anda mengalami kendala aplikasi atau lupa password, silakan hubungi tim IT kami." onClose={() => setSupportOpen(false)} size="sm">
        <div className="mt-4 grid gap-3">
          <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-700 transition hover:bg-slate-50">
            Hubungi via WhatsApp
          </a>
          <a href="mailto:support@simodar.com" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-700 transition hover:bg-slate-50">
            <Mail className="text-slate-400" size={20} />
            Email ke support@simodar.com
          </a>
          <a href="https://instagram.com/simodar" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-700 transition hover:bg-slate-50">
            <Instagram className="text-slate-400" size={20} />
            Instagram @simodar
          </a>
        </div>
      </Modal>
    </main>
  );
}
