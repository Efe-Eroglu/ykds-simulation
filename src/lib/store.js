/** localStorage sarmalayıcı — gizli pencere/kota dolu durumlarında sessizce başarısız olur. */
export const store = {
  get(k, d = null) {
    try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  /** @returns {boolean} yazma başarılı mı */
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
  },
  del(k) {
    try { localStorage.removeItem(k); } catch { /* yok say */ }
  },
};

export const KEYS = {
  session: 'ykds_session',
  attempts: 'ykds_attempts',
  field: 'ykds_field',
  testCopy: id => 'ykds_tc_' + id,
};
