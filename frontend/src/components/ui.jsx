import { X } from "lucide-react";

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-simodar-red text-white hover:bg-simodar-deep",
    soft: "border border-rose-200 bg-white text-simodar-deep hover:bg-rose-50",
    danger: "bg-red-900 text-white hover:bg-red-950",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-rose-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return <section className={`smooth-card rounded-2xl border border-slate-200 bg-white shadow-soft ${className}`}>{children}</section>;
}

export function Field({ label, required, children, hint }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>
        {label} {required && <b className="text-simodar-red">*</b>}
      </span>
      {children}
      {hint && <small className="font-medium text-slate-500">{hint}</small>}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-simodar-red focus:ring-4 focus:ring-rose-100"
      {...props}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-simodar-red focus:ring-4 focus:ring-rose-100"
      {...props}
    />
  );
}

export function Select(props) {
  return (
    <select
      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-simodar-red focus:ring-4 focus:ring-rose-100"
      {...props}
    />
  );
}

export function Modal({ open, title, description, children, onClose, size = "md" }) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" };
  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-white/75 backdrop-blur-md" onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div
        className={`modal-stable fixed left-1/2 top-1/2 max-h-[86dvh] w-[calc(100vw-24px)] ${sizes[size]} overflow-y-auto rounded-2xl border border-rose-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,.18)] simodar-scrollbar`}
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-rose-100 pb-4">
          <div>
            <h2 className="font-display text-xl font-extrabold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <Button type="button" variant="ghost" className="h-9 min-h-9 w-9 rounded-full p-0" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ children = "Belum ada data." }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">{children}</div>;
}

export function StatusBadge({ children }) {
  const text = String(children || "");
  const tone = text.includes("Selesai")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : text.includes("Tolak") || text.includes("Batal")
      ? "bg-red-50 text-red-700 ring-red-100"
      : text.includes("Siap")
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-amber-50 text-amber-700 ring-amber-100";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{children}</span>;
}
