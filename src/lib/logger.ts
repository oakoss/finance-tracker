import type { ErrorId } from '@/lib/error-ids';

type LogErrorContext = Record<string, unknown>;

type LogErrorOptions = {
  context?: LogErrorContext;
  error: Error;
  errorId: ErrorId;
  message: string;
};

export function logError({
  context,
  error,
  errorId,
  message,
}: LogErrorOptions) {
  console.error(message, {
    context,
    error,
    errorId,
  });
}
