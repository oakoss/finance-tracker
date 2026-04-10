import JSZip from 'jszip';

import type { UserExportData } from '@/modules/export/services/gather-user-data';

import { formatCsv } from '@/modules/export/services/format-csv';
import { formatJson } from '@/modules/export/services/format-json';

export type ExportResult = {
  contentType: string;
  data: string;
  filename: string;
};

export async function buildExport(
  userData: UserExportData,
  format: 'csv' | 'json',
): Promise<ExportResult> {
  if (format === 'json') {
    const json = formatJson(userData);
    const base64 = Buffer.from(json, 'utf8').toString('base64');
    return {
      contentType: 'application/json',
      data: base64,
      filename: 'finance-tracker-export.json',
    };
  }

  const csvFiles = formatCsv(userData);
  const zip = new JSZip();

  for (const [name, content] of csvFiles) {
    zip.file(name, content);
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const base64 = buffer.toString('base64');

  return {
    contentType: 'application/zip',
    data: base64,
    filename: 'finance-tracker-export.zip',
  };
}
