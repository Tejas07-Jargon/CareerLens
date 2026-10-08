"""Quick diagnostic query for Kareer Kranti database."""
import sqlite3

conn = sqlite3.connect("careerlens_demo.db")
cur = conn.cursor()

# Get column names for profiles
cur.execute("PRAGMA table_info(profiles)")
cols = [r[1] for r in cur.fetchall()]
print("Profile columns:", cols)

# Recent profiles
cur.execute("SELECT id, github_username FROM profiles ORDER BY created_at DESC LIMIT 5")
for r in cur.fetchall():
    print(f"Profile: id={r[0]} github={r[1]}")

# Recent repo_attributions
cur.execute("SELECT profile_id, repo_full_name, status, student_lines, total_meaningful_lines, error_message FROM repo_attributions ORDER BY created_at DESC LIMIT 15")
for r in cur.fetchall():
    print(f"Attr: profile={r[0][:12]}... repo={r[1]} status={r[2]} student={r[3]} total={r[4]} err={r[5]}")

conn.close()
