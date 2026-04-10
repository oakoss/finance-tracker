import { useRouteContext, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import { formatDate } from '@/lib/i18n/date';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { initiateAccountDeletion } from '@/modules/auth/api/initiate-account-deletion';
import { exportUserData } from '@/modules/export/api/export-user-data';
import { m } from '@/paraglide/messages';

type Step = 'confirm' | 'export-prompt' | 'idle';

export function DangerZoneSection() {
  const { session } = useRouteContext({ from: '/_app' });
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportUserData({ data: { format: 'json' } });
      if (result) {
        const bytes = Uint8Array.from(
          atob(result.data),
          (c) => c.codePointAt(0)!,
        );
        const blob = new Blob([bytes], { type: result.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'profile.deleteAccount.export.failed',
        error: parsed.message,
      });
      toast.warning(m['profile.export.toast.error']());
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await initiateAccountDeletion({ data: undefined });
      if (result) {
        const date = formatDate({ value: new Date(result.purgeAfter) });
        toast.info(m['profile.deleteAccount.scheduled']({ date }));
        void router.invalidate();
      }
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'profile.deleteAccount.failed',
        error: parsed.message,
      });
      toast.error(m['profile.deleteAccount.title'](), {
        description: parsed.fix ?? parsed.why,
      });
    } finally {
      setIsDeleting(false);
      setStep('idle');
    }
  };

  return (
    <Card className="ring-destructive/30">
      <CardHeader>
        <CardTitle>{m['profile.dangerZone.title']()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {m['profile.deleteAccount.title']()}
            </p>
            <p className="text-sm text-muted-foreground">
              {m['profile.deleteAccount.description']()}
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setStep('export-prompt')}
          >
            {m['profile.deleteAccount.title']()}
          </Button>
        </div>
      </CardContent>

      <AlertDialog
        open={step === 'export-prompt'}
        onOpenChange={(open) => {
          if (!open) setStep('idle');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m['profile.deleteAccount.exportPrompt.title']()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m['profile.deleteAccount.exportPrompt.description']()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m['actions.cancel']()}</AlertDialogCancel>
            <Button
              loading={isExporting}
              variant="outline"
              onClick={() => void handleExport()}
            >
              <Icons.Download />
              {m['profile.deleteAccount.exportPrompt.exportButton']()}
            </Button>
            <AlertDialogAction
              variant="destructive"
              onClick={() => setStep('confirm')}
            >
              {m['profile.deleteAccount.exportPrompt.continueButton']()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDestructiveDialog
        confirmPhrase={session.user.email}
        description={m['profile.deleteAccount.confirmDescription']()}
        loading={isDeleting}
        open={step === 'confirm'}
        title={m['profile.deleteAccount.title']()}
        onConfirm={() => void handleDeleteAccount()}
        onOpenChange={(open) => {
          if (!open) setStep('idle');
        }}
      />
    </Card>
  );
}
