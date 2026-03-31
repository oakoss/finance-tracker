import Papa from 'papaparse';

export type CsvParseResult = {
  readonly data: readonly Record<string, string>[];
  readonly errorCount: number;
  readonly headers: readonly string[];
};

export type CsvParseOptions = { maxRows?: number; skipEmptyLines?: boolean };

export function parseCsvString(
  input: string,
  options?: CsvParseOptions,
): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(input, {
    header: true,
    preview: options?.maxRows,
    skipEmptyLines: options?.skipEmptyLines ?? false,
  });

  return {
    data: parsed.data,
    errorCount: parsed.errors.length,
    headers: parsed.meta.fields ?? [],
  };
}
