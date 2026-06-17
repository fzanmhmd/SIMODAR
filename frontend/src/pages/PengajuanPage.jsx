import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, getToken } from "../api.js";
import { Button, Card, Field, Input, Textarea, Modal, TimeInput } from "../components/ui.jsx";
import { useApiData } from "../hooks/useApiData.js";

export default function PengajuanPage({ toast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const fromAdmin = params.get("from") === "admin" && Boolean(getToken());
  const [code, setCode] = useState("");
  const [locations, setLocations] = useState([]);
  const [logistikOptions, setLogistikOptions] = useState([]);
  const [success, setSuccess] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef(null);
  const [newLocation, setNewLocation] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
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
    latitude: "",
    longitude: "",
    maps_url: "",
    logistik: [],
  });

  useEffect(() => {
    Promise.all([api("/submissions/next-code"), api("/locations"), api("/public/logistics")]).then(([next, locs, logs]) => {
      setCode(next.code);
      setLocations(locs.locations || []);
      setLogistikOptions(logs.logistics || []);
    });
  }, []);

  const filteredLocations = useMemo(() => {
    const keyword = form.instansi.trim().toLowerCase();
    if (!keyword) return locations.slice(0, 8);
    return locations
      .filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [form.instansi, locations]);

  function chooseLocation(location) {
    const mapsLink = location.maps_url || (location.latitude && location.longitude ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : "");
    setForm((current) => ({
      ...current,
      instansi: location.name,
      lokasi: location.address || "",
      latitude: location.latitude || "",
      longitude: location.longitude || "",
      maps_url: mapsLink,
    }));
    setLocationDropdownOpen(false);
  }

  function typeLocation(value) {
    const exact = locations.find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
    const exactMapsLink = exact?.maps_url || (exact?.latitude && exact?.longitude ? `https://www.google.com/maps?q=${exact.latitude},${exact.longitude}` : "");
    setForm((current) => ({
      ...current,
      instansi: value,
      lokasi: exact?.address || current.lokasi,
      latitude: exact?.latitude || current.latitude,
      longitude: exact?.longitude || current.longitude,
      maps_url: exactMapsLink || current.maps_url,
    }));
    setLocationDropdownOpen(true);
  }

  function triggerSubmit(event) {
    event.preventDefault();
    if (form.jam_selesai <= form.jam_mulai) return toast("Jam selesai harus lebih besar dari jam mulai.");
    setConfirmOpen(true);
  }

  async function executeSubmit() {
    if (!formRef.current) return;
    const payload = new FormData(formRef.current);
    payload.set("kode_pengajuan", code);
    payload.set("instansi", form.instansi);
    payload.set("logistik", form.logistik.join(","));
    payload.set("latitude", form.latitude);
    payload.set("longitude", form.longitude);
    payload.set("maps_url", form.maps_url);
    payload.set("jam_mulai", form.jam_mulai);
    payload.set("jam_selesai", form.jam_selesai);
    try {
      const result = await api("/submissions", { method: "POST", body: payload });
      setConfirmOpen(false);
      toast("Pengajuan mobile unit berhasil dikirim!");
      setSuccess(result.submission);
    } catch (error) {
      toast(error.message || "Gagal mengirim pengajuan.");
      setConfirmOpen(false);
    }
  }

  function handleCloseSuccess() {
    setSuccess(null);
    navigate(fromAdmin ? "/admin/dashboard" : "/");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Button type="button" variant="soft" onClick={() => navigate(fromAdmin ? "/admin/dashboard" : -1)}>
            Kembali
          </Button>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold text-simodar-red">Pengajuan Mobile Unit</p>
            <p className="text-sm text-slate-500">Kode: {code}</p>
          </div>
        </header>

        <form ref={formRef} className="grid gap-5 lg:grid-cols-[1fr_360px]" onSubmit={triggerSubmit}>
          <Card className="p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kode Pengajuan" required>
                <Input name="kode_pengajuan_view" value={code} readOnly className="bg-rose-50 font-bold text-simodar-red ring-1 ring-rose-200" />
              </Field>
              <div className="relative grid gap-2 text-sm font-semibold text-slate-700">
                <span>Instansi/Tempat Donor <b className="text-simodar-red">*</b></span>
                <Input
                  value={form.instansi}
                  onBlur={() => window.setTimeout(() => setLocationDropdownOpen(false), 140)}
                  onChange={(event) => typeLocation(event.target.value)}
                  onFocus={() => !newLocation && setLocationDropdownOpen(true)}
                  placeholder="Ketik atau pilih lokasi dari master"
                  readOnly={newLocation}
                  required={!newLocation}
                />
                {!newLocation && locationDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-rose-100 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,.14)] simodar-scrollbar">
                    {filteredLocations.length ? filteredLocations.map((item) => (
                      <button
                        type="button"
                        key={item.id || item.name}
                        className="w-full rounded-xl px-3 py-2 text-left hover:bg-rose-50 focus:bg-rose-50 focus:outline-none"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseLocation(item)}
                      >
                        <b className="block text-sm text-slate-900">{item.name}</b>
                        <small className="block truncate font-semibold text-slate-500">{item.address}</small>
                      </button>
                    )) : (
                      <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500">
                        Lokasi belum ada di master. Centang "Lokasi belum ada di daftar" untuk input tempat baru.
                      </div>
                    )}
                  </div>
                )}
                <small className="font-medium text-slate-500">Pilihan ini mengambil data dari Master Lokasi.</small>
              </div>
              <label className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-simodar-red"
                  checked={newLocation}
                  onChange={(event) => {
                    setNewLocation(event.target.checked);
                    setLocationDropdownOpen(false);
                    if (event.target.checked) setForm((current) => ({ ...current, instansi: "" }));
                  }}
                />
                Lokasi belum ada di daftar
              </label>
              {newLocation && (
                <Field label="Nama Instansi/Tempat Baru" required>
                  <Input value={form.instansi} onChange={(event) => setForm({ ...form, instansi: event.target.value })} placeholder="Masukkan tempat baru" required />
                </Field>
              )}
              <div className="md:col-span-2">
                <Field label="Alamat Lengkap" required>
                  <Textarea
                    name="lokasi"
                    value={form.lokasi}
                    onChange={(event) => setForm({ ...form, lokasi: event.target.value })}
                    placeholder="Masukkan alamat lengkap lokasi donor darah"
                    readOnly={!newLocation}
                    className={!newLocation ? "bg-slate-50 text-slate-500" : ""}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Link Google Maps" required hint="Terisi otomatis jika dari daftar. Jika tempat baru, tempel (paste) link Google Maps di sini.">
                  <Input
                    name="maps_url"
                    value={form.maps_url}
                    onChange={(event) => setForm({ ...form, maps_url: event.target.value })}
                    placeholder="Contoh: https://maps.app.goo.gl/..."
                    readOnly={!newLocation}
                    className={!newLocation ? "bg-slate-50 text-slate-500" : ""}
                    required
                  />
                </Field>
              </div>
              <Field label="Tanggal Kegiatan" required>
                <Input name="tanggal" type="date" value={form.tanggal} onChange={(event) => setForm({ ...form, tanggal: event.target.value })} required />
              </Field>
              <Field label="Estimasi Peserta" required>
                <Input name="peserta" type="number" min="50" value={form.peserta} onChange={(event) => setForm({ ...form, peserta: event.target.value })} placeholder="min 50 pendonor" required />
              </Field>
              <Field label="Jam Mulai" required>
                <TimeInput name="jam_mulai" value={form.jam_mulai} onChange={(event) => setForm({ ...form, jam_mulai: event.target.value })} required />
              </Field>
              <Field label="Jam Selesai" required>
                <TimeInput name="jam_selesai" value={form.jam_selesai} onChange={(event) => setForm({ ...form, jam_selesai: event.target.value })} required />
              </Field>
              <Field label="Nama PIC" required>
                <Input name="nama_pic" value={form.nama_pic} onChange={(event) => setForm({ ...form, nama_pic: event.target.value })} placeholder="Masukkan nama penanggung jawab" required />
              </Field>
              <Field label="WhatsApp PIC" required>
                <Input name="whatsapp_pic" value={form.whatsapp_pic} onChange={(event) => setForm({ ...form, whatsapp_pic: event.target.value })} placeholder="Contoh: 081234567890" required />
              </Field>
              <Field label="Email PIC" required>
                <Input name="email_pic" type="email" value={form.email_pic} onChange={(event) => setForm({ ...form, email_pic: event.target.value })} placeholder="Contoh: emailku@domain.com" required />
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
            <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
              <h3 className="font-display text-lg font-extrabold text-simodar-red">Informasi Penting</h3>
              
              <div className="mt-4 grid gap-5">
                <div>
                  <h4 className="text-sm font-extrabold text-rose-950">Ketentuan Umum</h4>
                  <ul className="mt-2 grid gap-1.5 text-[13px] text-rose-900 list-inside list-decimal font-medium leading-relaxed">
                    <li>Pengajuan H-1 atau dadakan H-10 hubungi admin terlebih dahulu.</li>
                    <li>Estimasi peserta minimal 50 calon pendonor.</li>
                    <li>Lokasi wajib memiliki parkir dan akses jalan/loading barang yang memadai.</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-extrabold text-rose-950">Syarat Pendonor</h4>
                  <ul className="mt-2 grid gap-1 text-xs text-rose-900 list-inside list-disc font-medium leading-relaxed">
                    <li>Sehat jasmani dan rohani</li>
                    <li>Usia minimal 17 tahun</li>
                    <li>Berat badan minimal 45 kg</li>
                    <li>Tekanan darah normal & Hb memenuhi syarat</li>
                    <li>Tidak sedang sakit atau minum obat tertentu</li>
                    <li>Tidur cukup & sudah makan sebelum donor</li>
                    <li>Wanita: tidak sedang hamil, menyusui, atau haid berat</li>
                  </ul>
                </div>

                <div className="rounded-xl bg-white/60 p-3 border border-rose-100">
                  <h4 className="text-[13px] font-extrabold text-rose-950">Dokumen Wajib</h4>
                  <p className="mt-1 text-[11px] text-rose-900 font-medium leading-relaxed">
                    Lampirkan <b>Surat Permohonan Kegiatan Mobile Unit Donor Darah</b> resmi yang ditandatangani penanggung jawab pada formulir di samping.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </form>
      </div>

      <Modal open={Boolean(success)} title="Pengajuan Terkirim" description="Simpan kode ini untuk cek status pengajuan." onClose={handleCloseSuccess} size="sm">
        {success && (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-rose-50 p-5 text-center">
              <p className="text-sm font-bold text-slate-500">Kode Pengajuan</p>
              <strong className="mt-2 block text-3xl font-extrabold text-simodar-red">{success.kode_pengajuan}</strong>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="soft"
                onClick={async () => {
                  if (success?.kode_pengajuan) {
                    await navigator.clipboard?.writeText(success.kode_pengajuan);
                    toast("Kode pengajuan berhasil disalin!");
                  }
                }}
              >
                Salin Kode
              </Button>
              <Button type="button" onClick={() => navigate(`/cek-pengajuan?kode=${success.kode_pengajuan}${fromAdmin ? "&from=admin" : ""}`)}>
                Cek Status
              </Button>
            </div>
            <Button type="button" variant="ghost" onClick={handleCloseSuccess}>
              Tutup
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Konfirmasi Pengajuan" description="Pastikan semua data yang Anda isi sudah benar.">
        <div className="mt-2 text-sm text-slate-600">
          Apakah Anda yakin ingin mengirim pengajuan mobile unit donor darah untuk lokasi <strong>{form.instansi}</strong> pada tanggal <strong>{form.tanggal}</strong>?
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => setConfirmOpen(false)}>
            Batal
          </Button>
          <Button type="button" onClick={executeSubmit}>
            Ya, Kirim Pengajuan
          </Button>
        </div>
      </Modal>
    </main>
  );
}
