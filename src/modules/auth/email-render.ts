import { render } from '@react-email/render';
import { type ReactElement } from 'react';

import { errorIds } from '@/lib/error-ids';
import { logError } from '@/lib/logger';
import { baseLocale, getLocale, setLocale } from '@/paraglide/runtime';

export type EmailLocale = ReturnType<typeof getLocale>;

type RenderEmailOptions = {
  locale?: EmailLocale;
};

export async function renderEmail(
  element: ReactElement,
  options: RenderEmailOptions = {},
) {
  const previousLocale = getLocale();
  const resolvedPreviousLocale = previousLocale ?? baseLocale;
  const nextLocale = options.locale ?? resolvedPreviousLocale;

  if (nextLocale !== resolvedPreviousLocale) {
    try {
      await setLocale(nextLocale, { reload: false });
    } catch (error) {
      const setError =
        error instanceof Error
          ? error
          : new Error('Failed to set email locale.', { cause: error });
      logError({
        context: {
          nextLocale,
          previousLocale: resolvedPreviousLocale,
        },
        error: setError,
        errorId: errorIds.authEmailLocaleSetFailed,
        message: 'Failed to set email locale before rendering.',
      });
      throw setError;
    }
  }

  let renderError: Error | undefined;
  let renderResult: { html: string; text: string } | undefined;

  try {
    const html = await render(element);
    const text = await render(element, { plainText: true });
    renderResult = { html, text };
  } catch (error) {
    const componentName =
      typeof element.type === 'string' ? element.type : element.type?.name;
    renderError =
      error instanceof Error
        ? error
        : new Error('Email render failed.', { cause: error });
    logError({
      context: {
        component: componentName ?? 'unknown',
        locale: nextLocale,
      },
      error: renderError,
      errorId: errorIds.authEmailRenderFailed,
      message: 'Failed to render auth email.',
    });
  }

  if (nextLocale !== resolvedPreviousLocale) {
    try {
      await setLocale(resolvedPreviousLocale, { reload: false });
    } catch (error) {
      const resetError =
        error instanceof Error
          ? error
          : new Error('Failed to reset email locale.', { cause: error });
      logError({
        context: {
          nextLocale,
          previousLocale: resolvedPreviousLocale,
        },
        error: resetError,
        errorId: errorIds.authEmailLocaleResetFailed,
        message: 'Failed to reset email locale.',
      });
      if (renderError) {
        throw new Error('Email render failed and locale reset failed.', {
          cause: [renderError, resetError],
        });
      }
      throw resetError;
    }
  }

  if (renderError) {
    throw renderError;
  }

  if (!renderResult) {
    const fallbackError = new Error('Email render failed with no result.');
    logError({
      context: {
        locale: nextLocale,
      },
      error: fallbackError,
      errorId: errorIds.authEmailRenderFailed,
      message: 'Email render returned no result without throwing.',
    });
    throw fallbackError;
  }

  return renderResult;
}
