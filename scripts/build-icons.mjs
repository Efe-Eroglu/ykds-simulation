#!/usr/bin/env node
/**
 * Marka ikonlarını assets/brand/logo.svg kaynağından üretir → public/
 *   npm run icons
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = readFileSync('assets/brand/logo.svg', 'utf8');
const OUT = 'public';
mkdirSync(`${OUT}/icons`, { recursive: true });

/** Köşeleri yuvarlatılmamış, tam dolu varyant (iOS ve maskable ikonlar için; köşeyi sistem keser). */
const fullBleed = SRC.replace(/rx="116"/g, 'rx="0"');
/** Maskable: işaret güvenli alana (%80) sığacak şekilde küçültülür. */
const maskable = fullBleed.replace(/(<!-- kep tepesi -->)/, '<g transform="translate(51.2 51.2) scale(.8)">$1').replace('</svg>', '</g></svg>');

const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`);

await Promise.all([
  png(SRC, 32, 'icons/favicon-32.png'),
  png(SRC, 192, 'icons/icon-192.png'),
  png(SRC, 512, 'icons/icon-512.png'),
  png(maskable, 512, 'icons/icon-maskable-512.png'),
  png(fullBleed, 180, 'icons/apple-touch-icon.png'),
]);
writeFileSync(`${OUT}/favicon.svg`, SRC);

/* Sosyal medya önizlemesi (1200×630) */
const logoInner = SRC.replace(/^<svg[^>]*>/, '').replace('</svg>', '');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B0A1F"/><stop offset="1" stop-color="#1A1035"/></linearGradient>
    <radialGradient id="g1" cx=".15" cy=".1" r=".6"><stop offset="0" stop-color="#6366F1" stop-opacity=".55"/><stop offset="1" stop-color="#6366F1" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx=".95" cy=".95" r=".6"><stop offset="0" stop-color="#C026D3" stop-opacity=".45"/><stop offset="1" stop-color="#C026D3" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <svg x="96" y="96" width="168" height="168" viewBox="0 0 512 512">${logoInner}</svg>
  <g font-family="Inter, 'Segoe UI', Arial, sans-serif" fill="#fff">
    <text x="96" y="370" font-size="76" font-weight="800" letter-spacing="-2">YKDS Deneme Sınavı</text>
    <text x="96" y="432" font-size="34" font-weight="500" fill="#C7C9FF">Doktora öncelikli alanlar · online deneme platformu</text>
    <text x="96" y="534" font-size="28" font-weight="600" fill="#A5A8D6">80 soru  ·  120 dakika  ·  alan katsayılı puan  ·  ücretsiz</text>
  </g>
</svg>`;
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(`${OUT}/og-image.png`);

writeFileSync(`${OUT}/site.webmanifest`, JSON.stringify({
  name: 'YKDS Deneme Sınavı',
  short_name: 'YKDS Deneme',
  description: 'YÖK-YKDS doktora öncelikli alanlar sınavı için online deneme platformu',
  lang: 'tr',
  start_url: '/',
  display: 'standalone',
  background_color: '#0A0C12',
  theme_color: '#4F46E5',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');

console.log('✓ İkonlar üretildi: favicon.svg, icons/*.png, og-image.png, site.webmanifest');
