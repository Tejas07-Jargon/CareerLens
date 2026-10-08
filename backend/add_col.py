import sqlite3

def run():
    conn = sqlite3.connect('careerlens_demo.db')
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE profiles ADD COLUMN leetcode_username VARCHAR(128);")
        conn.commit()
        print("Added leetcode_username to profiles")
    except Exception as e:
        print(f"Error: {e}")
    conn.close()

if __name__ == '__main__':
    run()
