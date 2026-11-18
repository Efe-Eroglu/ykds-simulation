#!/usr/bin/env node
/**
 * İlk admin hesabını oluşturur (veya mevcut bir hesabı admin yapar).
 *   npm run create-admin -- admin@ornek.com              → şifreyi sen yazarsın (gizli)
 *   npm run create-admin -- admin@ornek.com --generate   → güçlü rastgele şifre üretilir, yalnızca bu terminalde bir kez gösterilir
 * Şifre hiçbir dosyaya kaydedilmez. Bunu kendi terminalinde çalıştır; çıktıyı kimseyle paylaşma.
 * Gereken: .env içinde FIREBASE_SERVICE_ACCOUNT (hizmet hesabı JSON'u).
 */
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { randomInt } from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function loadEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

function askHidden(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); else rl.output.write(''); };
    rl.question(question, v => { rl.close(); process.stdout.write('\n'); resolve(v); });
  });
}

/** Kriptografik olarak güvenli, karışık bir şifre üretir (her karakter sınıfından en az biri). */
function generatePassword(len = 24) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*-_=+?'];
  const all = sets.join('');
  const chars = sets.map(set => set[randomInt(set.length)]);
  while (chars.length < len) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

function strong(p) {
  return p.length >= 10 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);
}

async function main() {
  loadEnv();
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Kullanım: npm run create-admin -- <e-posta>');
    process.exit(1);
  }
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) { console.error('.env içinde FIREBASE_SERVICE_ACCOUNT tanımlı değil.'); process.exit(1); }
  const sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  initializeApp({ credential: cert(sa) });
  const auth = getAuth(), db = getFirestore();

  let user = await auth.getUserByEmail(email).catch(() => null);
  if (user) {
    console.log(`• ${email} zaten kayıtlı (uid: ${user.uid}); admin yetkisi verilecek.`);
  } else {
    let p1;
    if (process.argv.includes('--generate')) {
      p1 = generatePassword();
    } else {
      p1 = await askHidden('Yeni şifre (en az 10 karakter, büyük/küçük harf ve rakam): ');
      if (!strong(p1)) { console.error('Şifre yeterince güçlü değil.'); process.exit(1); }
      const p2 = await askHidden('Şifre (tekrar): ');
      if (p1 !== p2) { console.error('Şifreler eşleşmiyor.'); process.exit(1); }
    }
    user = await auth.createUser({ email, password: p1, emailVerified: true });
    console.log(`✓ Kullanıcı oluşturuldu (uid: ${user.uid})`);
    if (process.argv.includes('--generate')) {
      console.log('\n┌──────────────────────────────────────────────┐');
      console.log('│  ŞİFREN (yalnızca şimdi gösteriliyor):        │');
      console.log(`│  ${p1.padEnd(44)}│`);
      console.log('└──────────────────────────────────────────────┘');
      console.log('Bir şifre yöneticisine kaydet ve bu terminali temizle (cls). Kimseyle paylaşma.\n');
    }
  }
  await db.collection('admins').doc(user.uid).set({ email, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`✓ ${email} artık yönetici. /admin adresinden giriş yapabilirsin.`);
  process.exit(0);
}

main().catch(e => { console.error('Hata:', e.message); process.exit(1); });
