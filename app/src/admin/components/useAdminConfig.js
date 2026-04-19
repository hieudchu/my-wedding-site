import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export function useAdminConfig() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    const { data } = await supabase
      .from('site_config')
      .select('*')
      .order('key');

    if (data) {
      const map = {};
      for (const row of data) {
        map[row.key] = row;
      }
      setConfigs(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const saveConfig = async (key, value) => {
    setSaving(true);
    const { error } = await supabase
      .from('site_config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (!error) {
      setConfigs((prev) => ({
        ...prev,
        [key]: { ...prev[key], value },
      }));
    }
    setSaving(false);
    return !error;
  };

  const saveMultiple = async (updates) => {
    setSaving(true);
    let success = true;

    for (const [key, value] of Object.entries(updates)) {
      const { error } = await supabase
        .from('site_config')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) success = false;
    }

    if (success) {
      setConfigs((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(updates)) {
          next[key] = { ...next[key], value };
        }
        return next;
      });
    }

    setSaving(false);
    return success;
  };

  const getValue = (key) => configs[key]?.value || '';

  return { configs, loading, saving, getValue, saveConfig, saveMultiple, refetch: fetchConfigs };
}
