import { useEffect, useState } from 'react';

export function useToast(timeoutMs = 2600) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [toast, timeoutMs]);

  return { showToast: setToast, toast };
}
