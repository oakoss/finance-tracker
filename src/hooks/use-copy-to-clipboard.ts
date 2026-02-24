import { useCallback, useEffect, useRef, useState } from 'react';

type UseCopyToClipboardOptions = {
  timeout?: number;
};

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { timeout = 2000 } = options;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    (value: string) => {
      if (!navigator.clipboard) return;

      void navigator.clipboard.writeText(value).then(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), timeout);
      });
    },
    [timeout],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { copied, copy };
}
