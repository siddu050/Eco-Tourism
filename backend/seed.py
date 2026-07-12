import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models

# Ensure tables are created
Base.metadata.create_all(bind=engine)

def normalize_price(price):
    reduced_price = round((float(price) * 0.55) / 100) * 100
    return float(max(1800, min(4800, reduced_price)))

def seed():
    db = SessionLocal()
    
    locations = [
       models.Location(name="Taj Mahal", description="An ivory-white marble mausoleum on the right bank of the river Yamuna.", image_url="https://upload.wikimedia.org/wikipedia/commons/c/c8/Taj_Mahal_in_March_2004.jpg", price_per_night=4000.0, state="Uttar Pradesh"),
       models.Location(name="Goa Beaches", description="Sunny beaches and vibrant nightlife.", image_url="https://upload.wikimedia.org/wikipedia/commons/2/22/Palolem_Beach%2C_Goa.jpg", price_per_night=9500.0, state="Goa"),
       models.Location(name="Jaipur Palaces", description="The Pink City known for its stunning architecture.", image_url="https://upload.wikimedia.org/wikipedia/commons/4/41/Hawa_Mahal_-_Jaipur.jpg", price_per_night=6500.0, state="Rajasthan"),
       models.Location(name="Kerala Backwaters", description="A chain of brackish lagoons and lakes.", image_url="https://upload.wikimedia.org/wikipedia/commons/a/af/Kerala_backwaters_-_Alappuzha.jpg", price_per_night=7200.0, state="Kerala"),
       models.Location(name="Varanasi Ghats", description="The spiritual capital of India, famous for its bathing ghats along the river Ganges.", image_url="https://upload.wikimedia.org/wikipedia/commons/e/eb/Varanasi_Ghats_-_Ganges_River.jpg", price_per_night=3500.0, state="Uttar Pradesh"),
       models.Location(name="Munnar Tea Gardens", description="Rolling hills covered in emerald green tea plantations.", image_url="https://upload.wikimedia.org/wikipedia/commons/7/7b/Munnar_hillstation_kerala.jpg", price_per_night=5500.0, state="Kerala"),
       models.Location(name="Ladakh Valleys", description="High-altitude desert with stunning monasteries and pristine lakes.", image_url="https://upload.wikimedia.org/wikipedia/commons/7/71/Pangong_Lake_Ladakh_India.jpg", price_per_night=8000.0, state="Ladakh"),
       models.Location(name="Andaman Islands", description="Pristine white-sand beaches and vibrant coral reefs.", image_url="https://upload.wikimedia.org/wikipedia/commons/2/23/Radhanagar_Beach%2C_Havelock_Island.jpg", price_per_night=12000.0, state="Andaman and Nicobar Islands"),
       models.Location(name="Hampi Ruins", description="Ancient temple ruins surrounded by striking boulder landscapes.", image_url="https://upload.wikimedia.org/wikipedia/commons/7/77/Stone_Chariot_at_Hampi.jpg", price_per_night=4500.0, state="Karnataka"),
       models.Location(name="Darjeeling Hills", description="Famous for its tea industry and the breathtaking views of Kangchenjunga.", image_url="https://upload.wikimedia.org/wikipedia/commons/7/74/Darjeeling_Tea_Garden.jpg", price_per_night=6000.0, state="West Bengal"),
       models.Location(name="Mysore Palace", description="A grand royal residence illuminated beautifully at night and celebrated for Indo-Saracenic architecture.", image_url="", price_per_night=6800.0, state="Karnataka"),
       models.Location(name="Udaipur Lakes", description="Romantic lakes, palace views, and heritage lanes that give Udaipur its timeless charm.", image_url="", price_per_night=8900.0, state="Rajasthan"),
       models.Location(name="Rishikesh Riverfront", description="A spiritual riverside escape known for yoga retreats, suspension bridges, and the Ganges.", image_url="", price_per_night=5200.0, state="Uttarakhand"),
       models.Location(name="Ooty Hills", description="Cool-weather gardens, toy-train nostalgia, and rolling Nilgiri slopes make Ooty a classic hill retreat.", image_url="", price_per_night=6100.0, state="Tamil Nadu"),
       models.Location(name="Jaisalmer Fort", description="A honey-gold desert citadel rising above sandstone streets, havelis, and sweeping Thar views.", image_url="", price_per_night=7300.0, state="Rajasthan"),
       models.Location(name="Golden Temple", description="A luminous spiritual landmark in Amritsar surrounded by reflective water and devotional calm.", image_url="", price_per_night=4800.0, state="Punjab"),
       models.Location(name="Khajuraho Temples", description="Intricately carved temple complexes famed for art, craftsmanship, and UNESCO heritage status.", image_url="", price_per_night=5600.0, state="Madhya Pradesh"),
       models.Location(name="Meghalaya Waterfalls", description="Cloud-washed cliffs and dramatic cascades in one of northeast India’s most scenic landscapes.", image_url="", price_per_night=6700.0, state="Meghalaya"),
       models.Location(name="Coorg Highlands", description="Coffee estates, forest roads, and misty viewpoints create a lush retreat in Kodagu.", image_url="", price_per_night=6400.0, state="Karnataka"),
       models.Location(name="Puducherry Promenade", description="A seaside boulevard lined with colonial facades, cafes, and breezy sunrise walks.", image_url="", price_per_night=5900.0, state="Puducherry"),
       models.Location(name="Charminar", description="The iconic heart of old Hyderabad, surrounded by busy bazaars, food lanes, and layered history.", image_url="", price_per_night=6200.0, state="Telangana"),
       models.Location(name="Golkonda Fort", description="A hilltop fort complex known for royal courts, grand gateways, and panoramic views across Hyderabad.", image_url="", price_per_night=6900.0, state="Telangana"),
       models.Location(name="Gateway of India", description="A famous waterfront landmark in Mumbai with Arabian Sea views and heritage city walks.", image_url="", price_per_night=8800.0, state="Maharashtra"),
       models.Location(name="Ellora Caves", description="Remarkable rock-cut cave temples and monasteries carved into basalt cliffs over centuries.", image_url="", price_per_night=6100.0, state="Maharashtra"),
       models.Location(name="Konark Sun Temple", description="A striking stone temple celebrated for its chariot form, intricate sculpture, and coastal heritage.", image_url="", price_per_night=6300.0, state="Odisha"),
       models.Location(name="Sunderbans Mangroves", description="Tidal forests, winding river channels, and wildlife-rich boat journeys through the great delta.", image_url="", price_per_night=7600.0, state="West Bengal"),
       models.Location(name="Kaziranga National Park", description="Wetland grasslands and safari routes known for one-horned rhinos, elephants, and birdlife.", image_url="", price_per_night=8400.0, state="Assam"),
       models.Location(name="Valley of Flowers", description="A Himalayan alpine valley that blooms with color, mountain air, and unforgettable meadow trails.", image_url="", price_per_night=7100.0, state="Uttarakhand"),
       models.Location(name="Dal Lake", description="Classic houseboats, mirror-like waters, and mountain-framed mornings in Srinagar.", image_url="", price_per_night=9300.0, state="Jammu and Kashmir"),
       models.Location(name="Rann of Kutch", description="A vast white-salt desert with artisan villages, open skies, and memorable festival-season nights.", image_url="", price_per_night=7800.0, state="Gujarat")
    ]
    
    added_count = 0
    updated_count = 0
    for loc in locations:
        loc.price_per_night = normalize_price(loc.price_per_night)
        existing = db.query(models.Location).filter(models.Location.name == loc.name).first()
        if not existing:
            db.add(loc)
            added_count += 1
        elif float(existing.price_per_night or 0) != loc.price_per_night:
            existing.price_per_night = loc.price_per_night
            updated_count += 1
            
    if added_count > 0 or updated_count > 0:
        db.commit()
        print(f"Seeded {added_count} new locations and updated {updated_count} pricing records.")
    else:
        print("Database already contains all seeded locations.")
    
if __name__ == "__main__":
    seed()
