import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

def update_image_urls():
    db = SessionLocal()
    urls = {
        "Taj Mahal": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Taj_Mahal_in_March_2004.jpg",
        "Goa Beaches": "https://upload.wikimedia.org/wikipedia/commons/2/22/Palolem_Beach%2C_Goa.jpg",
        "Jaipur Palaces": "https://upload.wikimedia.org/wikipedia/commons/4/41/Hawa_Mahal_-_Jaipur.jpg",
        "Kerala Backwaters": "https://upload.wikimedia.org/wikipedia/commons/a/af/Kerala_backwaters_-_Alappuzha.jpg",
        "Varanasi Ghats": "https://upload.wikimedia.org/wikipedia/commons/e/eb/Varanasi_Ghats_-_Ganges_River.jpg",
        "Munnar Tea Gardens": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Munnar_hillstation_kerala.jpg",
        "Ladakh Valleys": "https://upload.wikimedia.org/wikipedia/commons/7/71/Pangong_Lake_Ladakh_India.jpg",
        "Andaman Islands": "https://upload.wikimedia.org/wikipedia/commons/2/23/Radhanagar_Beach%2C_Havelock_Island.jpg",
        "Hampi Ruins": "https://upload.wikimedia.org/wikipedia/commons/7/77/Stone_Chariot_at_Hampi.jpg",
        "Darjeeling Hills": "https://upload.wikimedia.org/wikipedia/commons/7/74/Darjeeling_Tea_Garden.jpg"
    }
    
    locations = db.query(models.Location).all()
    for loc in locations:
        if loc.name in urls:
            loc.image_url = urls[loc.name]
            
    db.commit()
    print("Image URLs updated to reliable Wikimedia Commons links successfully.")

if __name__ == "__main__":
    update_image_urls()
