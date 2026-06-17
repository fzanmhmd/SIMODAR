import { useState, useEffect } from "react";
import { api, setToken } from "../api.js";
import { Button, Card, Field, Input } from "../components/ui.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { Info } from "../components/Info.jsx";

export default function ProfilePage({ user, onProfileUpdated, toast, confirm }) {
  const [form, setForm] = useState({ name: "", username: "", password: "", confirmPassword: "" });

  useEffect(() => {
    setForm({
      name: user?.name || "",
      username: user?.username || "",
      password: "",
      confirmPassword: "",
    });
  }, [user]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    if (!form.name.trim() || !form.username.trim()) return toast("Nama dan username wajib diisi.");
    if (form.password && form.password !== form.confirmPassword) return toast("Konfirmasi password belum sesuai.");
    confirm(`Simpan perubahan profil ${form.name}?`, async () => {
      const result = await api("/auth/profile", {
        method: "PUT",
        body: {
          name: form.name,
          username: form.username,
          password: form.password,
        },
      });
      setToken(result.token);
      onProfileUpdated(result.user);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      toast(result.message);
    });
  }

  return (
    <>
      <PageHeader eyebrow="Akun" title="Profil Akun" subtitle="Kelola nama, username, dan password akun login SIMODAR." />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama Petugas" required>
              <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Nama lengkap" />
            </Field>
            <Field label="Username" required>
              <Input value={form.username} onChange={(event) => update("username", event.target.value)} placeholder="Username login" />
            </Field>
            <Field label="Password Baru" hint="Kosongkan jika tidak ingin mengganti password.">
              <Input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Password baru" />
            </Field>
            <Field label="Konfirmasi Password">
              <Input type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} placeholder="Ulangi password baru" />
            </Field>
          </div>
          {form.password && form.password !== form.confirmPassword && (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">Konfirmasi password belum sama.</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="soft" onClick={() => setForm({ name: user?.name || "", username: user?.username || "", password: "", confirmPassword: "" })}>
              Reset
            </Button>
            <Button type="button" onClick={saveProfile}>
              Simpan Profil
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-simodar-red">Akun Aktif</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 font-display text-xl font-extrabold text-simodar-red">
              {(user?.name || user?.username || "S").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <b className="block text-lg text-slate-950">{user?.name || "-"}</b>
              <span className="text-sm font-semibold text-slate-500">@{user?.username || "-"}</span>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 text-sm">
            <Info label="Role Login" value={user?.role?.toUpperCase()} />
            <Info label="Akses" value={(user?.roles || []).join(", ") || user?.role} />
          </dl>
        </Card>
      </div>
    </>
  );
}
