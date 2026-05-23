import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { type ExternalToast, toast } from 'sonner';

import type { MessageFn } from '@/lib/i18n/messages';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { m } from '@/paraglide/messages';

// Pairs the success-toast title with its Sonner options builder: callers must
// supply the message to use the builder. Omit both to skip the success toast
// entirely (e.g., when inline UI surfaces success).
type SuccessToast<TData, TVariables> =
  | {
      successMessage: MessageFn;
      successToastOptions?: (
        data: TData,
        variables: TVariables,
      ) => ExternalToast;
    }
  | { successMessage?: never; successToastOptions?: never };

// `mutationKey` doubles as the structured-log namespace via `.join('.')`.
// Caller `onError`/`onSuccess` run AFTER the wrapped toast/log/invalidate.
// `onMutate` is omitted because optimistic context isn't threaded through
// to caller callbacks.
type ResourceMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, unknown, TVariables>,
  'mutationFn' | 'onMutate'
> & {
  errorMessage: MessageFn;
  invalidate: QueryKey[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  mutationKey: readonly [string, ...string[]];
} & SuccessToast<TData, TVariables>;

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

function pickString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Resolve title and options inside the try so a throwing paraglide getter
// or `successToastOptions` builder doesn't propagate.
function safeToastSuccess(
  resolveTitle: () => string,
  action: string,
  resolveOptions?: () => ExternalToast,
): void {
  try {
    const title = resolveTitle();
    const options = resolveOptions?.();
    if (options) {
      toast.success(title, options);
    } else {
      toast.success(title);
    }
  } catch (error) {
    clientLog.warn({
      action: `${action}.successToast.failed`,
      errorMessage: describeError(error),
    });
  }
}

function safeToastError(
  resolveTitle: () => string,
  resolveDescription: () => string,
  action: string,
): void {
  try {
    toast.error(resolveTitle(), { description: resolveDescription() });
  } catch (error) {
    clientLog.warn({
      action: `${action}.errorToast.failed`,
      errorMessage: describeError(error),
    });
  }
}

export function useResourceMutation<TData, TVariables>({
  errorMessage,
  invalidate,
  mutationFn,
  mutationKey,
  successMessage,
  successToastOptions,
  ...mutationOpts
}: ResourceMutationOptions<TData, TVariables>): UseMutationResult<
  TData,
  unknown,
  TVariables
> {
  const queryClient = useQueryClient();
  const router = useRouter();
  const action = mutationKey.join('.');

  return useMutation<TData, unknown, TVariables>({
    // Spread first so the wrapped onError/onSuccess below override any
    // same-named caller fields.
    ...mutationOpts,
    mutationFn,
    mutationKey,
    onError: async (error, variables, onMutateResult, context) => {
      const parsed = parseError(error);
      const fix = pickString(parsed.fix);
      clientLog.error({
        action: `${action}.failed`,
        code: pickString(parsed.code) ?? undefined,
        errorMessage: pickString(parsed.message) ?? describeError(parsed.raw),
        errorStack: parsed.raw instanceof Error ? parsed.raw.stack : undefined,
        status: typeof parsed.status === 'number' ? parsed.status : 500,
      });

      // 422: generic validation title; description prefers a server-supplied
      // fix. `parsed.why` is never surfaced — it can leak internal detail.
      if (parsed.status === 422) {
        safeToastError(
          m['common.toast.validationError'],
          () => fix ?? m['common.toast.validationErrorDescription'](),
          action,
        );
      } else {
        safeToastError(
          errorMessage,
          () => fix ?? m['common.toast.tryAgainDescription'](),
          action,
        );
      }

      try {
        await mutationOpts.onError?.(error, variables, onMutateResult, context);
      } catch (callbackError) {
        clientLog.error({
          action: `${action}.postError.failed`,
          errorMessage: describeError(callbackError),
        });
      }
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (successMessage) {
        safeToastSuccess(
          successMessage,
          action,
          successToastOptions
            ? () => successToastOptions(data, variables)
            : undefined,
        );
      }

      const invalidations = invalidate.map(async (queryKey) => {
        try {
          await queryClient.invalidateQueries({ queryKey });
        } catch (error) {
          clientLog.warn({
            action: `${action}.invalidate.failed`,
            errorMessage: describeError(error),
          });
        }
      });

      invalidations.push(
        (async () => {
          try {
            await router.invalidate();
          } catch (error) {
            clientLog.warn({
              action: `${action}.routerInvalidate.failed`,
              errorMessage: describeError(error),
            });
          }
        })(),
      );

      await Promise.all(invalidations);

      if (mutationOpts.onSuccess) {
        try {
          await mutationOpts.onSuccess(
            data,
            variables,
            onMutateResult,
            context,
          );
        } catch (error) {
          clientLog.error({
            action: `${action}.postSuccess.failed`,
            errorMessage: describeError(error),
          });
        }
      }
    },
  });
}
