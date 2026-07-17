import sqlite3
import json

db = r"C:\Users\Meit Swami\AppData\Roaming\Cursor\User\globalStorage\state.vscdb"
c = sqlite3.connect(db)
rows = c.execute(
    "SELECT key FROM ItemTable WHERE key LIKE '%mcp%' OR key LIKE '%supabase%' OR key LIKE '%oauth%' LIMIT 100"
).fetchall()
for (k,) in rows:
    print(k)
