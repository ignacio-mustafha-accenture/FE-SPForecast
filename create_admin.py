import asyncio
import bcrypt
import asyncpg

DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
DB_PORT = 5432
DB_USER = "postgres.zurbiimjoujcocdffdlv"
DB_PASSWORD = "Forecast989134@@"
DB_NAME = "postgres"

EMAIL = "ignacio.mustafha@accenture.com"
PASSWORD = "Maiden39454835@"
FULL_NAME = "Ignacio Mustafha"
ROLE = "admin"

async def main():
    hashed = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    print(f"Hash generado OK")

    conn = await asyncpg.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER,
        password=DB_PASSWORD, database=DB_NAME, ssl="require"
    )
    try:
        existing = await conn.fetchrow("SELECT id FROM users WHERE email=$1", EMAIL)
        if existing:
            await conn.execute(
                "UPDATE users SET hashed_password=$1, role=$2, is_active=true WHERE email=$3",
                hashed, ROLE, EMAIL
            )
            print(f"[OK] Password actualizado para {EMAIL} (role={ROLE})")
        else:
            row = await conn.fetchrow(
                "INSERT INTO users (email, hashed_password, full_name, role, is_active) "
                "VALUES ($1,$2,$3,$4,true) RETURNING id",
                EMAIL, hashed, FULL_NAME, ROLE
            )
            print(f"[OK] Usuario creado id={row['id']}: {EMAIL} (role={ROLE})")
    finally:
        await conn.close()

asyncio.run(main())
