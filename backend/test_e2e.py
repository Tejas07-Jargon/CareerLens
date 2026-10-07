import requests, time, json, sqlite3

resp = requests.post('http://localhost:8000/profiles/', data={
    'github_username': 'torvalds',
    'agreed_to_analysis': 'true',
    'target_role': 'Software Engineer',
})
print('Submit status:', resp.status_code)
data = resp.json()
print('Response:', json.dumps(data, indent=2))
pid = data.get('profile_id')

if not pid:
    print('No profile_id returned!')
    exit(1)

for i in range(45):
    time.sleep(2)
    conn = sqlite3.connect('careerlens_demo.db')
    row = conn.execute('SELECT status, error_message FROM profiles WHERE id=?', (pid,)).fetchone()
    conn.close()
    status = row[0] if row else 'not found'
    error = row[1] if row else None
    print(f'[{i*2}s] status={status}')
    if status in ('fast_pass_complete', 'complete', 'error'):
        if status == 'error':
            print('ERROR MESSAGE:', error)
        else:
            r = requests.get(f'http://localhost:8000/profiles/{pid}/report')
            print('Report HTTP status:', r.status_code)
            if r.ok:
                rdata = r.json()
                print('Score:', rdata.get('score'))
                print('Claims count:', len(rdata.get('claim_statuses', [])))
        break
