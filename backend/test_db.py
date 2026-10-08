import sqlite3

db = sqlite3.connect('careerlens_demo.db')
db.row_factory = sqlite3.Row
cursor = db.cursor()
cursor.execute('SELECT * FROM profiles WHERE display_name LIKE ?', ('%Manan%',))
row = cursor.fetchone()

if row:
    pid = row['id']
    cursor.execute('SELECT skill_name, confidence, taxonomy_tier FROM skill_profiles WHERE profile_id = ? ORDER BY confidence DESC LIMIT 5', (pid,))
    skills = cursor.fetchall()
    
    print('--- TOP 5 SKILLS ---')
    if not skills:
        print('No skills found.')
    for s in skills:
        print(f"{s['skill_name']} (Confidence: {s['confidence']}, Tier: {s['taxonomy_tier']})")

    cursor.execute('SELECT source_type, content_type, skill_keyword, context_snippet FROM evidence WHERE profile_id = ? LIMIT 5', (pid,))
    evidences = cursor.fetchall()
    
    print('\n--- EVIDENCE (first 5) ---')
    if not evidences:
        print('No evidence found.')
    for e in evidences:
        snippet = str(e['context_snippet'])
        if len(snippet) > 60:
            snippet = snippet[:60] + "..."
        print(f"[{e['source_type']}] {e['skill_keyword']}: {snippet}")
else:
    print('Profile not found.')
