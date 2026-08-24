"""
create_admin.py
Upsert de usuarios en la DB configurada en BE-SPForecast/.env
Uso: python create_admin.py
"""
import asyncio
import asyncpg
import bcrypt
import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'BE-SPForecast', '.env'))

DB = dict(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT', 5432)),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    ssl='require',
)

USERS = [
    {'email': 'user-manager@yopmail.com',         'full_name': 'User Manager',      'role': 'manager', 'password': 'Password1q2w3e4R?'},
    {'email': 'user-viewer@yopmail.com',           'full_name': 'User Viewer',       'role': 'viewer',  'password': 'Password1q2w3e4R?'},
    {'email': 'ignacio.mustafha@accenture.com',    'full_name': 'Ignacio Mustafha',  'role': 'admin',   'password': 'Password1q2w3e4R?'},
    {'email': 'maria.jose.matar@accenture.com',    'full_name': 'Maria Jose Matar',  'role': 'admin',   'password': 'Password1q2w3e4R?'},
    {'email': 'cecilia.arato@accenture.com',       'full_name': 'Cecilia Arato',     'role': 'admin',   'password': 'Password1q2w3e4R?'},
    {'email': 'ezequiel.ferrante@accenture.com',   'full_name': 'Ezequiel Ferrante', 'role': 'admin',   'password': 'Password1q2w3e4R?'},
    {'email': 'rebeca.finol.gotera@accenture.com', 'full_name': 'Rebeca Finol',      'role': 'admin',   'password': 'Password1q2w3e4R?'},
    {'email': 'mariano.tanus@accenture.com',       'full_name': 'Mariano Tanus',     'role': 'admin',   'password': 'Password1q2w3e4R?'},
]


async def main() -> None:
    if not all([DB['host'], DB['user'], DB['password'], DB['database']]):
        print('[ERROR] Variables de entorno de DB no encontradas. Verificar BE-SPForecast/.env')
        sys.exit(1)

    conn = await asyncpg.connect(**DB)
    try:
        for u in USERS:
            hashed = bcrypt.hashpw(u['password'].encode(), bcrypt.gensalt()).decode()
            await conn.execute(
                """
                INSERT INTO users (email, hashed_password, full_name, role, is_active)
                VALUES ($1, $2, $3, $4, true)
                ON CONFLICT (email) DO UPDATE SET
                    hashed_password = EXCLUDED.hashed_password,
                    full_name       = EXCLUDED.full_name,
                    role            = EXCLUDED.role,
                    is_active       = true
                """,
                u['email'], hashed, u['full_name'], u['role'],
            )
            print(f'[OK] upserted: {u["email"]} ({u["role"]})')
    finally:
        await conn.close()


asyncio.run(main())