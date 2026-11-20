import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export function useAdminConfig() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Chưa đọc được cài đặt lần nào (mạng chập lúc mở admin): các ô sẽ trống → KHÔNG cho lưu, kẻo ghi chuỗi rỗng
  // đè lên tên, ngày, địa điểm thật trên trang khách.
  const [loadError, setLoadError] = useState(false);
  const loadedRef = useRef(false);

  const fetchConfigs = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .order('key');

    if (error || !data) {
      setLoadError(true); // giữ nguyên cài đặt đã có (nếu đây là lần tải lại)
    } else {
      loadedRef.current = true;
      setLoadError(false);
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
    if (!loadedRef.current) return false;
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
    if (!loadedRef.current) return false;
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

  return { configs, loading, saving, loadError, loaded: loadedRef.current, getValue, saveConfig, saveMultiple, refetch: fetchConfigs };
}

/**
 * Giá trị các ô của một form cài đặt. Khi cài đặt được tải lại (bật/tắt intro, tải nhạc, lưu ảnh chia sẻ… đều gọi
 * refetch), chỉ những ô CHƯA sửa mới nhận giá trị mới — chữ đang gõ dở không bị mất.
 */
export function useConfigForm(adminConfig, keys) {
  const [values, setState] = useState({});
  const valuesRef = useRef(values);
  const synced = useRef({}); // giá trị đã lưu lần đồng bộ trước
  const setValues = useCallback((v) => {
    valuesRef.current = typeof v === 'function' ? v(valuesRef.current) : v;
    setState(valuesRef.current);
  }, []);
  useEffect(() => {
    const cur = valuesRef.current;
    const next = { ...cur };
    keys.forEach((k) => {
      const stored = adminConfig.getValue(k) || '';
      if (!(k in cur) || cur[k] === synced.current[k]) next[k] = stored;
      synced.current[k] = stored;
    });
    setValues(next);
  }, [adminConfig.configs]);
  return [values, setValues];
}
