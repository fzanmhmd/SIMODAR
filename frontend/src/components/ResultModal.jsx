import { useState, useEffect } from "react";
import { Button, Field, Input, Modal, Textarea } from "./ui.jsx";
import { Download } from "lucide-react";

export function ResultModal({ open, activity, onClose, onSave, readOnly = false }) {
  const [form, setForm] = useState({ donor_terdaftar: "", donor_berhasil: "", donor_gagal: "", kantong_darah: "", snack_terpakai: "", catatan: "" });
  const [images, setImages] = useState([]);
  const [keptImages, setKeptImages] = useState([]);
  const [imageNote, setImageNote] = useState("");
  const resultFields = [
    ["donor_terdaftar", "Donor Terdaftar"],
    ["donor_berhasil", "Donor Berhasil"],
    ["donor_gagal", "Donor Gagal"],
    ["kantong_darah", "Kantong Darah"],
    ["snack_terpakai", "Snack Terpakai"],
  ];

  useEffect(() => {
    setForm({
      donor_terdaftar: activity?.result?.donor_terdaftar || "",
      donor_berhasil: activity?.result?.donor_berhasil || "",
      donor_gagal: activity?.result?.donor_gagal || "",
      kantong_darah: activity?.result?.kantong_darah || "",
      snack_terpakai: activity?.result?.snack_terpakai || "",
      catatan: activity?.result?.catatan || "",
    });
    setImages([]);
    setKeptImages(Array.isArray(activity?.result?.images) ? activity.result.images : []);
    setImageNote("");
  }, [activity]);

  const remainingSlots = Math.max(0, 3 - keptImages.length - images.length);
  const totalImages = keptImages.length + images.length;
  const imageRequirementMet = totalImages === 3;
  const requiredFieldsMet = Object.entries(form)
    .filter(([key]) => key !== "catatan")
    .every(([_, value]) => String(value).trim() !== "");

  const terdaftar = Number(form.donor_terdaftar) || 0;
  const berhasil = Number(form.donor_berhasil) || 0;
  const gagal = Number(form.donor_gagal) || 0;
  const kantong = Number(form.kantong_darah) || 0;
  
  const validDonors = (berhasil + gagal) <= terdaftar;
  const validBloodBags = kantong <= terdaftar;
  const dataValid = form.donor_terdaftar === "" || (validDonors && validBloodBags);

  const saveEnabled = imageRequirementMet && requiredFieldsMet && dataValid;

  function selectImages(event) {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const availableSlots = remainingSlots;
    const accepted = selected.slice(0, availableSlots);
    setImages((current) => [...current, ...accepted]);
    setImageNote(selected.length > availableSlots ? `Wajib total 3 gambar. Hanya ${availableSlots} gambar lagi yang bisa ditambahkan.` : "");
    event.target.value = "";
  }

  function removeSelectedImage(index) {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setImageNote("");
  }

  function removeExistingImage(url) {
    setKeptImages((current) => current.filter((img) => img.url !== url));
    setImageNote("");
  }

  function save() {
    if (readOnly) return;
    if (!requiredFieldsMet) {
      setImageNote("Semua field hasil kegiatan wajib diisi.");
      return;
    }
    if (!dataValid) {
      setImageNote("Periksa kembali data akumulasi donor dan kantong darah.");
      return;
    }
    if (!imageRequirementMet) {
      setImageNote(`Upload wajib tepat 3 gambar kegiatan. Saat ini baru ${totalImages}/3.`);
      return;
    }
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    images.forEach((file) => payload.append("images", file));
    keptImages.forEach((img) => payload.append("keep_images", img.url));
    onSave(payload);
  }

  return (
    <Modal
      open={open}
      title={readOnly ? "Detail Hasil Kegiatan" : "Input Hasil Kegiatan"}
      description={activity ? `${readOnly ? "Melihat" : "Sedang eksekusi"} data: ${activity.instansi}` : ""}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {resultFields.map(([key, label]) => (
          <Field key={key} label={label} required>
            <Input
              type="number"
              min="0"
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              required
              disabled={readOnly}
            />
          </Field>
        ))}
        <div className="md:col-span-2">
          <Field label="Catatan">
            <Textarea
              value={form.catatan}
              onChange={(event) => setForm({ ...form, catatan: event.target.value })}
              disabled={readOnly}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          {keptImages.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gambar yang Tersimpan</p>
              <div className="grid grid-cols-3 gap-2">
                {keptImages.map((img, index) => (
                  <div key={img.url || index} className="relative group overflow-hidden rounded-xl border border-slate-200 aspect-video bg-slate-100 shadow-soft">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.url)}
                        className="absolute inset-0 bg-rose-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-extrabold text-white transition-opacity duration-200"
                      >
                        Hapus Gambar
                      </button>
                    )}
                    {readOnly && (
                      <a
                        href={img.url}
                        download={`dokumentasi-kegiatan-${index + 1}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-xs font-extrabold text-white transition-opacity duration-200"
                      >
                        <Download size={14} /> Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!readOnly && (
            <Field label="Upload Gambar Kegiatan" required hint="Wajib tepat 3 gambar kegiatan. Format gambar umum seperti JPG, PNG, atau WebP.">
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={remainingSlots === 0}
                onChange={selectImages}
                className="w-full rounded-xl border border-dashed border-rose-200 bg-rose-50/50 px-3 py-3 text-sm font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-simodar-red file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
              />
            </Field>
          )}

          <div className="mt-2 grid gap-2 text-xs font-semibold text-slate-500">
            {!readOnly && images.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Gambar Baru Ditambahkan</p>
                {images.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-rose-100">
                    <span className="min-w-0 truncate">{index + 1}. {file.name}</span>
                    <button type="button" className="font-extrabold text-simodar-red" onClick={() => removeSelectedImage(index)}>Hapus</button>
                  </div>
                ))}
              </div>
            )}
            {!readOnly && (
              <>
                <p className={imageRequirementMet ? "text-emerald-700" : "text-simodar-red"}>Total gambar: {totalImages}/3 wajib.</p>
                {!requiredFieldsMet && <p className="text-simodar-red">Semua field hasil kegiatan wajib diisi.</p>}
                {form.donor_terdaftar !== "" && !validDonors && <p className="text-simodar-red">Total donor berhasil & gagal tidak boleh lebih dari donor terdaftar.</p>}
                {form.donor_terdaftar !== "" && !validBloodBags && <p className="text-simodar-red">Kantong darah tidak boleh lebih dari donor terdaftar.</p>}
                {imageNote && <p className="text-amber-700">{imageNote}</p>}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {readOnly ? (
          <Button onClick={onClose}>Tutup</Button>
        ) : (
          <>
            <Button variant="soft" onClick={onClose}>Batal</Button>
            <Button disabled={!saveEnabled} onClick={save}>Simpan Hasil</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
