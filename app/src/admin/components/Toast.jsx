import { useState, useCallback } from 'react';

export function useToast() {
  const [msg, setMsg] = useState(null);

  const toast = useCallback((text) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  }, []);

  const ToastEl = msg ? <div className="admin-toast">{msg}</div> : null;

  return { toast, ToastEl };
}
