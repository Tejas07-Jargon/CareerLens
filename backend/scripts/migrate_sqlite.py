import asyncio
import sqlite3
from app.core.database import Base, engine
from app.models import (
    profile,
    evidence,
    score_run,
    role_profile,
    cohort,
    consent,
    audit_log,
    dynamic_profile,
)

async def auto_sync_schema():
    conn = sqlite3.connect("careerlens_demo.db")
    cursor = conn.cursor()
    
    # Iterate over all mapped tables in metadata
    for table_name, table in Base.metadata.tables.items():
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}';")
        if not cursor.fetchone():
            print(f"Table {table_name} does not exist, creating...")
            continue
            
        cursor.execute(f"PRAGMA table_info({table_name});")
        existing_cols = {r[1] for r in cursor.fetchall()}
        
        for col in table.columns:
            if col.name not in existing_cols:
                col_type = str(col.type)
                print(f"Adding missing column to {table_name}: {col.name} ({col_type})")
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type};")
                conn.commit()

    conn.close()
    print("All tables checked and synchronized with SQLAlchemy metadata.")

if __name__ == "__main__":
    asyncio.run(auto_sync_schema())
