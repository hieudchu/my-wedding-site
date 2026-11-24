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

  /**
   * Lưu nhiều ô. Ô đã có hàng → update. Ô CHƯA có hàng (trang khách đang dùng chữ mặc định trong code): update
   * không đụng hàng nào mà vẫn không báo lỗi — trước 25/11 admin báo "Saved!" mà không lưu gì. Giờ: có chữ thì
   * thêm hàng (nhãn lấy từ `meta[key].label`), để trống thì bỏ qua — trang khách giữ nguyên chữ mặc định.
   */
  const saveMultiple = async (updates, meta = {}) => {
    if (!loadedRef.current) return false;
    setSaving(true);
    let success = true;
    const written = {};

    for (const [key, value] of Object.entries(updates)) {
      const now = new Date().toISOString();
      let error;
      if (configs[key]) {
        ({ error } = await supabase.from('site_config').update({ value, updated_at: now }).eq('key', key));
      } else {
        if (!String(value ?? '').trim()) continue;
        ({ error } = await supabase.from('site_config').insert({
          key, value, section: meta[key]?.section || 'text', label: meta[key]?.label || key, updated_at: now,
        }));
      }
      if (error) success = false;
      else written[key] = value;
    }

    setConfigs((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(written)) {
        next[key] = { ...(next[key] || { key }), value };
      }
      return next;
    });

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
