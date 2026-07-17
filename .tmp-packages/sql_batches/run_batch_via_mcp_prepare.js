/**
 * Run all prepared MCP query JSON files for a batch by printing them
 * as NDJSON for the agent to feed into CallMcpTool sequentially.
 * Also supports: node run_batch_via_mcp_prepare.js <batch> --full
 * which writes one JSON with the entire original batch SQL.
 */
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const batch = process.argv[2];
const mode = process.argv[3];

if (mode === "--full") {
  const sql = fs.readFileSync(path.join(dir, `${batch}_batch.sql`), "utf8");
  const out = path.join(dir, `_mcp_queries`, batch, `000_full_batch.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ query: sql }));
  console.log(JSON.stringify({ batch, mode: "full", bytes: sql.length, file: out }));
  process.exit(0);
}

const qdir = path.join(dir, `_mcp_queries`, batch);
const files = fs
  .readdirSync(qdir)
  .filter((f) => f.endsWith(".json") && f !== "plan.json")
  .sort();
console.log(JSON.stringify({ batch, count: files.length, files }));
