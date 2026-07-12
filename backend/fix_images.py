from database import SessionLocal, engine, Base
import models
Base.metadata.create_all(bind=engine)
db = SessionLocal()
locations = db.query(models.Location).all()

for loc in locations:
    # Use Unsplash featured images related to the location
    keyword = loc.name.lower().replace(" ", "-").replace(",", "").replace("palaces", "palace").replace("beaches", "beach").replace("backwaters", "backwater").replace("ghats", "ghat").replace("gardens", "garden").replace("valleys", "valley").replace("islands", "island").replace("ruins", "ruin").replace("hills", "hill")
    loc.image_url = f'https://source.unsplash.com/featured/?{keyword}'
db.commit()
print('Added Unsplash featured images related to each location')