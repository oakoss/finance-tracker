import { useCallback, useEffect, useRef, useState } from 'react';

import { clientLog } from '@/lib/logging/client-logger';

type UseCopyToClipboardOptions = {
  timeout?: number;
};

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { timeout = 2000 } = options;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    (value: string) => {
      if (!navigator.clipboard) {
        clientLog.warn({
          action: 'clipboard.copy',
          outcome: { reason: 'unsupported', success: false },
        });
        return;
      }

      void navigator.clipboard.writeText(value).then(
        () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setCopied(true);
          timeoutRef.current = setTimeout(() => setCopied(false), timeout);
        },
        (error: unknown) => {
          clientLog.error({
            action: 'clipboard.copy',
            error: error instanceof Error ? error.message : String(error),
            outcome: { success: false },
          });
        },
      );
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
