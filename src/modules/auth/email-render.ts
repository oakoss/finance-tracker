import { render } from '@react-email/render';
import { type ReactElement } from 'react';

import { createError } from '@/lib/logging/evlog';
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
      throw createError({
        cause: error instanceof Error ? error : new Error(String(error)),
        fix: 'Check that the locale is supported and paraglide is configured correctly.',
        message: 'Failed to set email locale.',
        status: 500,
        why: `Could not switch locale from "${resolvedPreviousLocale}" to "${nextLocale}".`,
      });
    }
  }

  let renderError: Error | undefined;
  let renderResult: { html: string; text: string } | undefined;

  try {
    const html = await render(element);
    const text = await render(element, { plainText: true });
    renderResult = { html, text };
  } catch (error) {
    renderError = createError({
      cause: error instanceof Error ? error : new Error(String(error)),
      fix: 'Check the email template for runtime errors or missing props.',
      message: 'Email render failed.',
      status: 500,
      why: 'The React Email component threw during rendering.',
    });
  }

  if (nextLocale !== resolvedPreviousLocale) {
    try {
      await setLocale(resolvedPreviousLocale, { reload: false });
    } catch (error) {
      const resetError = createError({
        cause: error instanceof Error ? error : new Error(String(error)),
        fix: 'Check paraglide locale configuration.',
        message: 'Failed to reset email locale.',
        status: 500,
        why: `Could not restore locale to "${resolvedPreviousLocale}" after rendering.`,
      });
      if (renderError) {
        throw createError({
          cause: new Error('Compound failure', {
            cause: [renderError, resetError],
          }),
          message: 'Email render failed and locale reset failed.',
          status: 500,
          why: 'Both the render and the locale reset threw errors.',
        });
      }
      throw resetError;
    }
  }

  if (renderError) {
    throw renderError;
  }

  if (!renderResult) {
    throw createError({
      fix: 'Check the email template returns valid JSX.',
      message: 'Email render returned no result.',
      status: 500,
      why: 'Render completed without throwing but produced no output.',
    });
  }

  return renderResult;
}
