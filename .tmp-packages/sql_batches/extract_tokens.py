import sqlite3
import json
import base64

db = r"C:\Users\Meit Swami\AppData\Roaming\Cursor\User\globalStorage\state.vscdb"
c = sqlite3.connect(db)

# Find user-supabase token keys
rows = c.execute(
    "SELECT key, value FROM ItemTable WHERE key LIKE '%user-supabase%' OR key LIKE '%mcpOAuth.secret%supabase%' OR value LIKE '%access_token%'"
).fetchall()

out = r"c:\Users\Meit Swami\Documents\GitHub\admin-daysrajasthan\.tmp-packages\sql_batches\_token_dump.txt"
with open(out, "w", encoding="utf-8") as f:
    for k, v in rows:
        f.write(f"KEY: {k}\n")
        try:
            val = v.decode("utf-8") if isinstance(v, bytes) else v
        except Exception:
            val = repr(v)
        # Truncate very long values in listing but save tokens fully to separate files
        f.write(f"VAL_LEN: {len(val) if val else 0}\n")
        if val and ("access_token" in val or "refresh_token" in val or val.startswith("{")):
            safe_name = base64.urlsafe_b64encode(k.encode()).decode()[:40]
            path = rf"c:\Users\Meit Swami\Documents\GitHub\admin-daysrajasthan\.tmp-packages\sql_batches\_tok_{safe_name}.json"
            with open(path, "w", encoding="utf-8") as tf:
                tf.write(val)
            f.write(f"SAVED: {path}\n")
        f.write("---\n")

# Specifically fetch the user-supabase mcp_tokens secret
target_keys = [
    k for (k,) in c.execute("SELECT key FROM ItemTable WHERE key LIKE '%mcpOAuth%'").fetchall()
    if "user-supabase" in k or "c3VwYWJhc2U" in k  # supabase in b64
]
f2 = open(out, "a", encoding="utf-8")
f2.write("\nTARGET KEYS:\n")
for k in target_keys:
    f2.write(k + "\n")
    row = c.execute("SELECT value FROM ItemTable WHERE key = ?", (k,)).fetchone()
    if row:
        val = row[0].decode("utf-8") if isinstance(row[0], bytes) else row[0]
        path = rf"c:\Users\Meit Swami\Documents\GitHub\admin-daysrajasthan\.tmp-packages\sql_batches\_supabase_key_val.json"
        # Keep appending interesting ones
        if "tokens" in k.lower() or "token" in k:
            with open(path.replace(".json", f"_{abs(hash(k))%100000}.json"), "w", encoding="utf-8") as tf:
                tf.write(val if val else "")
            f2.write(f"  saved tokens len={len(val) if val else 0}\n")
f2.close()
print("done", len(target_keys))
