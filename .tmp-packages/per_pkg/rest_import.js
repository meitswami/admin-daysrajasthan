/**
 * Parse each remaining package .sql and call import_pkg_revision via PostgREST.
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const url = 'https://kyxkrzrvsbxkjsapkaws.supabase.co';
const anonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGtyenJ2c2J4a2pzYXBrYXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDA2NDgsImV4cCI6MjA5OTM3NjY0OH0.OSCFvhii01cWA1Vq542Hs10UlmutBp9jUu2tQh4YAO8';

const progress = JSON.parse(fs.readFileSync(path.join(dir, '_progress.json'), 'utf8'));
const done = new Set(progress.done);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const remaining = manifest.filter((m) => !done.has(m.code));

function parseSql(sql) {
  const marker = "'manual'::revision_save_type, '";
  const start = sql.indexOf(marker);
  if (start < 0) throw new Error('marker not found');
  const snapStart = start + marker.length;
  const endMarker = "'::jsonb";
  const end = sql.indexOf(endMarker, snapStart);
  if (end < 0) throw new Error('end marker not found');

  const head = sql.slice(0, start);
  const hm = head.match(
    /VALUES\s*\(\s*'([0-9a-f-]+)'\s*,\s*'([0-9a-f-]+)'\s*,\s*1\s*,\s*NULL\s*,\s*'Imported package content'\s*,\s*'((?:[^']|'')*)'\s*,\s*$/i
  );
  if (!hm) throw new Error('head parse failed');

  const snapshotSql = sql.slice(snapStart, end);
  const snapshot = JSON.parse(snapshotSql.replace(/''/g, "'"));
  return {
    p_id: hm[1],
    p_itinerary_id: hm[2],
    p_summary: hm[3].replace(/''/g, "'"),
    p_snapshot: snapshot,
  };
}

async function importOne(code) {
  const sql = fs.readFileSync(path.join(dir, code + '.sql'), 'utf8');
  const body = parseSql(sql);
  const res = await fetch(`${url}/rest/v1/rpc/import_pkg_revision`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return true;
}

(async () => {
  const failed = [];
  const ok = [];
  for (const m of remaining) {
    try {
      await importOne(m.code);
      ok.push(m.code);
      if (!progress.done.includes(m.code)) progress.done.push(m.code);
      console.log('OK', m.code);
    } catch (e) {
      console.error('FAIL', m.code, e.message);
      try {
        await importOne(m.code);
        ok.push(m.code);
        if (!progress.done.includes(m.code)) progress.done.push(m.code);
        console.log('OK-retry', m.code);
      } catch (e2) {
        console.error('FAIL-retry', m.code, e2.message);
        failed.push({ code: m.code, error: e2.message });
      }
    }
  }
  progress.failed = failed;
  fs.writeFileSync(path.join(dir, '_progress.json'), JSON.stringify(progress, null, 2));
  console.log(JSON.stringify({ ok: ok.length, failed: failed.length, failedCodes: failed.map((f) => f.code) }));
})();
