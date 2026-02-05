import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv('DATABASE_URL')
if not url:
    print('DATABASE_URL not found in .env')
    raise SystemExit(2)

print('Connecting to', url.split('@')[-1])

try:
    import psycopg2
except Exception as e:
    print('psycopg2 not installed:', e)
    raise

try:
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute('CREATE EXTENSION IF NOT EXISTS vector;')
    print('CREATE EXTENSION executed')
    cur.close()
    conn.close()
except Exception as e:
    print('Error creating extension:', e)
    raise
