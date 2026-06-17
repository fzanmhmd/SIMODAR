export function WhatsAppIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path d="M4.7 19.3 5.8 16.1a8 8 0 1 1 3.1 2.7l-4.2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.4 8.2c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c-.1.2-.2.4 0 .6.5.9 1.2 1.7 2.2 2.2.2.1.4.1.6-.1l.6-.5c.2-.2.4-.2.7-.1l1.6.8c.3.1.4.3.4.6v.5c0 .4-.2.6-.5.8-.7.4-1.6.5-2.7.1-2.6-.8-5.1-3.3-5.9-5.8-.4-1.1-.2-2 .2-2.8Z" fill="currentColor" />
    </svg>
  );
}

export function BloodBagIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path d="M9 3h6v3l1.8 1.6c.8.7 1.2 1.7 1.2 2.8V18a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-7.6c0-1.1.4-2.1 1.2-2.8L9 6V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 3h4M9 13h6M12 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 17.2c1.6 1 6.4 1 8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProgressIcon({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" opacity=".28" />
      <path d="M12 4a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
