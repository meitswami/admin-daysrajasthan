const fs = require('fs');
const text = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of text.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  const key = line.slice(0, i).trim();
  let val = line.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}
const k = env.SUPABASE_SERVICE_ROLE_KEY || '';
const u = env.NEXT_PUBLIC_SUPABASE_URL || '';
console.log('url', u);
console.log('keyLen', k.length);
console.log('hasKey', k.length > 20);
console.log('keyLooksJwt', k.startsWith('eyJ'));
