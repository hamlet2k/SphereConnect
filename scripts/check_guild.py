import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import sessionmaker
from app.core.models import Guild, ENGINE

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)

def check_guild():
    db = SessionLocal()
    try:
        guild_id = 'd49675fb-4acc-440d-99be-9b8ac4205121'
        guild = db.query(Guild).filter(Guild.id == guild_id).first()
        if guild:
            print(f"Guild exists: {guild.name} (ID: {guild.id})")
        else:
            print(f"Guild with ID {guild_id} does not exist.")
    except Exception as e:
        print(f"Error checking guild: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_guild()