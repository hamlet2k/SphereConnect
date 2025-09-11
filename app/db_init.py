from sqlalchemy import create_engine
from app.core.models import Base

engine = create_engine('postgresql://user:pass@localhost:5432/connectsphere')
Base.metadata.create_all(engine)