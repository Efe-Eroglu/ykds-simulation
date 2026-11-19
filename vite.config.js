import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const r = p => fileURLToPath(new URL(p, import.meta.url));

/**
 * `vite --mode mock`: Firebase ve /api yerine dev/mock/ altındaki sahte servisleri kullanır.
 * Firebase hesabı olmadan arayüz geliştirmek ve ekran görüntüsü almak içindir.
 */
function mockServices() {
  const MAP = { 'services/tests.js': 'tests', 'services/auth.js': 'auth', 'services/exam-api.js': 'exam-api', 'lib/firebase.js': 'firebase' };
  return {
    name: 'ykds-mock-services',
    enforce: 'pre',
    async resolveId(source, importer, opts) {
      if (!importer || importer.includes('/dev/mock/')) return null;
      const hit = Object.keys(MAP).find(k => source.endsWith(k));
      if (!hit) return null;
      const resolved = await this.resolve(source, importer, { ...opts, skipSelf: true });
      if (resolved && resolved.id.replace(/\\/g, '/').includes('/src/' + hit)) return r(`./dev/mock/${MAP[hit]}.js`);
      return null;
    },
  };
}

/**
 * Geliştirme sunucusunda /api/* isteklerini api/ klasöründeki Vercel fonksiyonlarına yönlendirir
 * (böylece `vercel dev` olmadan da uçtan uca test edilebilir).
 */
function devApi() {
  return {
    name: 'ykds-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = req.url && req.url.match(/^\/api\/([a-z0-9/_-]+?)\/?(\?.*)?$/i);
        if (!m || m[1].split('/').some(p => p.startsWith('_') || p === '..')) return next();
        try {
          const mod = await server.ssrLoadModule(r(`./api/${m[1]}.js`));
          await mod.default(req, res);
        } catch (e) {
          if (e.code === 'ERR_LOAD_URL' || /Failed to load|does not exist/i.test(e.message)) return next();
          console.error(e);
          res.statusCode = 500; res.end(JSON.stringify({ error: 'Dev API hatası' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Sunucu tarafı değişkenleri (VITE_ öneki olmayanlar) yalnızca dev API için process.env'e aktarılır; istemciye gitmez.
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['FIREBASE_SERVICE_ACCOUNT', 'EXAM_TOKEN_SECRET']) if (env[k] && !process.env[k]) process.env[k] = env[k];

  return {
    plugins: mode === 'mock' ? [mockServices()] : [devApi()],
    build: {
      rollupOptions: { input: { main: r('./index.html'), admin: r('./admin.html'), notFound: r('./404.html') } },
    },
  };
});
