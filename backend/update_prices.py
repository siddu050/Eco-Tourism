from database import SessionLocal
import models

def update_prices():
    db = SessionLocal()
    prices = {
        "Taj Mahal": 4000.0,
        "Goa Beaches": 9500.0,
        "Jaipur Palaces": 6500.0,
        "Kerala Backwaters": 7200.0
    }
    
    locations = db.query(models.Location).all()
    for loc in locations:
        if loc.name in prices:
            loc.price_per_night = prices[loc.name]
            
    db.commit()
    print("Prices updated to INR successfully.")

if __name__ == "__main__":
    update_prices()
