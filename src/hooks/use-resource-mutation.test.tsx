import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { MessageFn } from '@/lib/i18n/messages';
import type { LocalizedString } from '@/paraglide/runtime';

import { createError } from '@/lib/logging/evlog';

import { useResourceMutation } from './use-resource-mutation';

const toastMocks = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

const routerInvalidate = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({
  toast: { error: toastMocks.error, success: toastMocks.success },
}));

vi.mock('@/lib/logging/client-logger', () => ({
  clientLog: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: routerInvalidate }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  routerInvalidate.mockImplementation(() => Promise.resolve());
});

const successMessage: MessageFn = () => 'Account created' as LocalizedString;
const errorMessage: MessageFn = () =>
  'Failed to create account' as LocalizedString;
const throwingMessage: MessageFn = () => {
  throw new Error('paraglide miss');
};

describe('useResourceMutation', () => {
  it('calls mutationFn with the supplied variables', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: 'a1' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useResourceMutation({
          errorMessage,
          invalidate: [['accounts']],
          mutationFn,
          mutationKey: ['account', 'create'],
          successMessage,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ name: 'Checking' });
    });

    // arg 2 is TanStack Query's internal context — not part of this hook's contract.
    expect(mutationFn).toHaveBeenCalledWith(
      { name: 'Checking' },
      expect.anything(),
    );
  });

  describe('on success', () => {
    it('shows the success toast', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve({ id: 'a1' }),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(toastMocks.success).toHaveBeenCalledWith('Account created');
    });

    it('invalidates every supplied query key', async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, 'invalidateQueries');
      const keys: QueryKey[] = [['accounts'], ['payees'], ['tags']];

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: keys,
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['transaction', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['accounts'] }),
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['payees'] }),
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['tags'] }),
      );
    });

    it('still runs router.invalidate when invalidate is empty', async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(spy).not.toHaveBeenCalled();
      expect(routerInvalidate).toHaveBeenCalledOnce();
      expect(toastMocks.success).toHaveBeenCalledWith('Account created');
    });

    it('triggers router.invalidate', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(routerInvalidate).toHaveBeenCalledOnce();
    });

    it('waits for invalidation before running caller onSuccess', async () => {
      let resolveInvalidation!: () => void;
      const invalidation = new Promise<void>((resolve) => {
        resolveInvalidation = resolve;
      });
      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = vi
        .spyOn(queryClient, 'invalidateQueries')
        .mockReturnValue(invalidation);
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['account', 'create'],
            onSuccess,
            successMessage,
          }),
        { wrapper },
      );

      let mutation!: Promise<null>;
      await act(async () => {
        mutation = result.current.mutateAsync({});
        await waitFor(() => {
          expect(invalidateSpy).toHaveBeenCalledOnce();
        });
      });

      expect(onSuccess).not.toHaveBeenCalled();

      await act(async () => {
        resolveInvalidation();
        await mutation;
      });

      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('skips the success toast when successMessage is omitted', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['merchantRules']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['merchantRule', 'reorder'],
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(toastMocks.success).not.toHaveBeenCalled();
      expect(routerInvalidate).toHaveBeenCalledOnce();
    });

    it('forwards (data, variables) to successToastOptions and into toast.success', async () => {
      const { wrapper } = createWrapper();
      const onClick = vi.fn();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['imports']],
            mutationFn: (vars: { fileName: string }) =>
              Promise.resolve({ fileName: vars.fileName, id: 'imp_1' }),
            mutationKey: ['import', 'create'],
            successMessage,
            successToastOptions: (data, variables) => ({
              action: { label: 'Review', onClick: () => onClick(data.id) },
              description: `Imported ${variables.fileName}`,
            }),
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({ fileName: 'jan.csv' });
      });

      expect(toastMocks.success).toHaveBeenCalledWith(
        'Account created',
        expect.objectContaining({
          action: expect.objectContaining({ label: 'Review' }),
          description: 'Imported jan.csv',
        }),
      );
    });

    it('forwards (data, variables) to the optional onSuccess callback', async () => {
      const onSuccess = vi.fn();
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: (vars: { name: string }) =>
              Promise.resolve({ id: 'a1', name: vars.name }),
            mutationKey: ['account', 'create'],
            onSuccess,
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({ name: 'Checking' });
      });

      expect(onSuccess).toHaveBeenCalledWith(
        { id: 'a1', name: 'Checking' },
        { name: 'Checking' },
        undefined,
        expect.anything(),
      );
    });

    it('isolates onSuccess callback throws — success path still completes', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve({ id: 'a1' }),
            mutationKey: ['account', 'create'],
            onSuccess: () => {
              throw new Error('analytics down');
            },
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(toastMocks.success).toHaveBeenCalledOnce();
      expect(toastMocks.error).not.toHaveBeenCalled();
      expect(clientLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'account.create.postSuccess.failed',
          errorMessage: 'analytics down',
        }),
      );
    });

    it('isolates async onSuccess rejections — success path still completes', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve({ id: 'a1' }),
            mutationKey: ['account', 'create'],
            onSuccess: async () => {
              await Promise.resolve();
              throw new Error('async analytics down');
            },
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(toastMocks.success).toHaveBeenCalledOnce();
      expect(toastMocks.error).not.toHaveBeenCalled();
      expect(clientLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'account.create.postSuccess.failed',
          errorMessage: 'async analytics down',
        }),
      );
    });

    it('still invalidates queries when successMessage thunk throws', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const onSuccessExtra = vi.fn();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['account', 'create'],
            onSuccess: onSuccessExtra,
            successMessage: throwingMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(invalidateSpy).toHaveBeenCalledOnce();
      expect(routerInvalidate).toHaveBeenCalledOnce();
      expect(onSuccessExtra).toHaveBeenCalledOnce();
      expect(clientLog.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'account.create.successToast.failed',
          errorMessage: 'paraglide miss',
        }),
      );
    });

    it('logs a warning if queryClient.invalidateQueries rejects', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const { queryClient, wrapper } = createWrapper();
      vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(
        new Error('cache offline'),
      );

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(toastMocks.success).toHaveBeenCalledWith('Account created');
      await waitFor(() => {
        expect(clientLog.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'account.create.invalidate.failed',
            errorMessage: 'cache offline',
          }),
        );
      });
    });

    it('logs a warning if router.invalidate rejects', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      routerInvalidate.mockImplementation(() =>
        Promise.reject(new Error('router offline')),
      );
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(toastMocks.success).toHaveBeenCalledWith('Account created');
      await waitFor(() => {
        expect(clientLog.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'account.create.routerInvalidate.failed',
            errorMessage: 'router offline',
          }),
        );
      });
    });
  });

  describe('on error', () => {
    it('emits clientLog.error with the `<action>.failed` event and shaped payload', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const error = createError({
        fix: 'Try again.',
        message: 'Boom',
        status: 500,
      });
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(error),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(clientLog.error).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'account.create.failed',
            errorMessage: 'Boom',
            errorStack: expect.stringContaining('Boom'),
            status: 500,
          }),
        );
      });
    });

    it('omits errorStack and defaults status to 500 when the thrown value is not an Error', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- intentional non-Error reject to cover the `errorStack: undefined` branch
            mutationFn: () => Promise.reject('plain string failure'),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(clientLog.error).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'account.create.failed',
            errorStack: undefined,
            status: 500,
          }),
        );
      });
    });

    it('uses the action namespace verbatim (no normalization)', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['transactions']],
            mutationFn: () => Promise.reject(new Error('boom')),
            mutationKey: ['transaction', 'updateSplitLines'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(clientLog.error).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'transaction.updateSplitLines.failed',
          }),
        );
      });
    });

    it('uses validation title with generic description on 422 with no server fix', async () => {
      const { wrapper } = createWrapper();
      const validationError = createError({
        message: 'Invalid payload',
        status: 422,
      });

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(validationError),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(toastMocks.error).toHaveBeenCalledExactlyOnceWith(
          'Check your input',
          {
            description: 'Please review the highlighted fields and try again.',
          },
        );
      });
    });

    it('uses validation title with server fix when a 422 supplies actionable copy', async () => {
      const { wrapper } = createWrapper();
      const validationError = createError({
        fix: 'Split lines must sum to 1234 cents.',
        message: 'Invalid payload',
        status: 422,
      });

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['transactions']],
            mutationFn: () => Promise.reject(validationError),
            mutationKey: ['transaction', 'updateSplitLines'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(toastMocks.error).toHaveBeenCalledWith('Check your input', {
          description: 'Split lines must sum to 1234 cents.',
        });
      });
    });

    it.each([400, 401, 403, 404, 409])(
      'routes %i status through the entity-error path (not the validation path)',
      async (status) => {
        const { wrapper } = createWrapper();
        const apiError = createError({
          fix: `Fix for ${status}.`,
          message: `Error ${status}`,
          status,
        });

        const { result } = renderHook(
          () =>
            useResourceMutation({
              errorMessage,
              invalidate: [['accounts']],
              mutationFn: () => Promise.reject(apiError),
              mutationKey: ['account', 'create'],
              successMessage,
            }),
          { wrapper },
        );

        await act(async () => {
          await result.current.mutateAsync({}).catch(() => {});
        });

        await waitFor(() => {
          expect(toastMocks.error).toHaveBeenCalledOnce();
        });
        expect(toastMocks.error).toHaveBeenCalledWith(
          'Failed to create account',
          { description: `Fix for ${status}.` },
        );
        // The validation copy must never appear for non-422 4xx.
        expect(toastMocks.error).not.toHaveBeenCalledWith(
          'Check your input',
          expect.anything(),
        );
      },
    );

    it('uses the entity title and parsed.fix as description on 500', async () => {
      const { wrapper } = createWrapper();
      const serverError = createError({
        fix: 'Check the database connection and try again.',
        message: 'Database unavailable',
        status: 500,
        why: 'Connection refused — internal detail that must not leak.',
      });

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(serverError),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(toastMocks.error).toHaveBeenCalledWith(
          'Failed to create account',
          { description: 'Check the database connection and try again.' },
        );
      });
    });

    it('drops parsed.why entirely from the description', async () => {
      const { wrapper } = createWrapper();
      const serverError = createError({
        message: 'Database unavailable',
        status: 500,
        why: 'Connection refused — internal detail.',
      });

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(serverError),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(toastMocks.error).toHaveBeenCalledOnce();
      });

      const [, options] = toastMocks.error.mock.calls[0];
      expect(options.description).not.toContain('Connection refused');
      expect(options.description).toBe('Try again in a moment.');
    });

    it('treats whitespace-only parsed.fix as missing and falls back', async () => {
      const { wrapper } = createWrapper();
      const serverError = createError({
        fix: '   ',
        message: 'Database unavailable',
        status: 500,
      });

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(serverError),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(toastMocks.error).toHaveBeenCalledWith(
          'Failed to create account',
          { description: 'Try again in a moment.' },
        );
      });
    });

    it('falls back to the generic try-again description when parsed.fix is missing', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(new Error('boom')),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(toastMocks.error).toHaveBeenCalledWith(
          'Failed to create account',
          { description: 'Try again in a moment.' },
        );
      });
    });

    it('forwards caller-supplied onError after the wrapped toast + log', async () => {
      const userOnError = vi.fn();
      const error = new Error('boom');
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(error),
            mutationKey: ['account', 'create'],
            onError: userOnError,
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      expect(toastMocks.error).toHaveBeenCalledOnce();
      expect(userOnError).toHaveBeenCalledWith(
        error,
        {},
        undefined,
        expect.anything(),
      );
    });

    it('forwards caller-supplied onError after validation errors', async () => {
      const userOnError = vi.fn();
      const validationError = createError({
        message: 'Invalid payload',
        status: 422,
      });
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(validationError),
            mutationKey: ['account', 'create'],
            onError: userOnError,
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      expect(toastMocks.error).toHaveBeenCalledWith('Check your input', {
        description: 'Please review the highlighted fields and try again.',
      });
      expect(userOnError).toHaveBeenCalledWith(
        validationError,
        {},
        undefined,
        expect.anything(),
      );
    });

    it('isolates async onError rejections', async () => {
      const { clientLog } = await import('@/lib/logging/client-logger');
      const { wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(new Error('boom')),
            mutationKey: ['account', 'create'],
            onError: async () => {
              await Promise.resolve();
              throw new Error('async cleanup down');
            },
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      expect(clientLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'account.create.postError.failed',
          errorMessage: 'async cleanup down',
        }),
      );
    });

    it('does not invalidate queries or call router.invalidate when the mutation fails', async () => {
      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(new Error('boom')),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(routerInvalidate).not.toHaveBeenCalled();
    });

    it('rejects mutateAsync with the original error', async () => {
      const { wrapper } = createWrapper();
      const error = new Error('boom');

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(error),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await expect(result.current.mutateAsync({})).rejects.toBe(error);
      });
    });

    it('exposes the rejected error on result.current.error and isError', async () => {
      const { wrapper } = createWrapper();
      const error = new Error('boom');

      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.reject(error),
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({}).catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
    });
  });

  describe('mutationKey', () => {
    it('derives the mutationKey by splitting the action namespace', async () => {
      const { queryClient, wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['transactions']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['transaction', 'updateSplitLines'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      const matches = queryClient
        .getMutationCache()
        .findAll({ mutationKey: ['transaction', 'updateSplitLines'] });
      expect(matches.length).toBeGreaterThan(0);
    });

    it('honors a caller-supplied mutationKey over the derived default', async () => {
      const { queryClient, wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => Promise.resolve(null),
            mutationKey: ['account', 'update', 'acc_42'],
            successMessage,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync({});
      });

      const scopedMatches = queryClient
        .getMutationCache()
        .findAll({ mutationKey: ['account', 'update', 'acc_42'] });
      expect(scopedMatches.length).toBeGreaterThan(0);

      const defaultMatches = queryClient
        .getMutationCache()
        .findAll({ exact: true, mutationKey: ['account', 'update'] });
      expect(defaultMatches).toHaveLength(0);
    });
  });

  describe('mutation state', () => {
    it('flips isPending while the mutation is in flight, then settles to isSuccess', async () => {
      let resolveFn!: (value: { id: string }) => void;
      const pending = new Promise<{ id: string }>((resolve) => {
        resolveFn = resolve;
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useResourceMutation({
            errorMessage,
            invalidate: [['accounts']],
            mutationFn: () => pending,
            mutationKey: ['account', 'create'],
            successMessage,
          }),
        { wrapper },
      );

      act(() => {
        result.current.mutate({});
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await act(async () => {
        resolveFn({ id: 'a1' });
        await pending;
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isPending).toBe(false);
      });
    });
  });
});
