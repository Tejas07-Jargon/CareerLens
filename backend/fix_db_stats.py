import sqlite3
import os

db_path = 'careerlens_demo.db'

def fix_schema():
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE leetcode_profiles ADD COLUMN aggregate_topics JSON DEFAULT '{}';")
        print("Added aggregate_topics column")
    except sqlite3.OperationalError as e:
        print(f"Error adding aggregate_topics: {e}")
        
    try:
        cursor.execute("ALTER TABLE leetcode_profiles ADD COLUMN aggregate_languages JSON DEFAULT '{}';")
        print("Added aggregate_languages column")
    except sqlite3.OperationalError as e:
        print(f"Error adding aggregate_languages: {e}")
        
    conn.commit()
    conn.close()
    print("Done")

if __name__ == '__main__':
    fix_schema()
