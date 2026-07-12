from database import SessionLocal, engine, Base
import models
Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    users = db.query(models.User).all()
    print(f"Users: {len(users)}")
    locations = db.query(models.Location).all()
    print(f"Locations: {len(locations)}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()