import { useState, useCallback, useEffect, useRef } from "react";

export function useToast() {
  const [toast, setToast] = useState("");
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setToast("");
  }, []);

  const show = useCallback((message, duration = 3200) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setToast("");
    }, duration);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return { toast, show, clear };
}
