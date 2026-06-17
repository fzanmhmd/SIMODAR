import { Button, Modal } from "./ui.jsx";

export function Toast({ message, onClose }) {
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

export function ConfirmModal({ confirm, onClose }) {
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
