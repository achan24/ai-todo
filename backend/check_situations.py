from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('SELECT * FROM situations'))
    print('Situations table contents:')
    rows = result.fetchall()
    print(f'Found {len(rows)} rows')
    for row in rows:
        print(row)
