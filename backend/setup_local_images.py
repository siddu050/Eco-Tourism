import sys
import os
import json
from pathlib import Path
import urllib.parse
import urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

HEADERS = {"User-Agent": "TourismApp/1.0 (local-development)"}


def fetch_json(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_image_url_from_file(file_title):
    encoded_title = urllib.parse.quote(file_title)
    api_url = (
        "https://en.wikipedia.org/w/api.php"
        f"?action=query&titles={encoded_title}&prop=imageinfo&iiprop=url&format=json"
    )
    data = fetch_json(api_url)
    page = next(iter(data["query"]["pages"].values()))
    return page.get("imageinfo", [{}])[0].get("url")


def fetch_image_url_from_page(page_title):
    encoded_title = urllib.parse.quote(page_title)
    api_url = (
        "https://en.wikipedia.org/w/api.php"
        f"?action=query&titles={encoded_title}&prop=pageimages&piprop=original&format=json"
    )
    data = fetch_json(api_url)
    page = next(iter(data["query"]["pages"].values()))
    original = page.get("original", {})
    return original.get("source")


def fetch_image_url_from_search(search_term):
    encoded_term = urllib.parse.quote(search_term)
    api_url = (
        "https://en.wikipedia.org/w/api.php"
        f"?action=query&generator=search&gsrsearch={encoded_term}&prop=pageimages&piprop=original&format=json"
    )
    data = fetch_json(api_url)
    pages = data.get("query", {}).get("pages", {})

    for page in pages.values():
        original = page.get("original", {})
        if original.get("source"):
            return original["source"]

    return None


def setup_local_images():
    db = SessionLocal()
    base_dir = Path(__file__).resolve().parent
    images_dir = base_dir / "static" / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

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
        "Darjeeling Hills": "File:Darjeeling tea garden.jpg",
        "Mysore Palace": "File:Mysore Palace Morning.jpg",
        "Udaipur Lakes": "File:Lake Pichola, Udaipur.jpg",
        "Rishikesh Riverfront": "File:Rishikesh view.jpg",
        "Ooty Hills": "File:Ooty lake.jpg",
        "Jaisalmer Fort": "File:Jaisalmer Fort.jpg",
        "Golden Temple": "File:Golden Temple, Amritsar, India.jpg",
        "Khajuraho Temples": "File:Khajuraho Kandariya Mahadeo Temple.jpg",
        "Meghalaya Waterfalls": "File:Nohkalikai Falls.jpg",
        "Coorg Highlands": "File:Madikeri view.jpg",
        "Puducherry Promenade": "File:Pondicherry Rock Beach.jpg",
        "Ellora Caves": "File:Ellora Caves 0567.jpg",
        "Konark Sun Temple": "File:KONARK SUN Temple.jpg",
        "Sunderbans Mangroves": "File:Sundarban mangrove.jpg",
    }
    page_titles = {
        "Taj Mahal": "Taj Mahal",
        "Goa Beaches": "Palolem Beach",
        "Jaipur Palaces": "Hawa Mahal",
        "Kerala Backwaters": "Kerala backwaters",
        "Varanasi Ghats": "Varanasi",
        "Munnar Tea Gardens": "Munnar",
        "Ladakh Valleys": "Pangong Tso",
        "Andaman Islands": "Radhanagar Beach",
        "Hampi Ruins": "Hampi",
        "Darjeeling Hills": "Darjeeling",
        "Mysore Palace": "Mysore Palace",
        "Udaipur Lakes": "Lake Pichola",
        "Rishikesh Riverfront": "Rishikesh",
        "Ooty Hills": "Ooty",
        "Jaisalmer Fort": "Jaisalmer Fort",
        "Golden Temple": "Golden Temple",
        "Khajuraho Temples": "Khajuraho Group of Monuments",
        "Meghalaya Waterfalls": "Nohkalikai Falls",
        "Coorg Highlands": "Madikeri",
        "Puducherry Promenade": "Puducherry",
        "Charminar": "Charminar",
        "Golkonda Fort": "Golconda Fort",
        "Gateway of India": "Gateway of India, Mumbai",
        "Ellora Caves": "Ellora Caves",
        "Konark Sun Temple": "Konark Sun Temple",
        "Sunderbans Mangroves": "Sundarbans National Park",
        "Kaziranga National Park": "Kaziranga National Park",
        "Valley of Flowers": "Valley of Flowers National Park",
        "Dal Lake": "Dal Lake",
        "Rann of Kutch": "Great Rann of Kutch",
    }
    search_terms = {
        "Puducherry Promenade": "Puducherry promenade beach",
        "Golkonda Fort": "Golconda Fort Hyderabad",
        "Gateway of India": "Gateway of India Mumbai",
        "Sunderbans Mangroves": "Sundarbans mangroves",
        "Valley of Flowers": "Valley of Flowers Uttarakhand",
        "Rann of Kutch": "Great Rann of Kutch Gujarat",
    }
    
    locations = db.query(models.Location).all()
    for loc in locations:
        if loc.name not in wiki_files and loc.name not in page_titles:
            continue

        try:
            image_url = None

            if loc.name in page_titles:
                image_url = fetch_image_url_from_page(page_titles[loc.name])

            if not image_url and loc.name in wiki_files:
                image_url = fetch_image_url_from_file(wiki_files[loc.name])

            if not image_url and loc.name in search_terms:
                image_url = fetch_image_url_from_search(search_terms[loc.name])

            if not image_url:
                raise ValueError("No image URL found from page or file lookup")

            extension = Path(urllib.parse.urlparse(image_url).path).suffix or ".jpg"
            filename = f"{loc.name.lower().replace(' ', '_').replace(',', '')}{extension}"
            filepath = images_dir / filename

            if not filepath.exists():
                print(f"Downloading {loc.name}...")
                img_req = urllib.request.Request(image_url, headers=HEADERS)
                with urllib.request.urlopen(img_req) as response, open(filepath, "wb") as out_file:
                    out_file.write(response.read())

            loc.image_url = f"/static/images/{filename}"
        except Exception as exc:
            print(f"Skipping {loc.name}: {exc}")
            
    db.commit()
    print("Images downloaded and database updated to use local static files!")

if __name__ == "__main__":
    setup_local_images()
