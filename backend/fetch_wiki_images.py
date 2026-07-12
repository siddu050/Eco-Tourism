import sys
import os
import json
import urllib.request
import urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

def setup_local_images():
    db = SessionLocal()
    os.makedirs("static/images", exist_ok=True)
    
    # Mapping of location name to Wikipedia File name
    wiki_files = {
        "Taj Mahal": "File:Taj Mahal (Edited).jpeg",
        "Goa Beaches": "File:Palolem Beach, Goa.jpg",
        "Jaipur Palaces": "File:Hawa Mahal 2006.jpg",
        "Kerala Backwaters": "File:Kerala backwaters - Alappuzha.jpg",
        "Varanasi Ghats": "File:Varanasi Ghats - Ganges River.jpg",
        "Munnar Tea Gardens": "File:Munnar hillstation kerala.jpg",
        "Ladakh Valleys": "File:Pangong Tso in Ladakh.jpg",
        "Andaman Islands": "File:Radhanagar Beach, Havelock Island.jpg",
        "Hampi Ruins": "File:Stone Chariot at Hampi.jpg",
        "Darjeeling Hills": "File:Darjeeling tea garden.jpg"
    }
    
    locations = db.query(models.Location).all()
    headers = {'User-Agent': 'TourismApp/1.0 (test@example.com)'}

    for loc in locations:
        if loc.name in wiki_files:
            file_name = wiki_files[loc.name]
            encoded_title = urllib.parse.quote(file_name)
            api_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={encoded_title}&prop=imageinfo&iiprop=url&format=json"
            
            try:
                print(f"Fetching API for {loc.name}...")
                req = urllib.request.Request(api_url, headers=headers)
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                    pages = data['query']['pages']
                    page = list(pages.values())[0]
                    
                    if 'imageinfo' in page:
                        image_url = page['imageinfo'][0]['url']
                        
                        ext = image_url.split('.')[-1]
                        filename = f"{loc.name.replace(' ', '_').lower()}.{ext}"
                        filepath = os.path.join("static", "images", filename)
                        
                        print(f"Downloading {image_url} to {filepath}...")
                        img_req = urllib.request.Request(image_url, headers=headers)
                        with urllib.request.urlopen(img_req) as img_resp, open(filepath, 'wb') as f:
                            f.write(img_resp.read())
                        
                        loc.image_url = f"http://localhost:8000/static/images/{filename}"
                    else:
                        print(f"Could not find imageinfo for {file_name}: {page}")
            except Exception as e:
                print(f"Error processing {loc.name}: {e}")
            
    db.commit()
    print("Images downloaded via Wikipedia API and database updated!")

if __name__ == "__main__":
    setup_local_images()
