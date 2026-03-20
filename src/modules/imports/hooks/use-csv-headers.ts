import Papa from 'papaparse';
import { useCallback, useState } from 'react';

import { clientLog } from '@/lib/logging/client-logger';
import { m } from '@/paraglide/messages';

type CsvParseResult = {
  headers: string[];
  sampleRows: Record<string, string>[];
};

export function useCsvHeaders() {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback((file: File) => {
    setError(null);
    setResult(null);

    Papa.parse<Record<string, string>>(file, {
      complete: (parsed) => {
        if (parsed.errors.length > 0 && parsed.data.length === 0) {
          setError(m['imports.upload.csvParseError']());
          return;
        }

        const headers = parsed.meta.fields ?? [];
        if (headers.length === 0) {
          setError(m['imports.upload.csvNoHeaders']());
          return;
        }

        setResult({ headers, sampleRows: parsed.data.slice(0, 5) });
      },
      error: (err) => {
        clientLog.error({ action: 'import.csv.parse', error: err });
        setError(m['imports.upload.csvReadError']());
      },
      header: true,
      preview: 6,
      skipEmptyLines: true,
    });
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { error, parseFile, reset, result };
}
