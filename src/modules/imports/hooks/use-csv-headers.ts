import { useCallback, useState } from 'react';

import { clientLog } from '@/lib/logging/client-logger';
import { parseCsvString } from '@/modules/imports/lib/parse-csv';
import { m } from '@/paraglide/messages';

type CsvHeadersResult = {
  headers: string[];
  sampleRows: Record<string, string>[];
};

export function useCsvHeaders() {
  const [result, setResult] = useState<CsvHeadersResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback((file: File) => {
    setError(null);
    setResult(null);

    void (async () => {
      let text: string;
      try {
        text = await file.text();
      } catch (readError: unknown) {
        clientLog.error({ action: 'import.csv.fileRead', error: readError });
        setError(m['imports.upload.csvReadError']());
        return;
      }

      let parsed;
      try {
        parsed = parseCsvString(text, { maxRows: 6, skipEmptyLines: true });
      } catch (parseError: unknown) {
        clientLog.error({ action: 'import.csv.parse', error: parseError });
        setError(m['imports.upload.csvParseError']());
        return;
      }

      if (parsed.errorCount > 0 && parsed.data.length === 0) {
        setError(m['imports.upload.csvParseError']());
        return;
      }

      if (parsed.headers.length === 0) {
        setError(m['imports.upload.csvNoHeaders']());
        return;
      }

      setResult({
        headers: [...parsed.headers],
        sampleRows: parsed.data.slice(0, 5),
      });
    })();
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { error, parseFile, reset, result };
}
