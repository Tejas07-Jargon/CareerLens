import sqlite3

def run():
    conn = sqlite3.connect('careerlens_demo.db')
    c = conn.cursor()
    c.execute("PRAGMA foreign_keys=off;")
    
    # We might have partially failed, so let's check what exists
    try:
        c.execute("DROP TABLE leetcode_profiles_old;")
    except:
        pass
        
    try:
        c.execute("ALTER TABLE leetcode_profiles RENAME TO leetcode_profiles_old;")
    except:
        pass
        
    try:
        c.execute("DROP INDEX ix_leetcode_profiles_profile_id;")
        c.execute("DROP INDEX ix_leetcode_profiles_username;")
    except:
        pass
    
    c.execute("""
    CREATE TABLE leetcode_profiles (
        id VARCHAR(36) NOT NULL, 
        profile_id VARCHAR(36) NOT NULL, 
        username VARCHAR(128) NOT NULL, 
        total_solved INTEGER NOT NULL, 
        easy_solved INTEGER NOT NULL, 
        medium_solved INTEGER NOT NULL, 
        hard_solved INTEGER NOT NULL, 
        acceptance_rate FLOAT, 
        global_ranking INTEGER, 
        reputation INTEGER NOT NULL, 
        badges JSON NOT NULL, 
        created_at DATETIME NOT NULL, 
        updated_at DATETIME NOT NULL, 
        PRIMARY KEY (id), 
        FOREIGN KEY(profile_id) REFERENCES profiles (id)
    );
    """)
    
    c.execute("CREATE UNIQUE INDEX ix_leetcode_profiles_profile_id ON leetcode_profiles (profile_id);")
    c.execute("CREATE UNIQUE INDEX ix_leetcode_profiles_username ON leetcode_profiles (username);")
    
    c.execute("""
    INSERT INTO leetcode_profiles 
    SELECT id, profile_id, username, total_solved, easy_solved, medium_solved, hard_solved, 
           acceptance_rate, global_ranking, reputation, badges, created_at, updated_at
    FROM leetcode_profiles_old;
    """)
    
    c.execute("DROP TABLE leetcode_profiles_old;")
    
    c.execute("PRAGMA foreign_keys=on;")
    conn.commit()
    conn.close()
    print("Database schema updated successfully.")

if __name__ == '__main__':
    run()
