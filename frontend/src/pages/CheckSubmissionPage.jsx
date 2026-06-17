import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, getToken } from "../api.js";
import { Button, Card, Input, StatusBadge } from "../components/ui.jsx";
import { Info } from "../components/Info.jsx";
import { formatDate } from "../utils/formatters.js";

export default function CheckSubmissionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const fromAdmin = params.get("from") === "admin" && Boolean(getToken());
  const backTarget = fromAdmin ? "/admin/dashboard" : "/";
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
        <button type="button" onClick={() => navigate(backTarget)} className="text-sm font-bold text-simodar-red">Kembali</button>
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
              <Info label="Estimasi Pendonor" value={`${submission.peserta || 0} pendonor`} />
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
