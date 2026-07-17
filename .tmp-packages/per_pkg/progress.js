/**
 * Bulk import remaining packages via MCP-compatible approach:
 * Uses existing _sql_import_chunks table ONLY if --chunks flag set.
 * Default: prints which codes remain for the agent to execute_sql directly.
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const progressPath = path.join(dir, '_progress.json');

let progress = { done: [], failed: [] };
if (fs.existsSync(progressPath)) {
  progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
}

const doneSet = new Set(progress.done);
const remaining = manifest.filter((m) => !doneSet.has(m.code));

const markDone = process.argv.includes('--mark')
  ? process.argv[process.argv.indexOf('--mark') + 1]
  : null;
if (markDone) {
  for (const c of markDone.split(',')) {
    if (!progress.done.includes(c)) progress.done.push(c);
  }
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
  console.log('marked', markDone);
  process.exit(0);
}

console.log(JSON.stringify({
  done: progress.done.length,
  remaining: remaining.length,
  next: remaining.slice(0, 8).map((m) => m.code),
  remaining_codes: remaining.map((m) => m.code),
}, null, 2));
