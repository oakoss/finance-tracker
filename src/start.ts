import { type AnyStartInstance, createStart } from '@tanstack/react-start';

import { csrfMiddleware } from '@/lib/start/csrf';

// `AnyStartInstance` breaks the `Register.config -> startInstance` inference
// cycle introduced by the route tree footer; the runtime shape is unchanged.
export const startInstance: AnyStartInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
