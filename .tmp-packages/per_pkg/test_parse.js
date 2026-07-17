const fs = require('fs');
const path = require('path');

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
  if (!hm) throw new Error('head parse failed: ' + head.slice(-200));

  const snapshotSql = sql.slice(snapStart, end);
  const snapshotJson = snapshotSql.replace(/''/g, "'");
  const snapshot = JSON.parse(snapshotJson);
  return {
    p_id: hm[1],
    p_itinerary_id: hm[2],
    p_summary: hm[3].replace(/''/g, "'"),
    p_snapshot: snapshot,
  };
}

const code = process.argv[2] || 'DR021';
const sql = fs.readFileSync(path.join(__dirname, code + '.sql'), 'utf8');
const body = parseSql(sql);
console.log(JSON.stringify({
  code,
  id: body.p_id,
  itin: body.p_itinerary_id,
  tour: body.p_snapshot.header.tour_code,
  days: body.p_snapshot.days.length,
  summary: body.p_summary.slice(0, 60),
}));
