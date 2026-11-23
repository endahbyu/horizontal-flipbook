// The URL hash holds the open page (see composables/useSite.ts), not an element id,
// so the router must not try to scroll to it.
import type { RouterConfig } from '@nuxt/schema';

export default { scrollBehavior: () => false } satisfies RouterConfig;
