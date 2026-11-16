import { type ReactNode, useSyncExternalStore } from 'react';

import { getLocale, LocaleContext, subscribeLocale } from './index.js';

/** Wraps the app once (main.tsx) so every `useT()` follows the language. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
