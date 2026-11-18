/* Mock: Firebase yapılandırılmış gibi davranır. */
export const firebaseConfigured = true;
export function getFirebaseApp() { return {}; }
export function getDb() { return {}; }

// Demo modda olduğunu açıkça göster (gerçek veriyle karıştırılmasın).
if (typeof document !== 'undefined') {
  const show = () => {
    if (document.getElementById('mock-ribbon')) return;
    const b = document.createElement('div');
    b.id = 'mock-ribbon';
    b.textContent = 'DEMO VERİ · npm run dev:mock · Gerçek veritabanı değil';
    b.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;background:#dc2626;color:#fff;font:700 12px/1 system-ui;padding:8px 14px;border-radius:99px;box-shadow:0 6px 20px rgba(0,0,0,.3);letter-spacing:.04em;pointer-events:none';
    document.body.append(b);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', show) : show();
}
