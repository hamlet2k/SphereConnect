import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from app.core.models import Base

engine = create_engine('postgresql://postgres:ricota12@localhost:5432/sphereconnect')
Base.metadata.create_all(engine)