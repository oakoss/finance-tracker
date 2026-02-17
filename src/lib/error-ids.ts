export const errorIds = {
  authEmailLocaleSetFailed: 'auth.email.locale.set.failed',
  authEmailLocaleResetFailed: 'auth.email.locale.reset.failed',
  authEmailRenderFailed: 'auth.email.render.failed',
} as const;

export type ErrorId = (typeof errorIds)[keyof typeof errorIds];
