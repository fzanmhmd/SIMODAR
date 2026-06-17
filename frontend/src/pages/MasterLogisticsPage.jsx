import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { Button, Field, Input, Modal } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { useApiData } from "../hooks/useApiData.js";

export default function MasterLogisticsPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/logistics", []);
  const [active, setActive] = useState(null);

  if (loading) return <LoadingPanel />;
  const logisticsList = (data.logistics || []).map((name, index) => ({ id: index, name }));

  return (
    <>
      <PageHeader eyebrow="Data Master" title="Master Logistik" subtitle="Kelola item kuesioner logistik yang akan dipilih oleh calon penyelenggara.">
        <Button onClick={() => setActive({ isNew: true, name: "" })}>
          <Plus size={17} /> Tambah Logistik
        </Button>
      </PageHeader>
      
      <DataTable 
        rows={logisticsList} 
        empty="Belum ada item logistik." 
        columns={[
          { key: "no", label: "No.", render: (row) => <span className="text-sm font-semibold text-slate-500">{row.id + 1}</span> },
          { key: "name", label: "Nama Item Logistik", render: (row) => <strong className="font-bold text-slate-900">{row.name}</strong> },
          { 
            key: "aksi", 
            label: "Aksi", 
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="soft" onClick={() => setActive({ id: row.id, name: row.name })}>Edit</Button>
                <Button 
                  variant="danger" 
                  onClick={() => confirm(`Hapus item logistik ${row.name}?`, async () => { 
                    const result = await api(`/admin/logistics/${row.id}`, { method: "DELETE" }); 
                    toast(result.message); 
                    reload(); 
                  })}
                >
                  Hapus
                </Button>
              </div>
            ) 
          },
        ]} 
      />

      <LogisticsModal 
        open={Boolean(active)} 
        item={active} 
        onClose={() => setActive(null)} 
        onSave={(payload) => confirm(`Simpan item logistik ${payload.name}?`, async () => { 
          const method = active.isNew ? "POST" : "PUT"; 
          const path = active.isNew ? `/admin/logistics` : `/admin/logistics/${active.id}`; 
          const result = await api(path, { method, body: payload }); 
          toast(result.message); 
          setActive(null); 
          reload(); 
        })} 
      />
    </>
  );
}

function LogisticsModal({ open, item, onClose, onSave }) {
  const [name, setName] = useState("");
  
  useEffect(() => {
    if (item) setName(item.name || "");
  }, [item]);

  return (
    <Modal open={open} title={item?.isNew ? "Tambah Item Logistik" : "Edit Item Logistik"} description="Item ini akan muncul sebagai opsi checkbox di form pengajuan mobile unit." onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        <Field label="Nama Item (Misal: Tenda, Listrik, Konsumsi)" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Masukkan nama logistik" />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="soft" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave({ name })}>Simpan</Button>
      </div>
    </Modal>
  );
}
