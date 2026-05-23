import type { LocalizedString } from '@/paraglide/runtime';

// Paraglide message getter. Branded return rejects plain `() => string`
// thunks at compile time, blocking accidentally-untranslated literals.
export type MessageFn = () => LocalizedString;
