from dotenv import load_dotenv
import os
load_dotenv('.env.local')
print("DB_PASS:", os.getenv('DB_PASS'))  # Should print password
