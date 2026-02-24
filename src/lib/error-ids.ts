export const errorIds = {
  authEmailLocaleResetFailed: 'auth.email.locale.reset.failed',
  authEmailLocaleSetFailed: 'auth.email.locale.set.failed',
  authEmailRenderFailed: 'auth.email.render.failed',
} as const;

export type ErrorId = (typeof errorIds)[keyof typeof errorIds];
