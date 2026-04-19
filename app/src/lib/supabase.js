import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabaseConfigured = !!(supabaseUrl && supabaseKey);

if (!supabaseConfigured) {
  console.warn(
    'Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : createDummyClient();

/** Dummy client that returns empty results so the app renders with hardcoded defaults */
function createDummyClient() {
  const noData = { data: null, error: { message: 'Supabase not configured' } };

  function chainable() {
    const obj = {
      select: () => chainable(),
      insert: () => chainable(),
      update: () => chainable(),
      delete: () => chainable(),
      eq: () => chainable(),
      ilike: () => chainable(),
      order: () => chainable(),
      single: () => chainable(),
      // Make it awaitable — supabase-js query builders are thenables
      then: (resolve) => Promise.resolve(noData).then(resolve),
    };
    return obj;
  }

  return {
    from: () => chainable(),
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: null } }),
        list: () => Promise.resolve({ data: [], error: null }),
        upload: () => Promise.resolve(noData),
        remove: () => Promise.resolve(noData),
      }),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      signInWithPassword: () =>
        Promise.resolve({ error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({}),
    },
  };
}
