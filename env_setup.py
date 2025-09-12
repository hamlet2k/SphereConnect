#!/usr/bin/env python3
"""
Environment Setup Helper for SphereConnect
Creates a sample .env.local file template
"""

import os

def create_env_template():
    """Create a .env.local template file"""

    template_content = """# PostgreSQL Database Configuration for SphereConnect
# Update these values with your actual database credentials

# Database Connection
DB_USER=postgres
DB_PASS=your_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sphereconnect

# JWT Secret Key (generate a secure random key)
SECRET_KEY=your-secure-secret-key-here

# Email Configuration (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# CORS Origins
CORS_ORIGINS=http://localhost:3000
"""

    env_file_path = os.path.join(os.path.dirname(__file__), '.env.local')

    if os.path.exists(env_file_path):
        print("⚠️  .env.local file already exists!")
        return False

    try:
        with open(env_file_path, 'w') as f:
            f.write(template_content)

        print("✅ Created .env.local template file")
        print("📝 Please update the file with your actual database credentials")
        print(f"📍 File location: {env_file_path}")
        return True

    except Exception as e:
        print(f"❌ Failed to create .env.local file: {e}")
        return False

if __name__ == "__main__":
    print("🔧 SphereConnect Environment Setup")
    print("=" * 40)
    create_env_template()
    print("\n📖 Next steps:")
    print("1. Update .env.local with your PostgreSQL credentials")
    print("2. Run: python test_data.py")
    print("3. Start server: python start_server.py")
