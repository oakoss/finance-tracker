import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { exportUserData } from '@/modules/export/api/export-user-data';
import { m } from '@/paraglide/messages';

function triggerDownload(
  base64: string,
  filename: string,
  contentType: string,
) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.codePointAt(0)!);
  const blob = new Blob([bytes], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataExportSection() {
  const formatItems: Record<string, string> = {
    csv: m['profile.export.formatCsv'](),
    json: m['profile.export.formatJson'](),
  };
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef(false);

  const handleDownload = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setLoading(true);
    try {
      const result = await exportUserData({ data: { format } });
      if (result) {
        triggerDownload(result.data, result.filename, result.contentType);
        toast.success(m['profile.export.toast.success']());
      }
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'export.download.failed',
        error: parsed.message,
      });
      toast.error(m['profile.export.toast.error'](), {
        description: parsed.fix ?? parsed.why,
      });
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m['profile.export.title']()}</CardTitle>
        <CardDescription>{m['profile.export.description']()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium" htmlFor="export-format">
            {m['profile.export.formatLabel']()}
          </label>
          <Select
            disabled={loading}
            items={formatItems}
            value={format}
            onValueChange={(v) => {
              if (v === 'csv' || v === 'json') setFormat(v);
            }}
          >
            <SelectTrigger className="w-36" id="export-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                {m['profile.export.formatCsv']()}
              </SelectItem>
              <SelectItem value="json">
                {m['profile.export.formatJson']()}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button loading={loading} onClick={() => void handleDownload()}>
          <Icons.Download />
          {m['profile.export.download']()}
        </Button>
      </CardFooter>
    </Card>
  );
}
