import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { WEDDING_CONFIG } from '../lib/config';

const DB_KEY_TO_CONFIG = {
  groom_name: 'groomName',
  groom_short: 'groomShort',
  bride_name: 'brideName',
  bride_short: 'brideShort',
  wedding_date: 'weddingDate',
  wedding_time: 'weddingTime',
  venue_name: 'venueName',
  venue_address: 'venueAddress',
  phone: 'phone',
  map_url: 'mapUrl',
};

export function useSiteConfig() {
  const [config, setConfig] = useState(WEDDING_CONFIG);
  const [siteText, setSiteText] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        const { data, error } = await supabase
          .from('site_config')
          .select('key, value');

        if (error) throw error;
        if (cancelled) return;

        const merged = { ...WEDDING_CONFIG };
        const texts = {};

        for (const row of data) {
          if (DB_KEY_TO_CONFIG[row.key]) {
            merged[DB_KEY_TO_CONFIG[row.key]] = row.value;
          }
          texts[row.key] = row.value;
        }

        setConfig(merged);
        setSiteText(texts);
      } catch {
        // Fallback to hardcoded defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConfig();
    return () => { cancelled = true; };
  }, []);

  return { config, siteText, loading };
}
