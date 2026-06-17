import { X, Clock } from "lucide-react";
import { useEffect, useRef } from "react";

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-simodar-red text-white hover:bg-simodar-deep",
    soft: "border border-rose-200 bg-white text-simodar-deep hover:bg-rose-50",
    danger: "bg-red-900 text-white hover:bg-red-950",
    ghost: "text-slate-600 hover:bg-slate-100",
    outline: "border border-simodar-red bg-white text-simodar-red hover:bg-rose-50 shadow-sm transition-all",
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

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-simodar-red focus:ring-4 focus:ring-rose-100 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-simodar-red focus:ring-4 focus:ring-rose-100 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }) {
  return (
    <select
      className={`min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-simodar-red focus:ring-4 focus:ring-rose-100 ${className}`}
      {...props}
    />
  );
}

export function Modal({ open, title, description, children, onClose, size = "md" }) {
  const modalRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    window.requestAnimationFrame(() => {
      modalRef.current?.focus();
      modalRef.current?.scrollTo({ top: 0 });
    });
    return () => {
      setTimeout(() => {
        if (!document.querySelector(".modal-backdrop")) {
          document.body.classList.remove("overflow-hidden");
        }
      }, 10);
    };
  }, [open]);

  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-5xl", "2xl": "max-w-7xl" };
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-white/75 p-3 backdrop-blur-md sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`modal-stable relative max-h-[calc(100dvh-24px)] w-full ${sizes[size]} overflow-y-auto rounded-2xl border border-rose-200 bg-white p-4 shadow-[0_28px_90px_rgba(15,23,42,.18)] outline-none simodar-scrollbar sm:p-5`}
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
  const lowerText = text.toLowerCase();
  const tone = lowerText.includes("selesai")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : lowerText.includes("tolak")
      ? "bg-red-50 text-red-700 ring-red-100"
      : lowerText.includes("batal")
        ? "bg-yellow-50 text-yellow-700 ring-yellow-100"
        : lowerText.includes("siap")
          ? "bg-blue-50 text-blue-700 ring-blue-100"
          : "bg-amber-50 text-amber-700 ring-amber-100";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{children}</span>;
}

export function TimeInput({ value = "", onChange, name, required, ...props }) {
  const handleChange = (e) => {
    let raw = e.target.value;
    
    // Get digits only
    let digits = raw.replace(/\D/g, "");
    if (digits.length > 4) digits = digits.slice(0, 4);
    
    let formatted = digits;
    if (digits.length > 2) {
      let hh = digits.slice(0, 2);
      let mm = digits.slice(2);
      
      const hhNum = parseInt(hh, 10);
      if (hhNum > 23) hh = "23";
      
      const mmNum = parseInt(mm, 10);
      if (mmNum > 59) mm = "59";
      
      formatted = `${hh}:${mm}`;
    } else if (digits.length === 1) {
      const hhNum = parseInt(digits, 10);
      if (hhNum > 2) {
        formatted = `0${hhNum}`;
      }
    }
    
    onChange({
      target: {
        name,
        value: formatted,
      },
    });
  };

  const handleBlur = (e) => {
    let val = e.target.value;
    if (!val) return;
    
    let parts = val.split(":");
    let hh = parts[0] || "00";
    let mm = parts[1] || "00";
    
    hh = String(Math.min(23, parseInt(hh, 10) || 0)).padStart(2, "0");
    mm = String(Math.min(59, parseInt(mm, 10) || 0)).padStart(2, "0");
    
    onChange({
      target: {
        name,
        value: `${hh}:${mm}`,
      },
    });
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        name={name}
        placeholder={props.placeholder || "hh:mm"}
        maxLength={5}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-simodar-red focus:ring-4 focus:ring-rose-100"
        required={required}
        {...props}
      />
      <Clock className="absolute left-3.5 text-slate-400" size={16} />
    </div>
  );
}
