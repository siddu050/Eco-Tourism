import json
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

import config

SYSTEM_PROMPT = (
    "You are the Indian Journeys AI Travel Assistant for a premier eco-tourism platform in India. "
    "Your mission is to help travelers discover destinations, craft detailed multi-day itineraries, "
    "plan realistic budgets in INR (Rs. / ₹), understand the best travel seasons, explore local cuisines, "
    "and navigate bookings, payments (Instant UPI VPA: 9391862579@axl), and 100% refund cancellations (up to 48 hours before check-in). "
    "Customer Care & Concierge Helpline: 9347466496 (8 AM - 10 PM IST).\n\n"
    "Guidelines:\n"
    "1. Keep responses structured, concise, friendly, warm (use Namaste 🙏 where appropriate), and actionable.\n"
    "2. Use Markdown formatting: **bold**, bullet points, numbered lists, and emoji icons for scannability.\n"
    "3. When suggesting destinations, specify accurate night rates (e.g. Rs. 3,000/night), state, highlights, and eco-friendly tips.\n"
    "4. Remember the conversation context across multiple turns.\n"
    "5. When recommending itineraries, give day-by-day highlights with pacing and budget estimates."
)

ALL_DESTINATIONS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Taj Mahal",
        "state": "Uttar Pradesh",
        "price": 2200,
        "category": "Heritage & Forts",
        "image_url": "/static/images/taj_mahal.jpeg",
        "desc": "Iconic ivory-white marble mausoleum in Agra on the banks of Yamuna river. A UNESCO World Heritage masterpiece.",
        "best_season": "October to March",
        "keywords": ["taj mahal", "taj", "agra", "yamuna", "mughal", "wonder of the world", "up"],
        "highlights": "Dawn sunrise view, marble inlay artisan workshops, Mehtab Bagh sunset, Agra Fort.",
        "eco_tip": "Use electric battery shuttles from the east/west gates to minimize emissions near the monument.",
        "food": "Agra Petha (sweet ash gourd), Bedmi Puri with spicy Aloo sabzi, Mughlai curries.",
    },
    {
        "id": 2,
        "name": "Goa Beaches",
        "state": "Goa",
        "price": 4800,
        "category": "Coasts & Beaches",
        "image_url": "/static/images/goa_beaches.jpg",
        "desc": "Sunlit beaches, serene South Goa coves (Palolem, Agonda), vibrant heritage Latin quarters (Fontainhas), and water sports.",
        "best_season": "October to March",
        "keywords": ["goa", "goa beaches", "beach", "calangute", "baga", "palolem", "anjuna", "panaji", "fontainhas"],
        "highlights": "Sunset dolphin boat trips, Portuguese heritage walks in Fontainhas, spice plantation eco-tours.",
        "eco_tip": "Rent electric scooters (EV bikes) in Panaji and support beach clean-up initiatives.",
        "food": "Goan Fish Curry Thali, Prawn Balchão, Bebinca dessert, Poi bread.",
    },
    {
        "id": 3,
        "name": "Jaipur Palaces",
        "state": "Rajasthan",
        "price": 3600,
        "category": "Heritage & Forts",
        "image_url": "/static/images/jaipur_palaces.jpg",
        "desc": "The royal Pink City famous for Hawa Mahal, majestic Amber Fort, City Palace, and vibrant Johari Bazaar.",
        "best_season": "October to March",
        "keywords": ["jaipur", "pink city", "amber fort", "hawa mahal", "city palace", "rajasthan", "johari bazaar"],
        "highlights": "Amber Fort sound & light show, Jal Mahal lake photography, Bagru natural block printing.",
        "eco_tip": "Explore old city bazaars via electric rickshaws and buy directly from certified handloom artisans.",
        "food": "Dal Baati Churma, Pyaaz Kachori at Rawat, Ghevar, Laal Maas.",
    },
    {
        "id": 4,
        "name": "Kerala Backwaters",
        "state": "Kerala",
        "price": 4000,
        "category": "Coasts & Water",
        "image_url": "/static/images/kerala_backwaters.jpg",
        "desc": "Serene network of lagoons, palm-fringed canals, and lakes in Alleppey and Kumarakom.",
        "best_season": "September to March",
        "keywords": ["kerala backwaters", "backwaters", "alleppey", "alappuzha", "kumarakom", "houseboat", "kerala"],
        "highlights": "Solar houseboat cruises, village canoe tours, Ayurvedic wellness massages, Vembanad lake sunset.",
        "eco_tip": "Choose government-certified solar/electric houseboats to preserve the fragile wetland ecosystem.",
        "food": "Kerala Karimeen Pollichathu (pearl spot fish), Appam with vegetable stew, Sadya on banana leaf.",
    },
    {
        "id": 5,
        "name": "Varanasi Ghats",
        "state": "Uttar Pradesh",
        "price": 1900,
        "category": "Spiritual & Ghats",
        "image_url": "/static/images/varanasi_ghats.jpg",
        "desc": "Spiritual capital of India along the sacred Ganges, famed for evening Dashashwamedh Ganga Aarti and dawn boat rides.",
        "best_season": "October to March",
        "keywords": ["varanasi", "varanasi ghats", "banaras", "kashi", "ganga", "ganges", "aarti", "ghat"],
        "highlights": "Dawn rowing boat ride, Dashashwamedh Ghat evening Aarti, Sarnath Buddhist heritage excursion.",
        "eco_tip": "Opt for manual wooden rowing boats or CNG boats to protect river aquatic life.",
        "food": "Banarasi Paan, Malaiyyo (winter milk froth), Kachori Jalebi, Tamatar Chaat.",
    },
    {
        "id": 6,
        "name": "Munnar Tea Gardens",
        "state": "Kerala",
        "price": 3000,
        "category": "Hills & Mountains",
        "image_url": "/static/images/munnar_tea_gardens.jpg",
        "desc": "Rolling emerald tea plantations, cool mountain climate, misty ridges, and Eravikulam National Park.",
        "best_season": "September to May",
        "keywords": ["munnar", "munnar tea gardens", "tea", "eravikulam", "nilgiri tahr", "kerala hill station"],
        "highlights": "Top Station panoramic clouds, organic tea tasting at KDHP museum, trekking Anamudi foothills.",
        "eco_tip": "Stay in certified eco-lodges surrounded by organic spice gardens and avoid single-use plastics on trails.",
        "food": "Malabar Parotta with Kurma, fresh cardamom-infused mountain tea, banana fritters (Pazham Pori).",
    },
    {
        "id": 7,
        "name": "Ladakh Valleys",
        "state": "Ladakh",
        "price": 4400,
        "category": "Hills & Mountains",
        "image_url": "/static/images/ladakh_valleys.jpg",
        "desc": "High-altitude desert wonderland featuring azure Pangong Lake, sand dunes of Nubra Valley, and ancient monasteries.",
        "best_season": "May to September",
        "keywords": ["ladakh", "ladakh valleys", "leh", "pangong", "nubra", "khardung la", "himalayas", "zanskar"],
        "highlights": "Pangong Tso color-changing waters, double-humped camel safari in Hunder, Thiksey monastery morning chants.",
        "eco_tip": "Carry reusable insulated water bottles, refill at filtered water stations, and allow 48h for acclimatization.",
        "food": "Ladakhi Thukpa, steamed Momos, Butter tea (Gur Gur Chai), Tingmo bread.",
    },
    {
        "id": 8,
        "name": "Andaman Islands",
        "state": "Andaman and Nicobar Islands",
        "price": 4800,
        "category": "Coasts & Beaches",
        "image_url": "/static/images/andaman_islands.jpg",
        "desc": "Pristine white-sand beaches, Radhanagar Beach sunsets, scuba diving in turquoise waters, and Cellular Jail history.",
        "best_season": "October to April",
        "keywords": ["andaman", "andaman islands", "havelock", "radhanagar", "neil island", "port blair", "scuba"],
        "highlights": "Radhanagar Beach (Asia's cleanest), coral reef scuba & snorkeling at Elephant Beach, bioluminescence night kayak.",
        "eco_tip": "Use reef-safe sunscreen and refrain from touching corals or collecting marine shells.",
        "food": "Grilled Red Snapper, Coconut prawn curry, fresh tropical dragon fruit bowls.",
    },
    {
        "id": 9,
        "name": "Hampi Ruins",
        "state": "Karnataka",
        "price": 2500,
        "category": "Heritage & Forts",
        "image_url": "/static/images/hampi_ruins.jpg",
        "desc": "UNESCO World Heritage site featuring 14th-century Vijayanagara Empire stone temples, monolithic boulders, and Tungabhadra river.",
        "best_season": "October to March",
        "keywords": ["hampi", "hampi ruins", "vijayanagara", "virupaksha", "stone chariot", "karnataka"],
        "highlights": "Stone Chariot at Vittala Temple, sunset from Matanga Hill, coracle boat ride on Tungabhadra River.",
        "eco_tip": "Explore the heritage complex using rented bicycles or electric buggies.",
        "food": "Karnataka Jolada Rotti Oota, Badane Ennegayi (stuffed brinjal), Mysore Pak.",
    },
    {
        "id": 10,
        "name": "Darjeeling Hills",
        "state": "West Bengal",
        "price": 3300,
        "category": "Hills & Mountains",
        "image_url": "/static/images/darjeeling_hills.jpg",
        "desc": "Queen of the Hills renowned for heritage Himalayan Toy Train, muscatel black tea estates, and views of Mt. Kangchenjunga.",
        "best_season": "March to May & October to December",
        "keywords": ["darjeeling", "darjeeling hills", "toy train", "kangchenjunga", "tiger hill", "west bengal"],
        "highlights": "Tiger Hill sunrise over Mt. Kanchenjunga, UNESCO Darjeeling Himalayan Railway ride, Happy Valley tea estate.",
        "eco_tip": "Support certified organic and fair-trade tea cooperatives during your estate visits.",
        "food": "Darjeeling steamed momos with spicy churpi chutney, Thukpa, Tibetan Shaphaley, First Flush Black Tea.",
    },
    {
        "id": 11,
        "name": "Mysore Palace",
        "state": "Karnataka",
        "price": 3700,
        "category": "Heritage & Forts",
        "image_url": "/static/images/mysore_palace.jpg",
        "desc": "Grand royal seat of the Wadiyar dynasty, celebrated for magnificent Indo-Saracenic architecture illuminated by 100,000 lights.",
        "best_season": "September to March",
        "keywords": ["mysore", "mysuru", "mysore palace", "chamundi hill", "wadiyar", "karnataka"],
        "highlights": "Palace Sunday illumination, Chamundi Hill temple panoramic views, Devaraja Market silk & sandalwood walk.",
        "eco_tip": "Purchase GI-tagged authentic Mysore Silk directly from government KSIC outlets.",
        "food": "Crispy Mysore Masala Dosa, Mysore Pak from Guru Sweet Mart, filter coffee.",
    },
    {
        "id": 12,
        "name": "Udaipur Lakes",
        "state": "Rajasthan",
        "price": 4800,
        "category": "Heritage & Forts",
        "image_url": "/static/images/udaipur_lakes.JPG",
        "desc": "The Venice of the East, famed for shimmering Lake Pichola, ornate City Palace, Jag Mandir, and romantic sunset boat rides.",
        "best_season": "October to March",
        "keywords": ["udaipur", "udaipur lakes", "lake pichola", "city palace", "jag mandir", "fateh sagar", "rajasthan"],
        "highlights": "Lake Pichola boat cruise to Jag Mandir, Bagore Ki Haveli folk dance show, Monsoon Palace sunset viewpoint.",
        "eco_tip": "Opt for electric solar-powered boats on Lake Pichola to keep the lake waters pure.",
        "food": "Dal Baati with Gatte ki Sabzi, Mewari Kachori, Ker Sangri.",
    },
    {
        "id": 13,
        "name": "Rishikesh Riverfront",
        "state": "Uttarakhand",
        "price": 2900,
        "category": "Spiritual & Mountains",
        "image_url": "/static/images/rishikesh_riverfront.jpg",
        "desc": "Yoga capital of the world by the turquoise Himalayan Ganges, known for iconic suspension bridges, ashrams, and river rafting.",
        "best_season": "September to April",
        "keywords": ["rishikesh", "rishikesh riverfront", "laxman jhula", "ram jhula", "yoga", "rafting", "triveni ghat", "uttarakhand"],
        "highlights": "Triveni Ghat evening Maha Aarti, certified white-water rafting, Beatles Ashram art murals, meditation sessions.",
        "eco_tip": "Practice Leave No Trace ethics along the riverbanks and dine at organic zero-waste riverside cafes.",
        "food": "Ayurvedic Satvik Thali, fresh herbal ginger-lemon-honey tea, Aloo Puri at Chotiwala.",
    },
    {
        "id": 14,
        "name": "Ooty Hills",
        "state": "Tamil Nadu",
        "price": 3400,
        "category": "Hills & Mountains",
        "image_url": "/static/images/ooty_hills.jpg",
        "desc": "Cool-weather Nilgiri hill station with botanical gardens, aromatic eucalyptus groves, Doddabetta Peak, and vintage toy train.",
        "best_season": "October to June",
        "keywords": ["ooty", "ooty hills", "nilgiris", "doddabetta", "pykara", "toy train", "tamil nadu"],
        "highlights": "UNESCO Nilgiri Mountain Railway, Pykara Lake boat ride, Doddabetta Peak telescope viewpoint.",
        "eco_tip": "Respect Toda tribal heritage and support local handmade Nilgiri eucalyptus essential oil producers.",
        "food": "Homemade Ooty artisanal chocolates, Nilgiri tea, hot Podi Idli, South Indian filter coffee.",
    },
    {
        "id": 15,
        "name": "Jaisalmer Fort",
        "state": "Rajasthan",
        "price": 4000,
        "category": "Heritage & Desert",
        "image_url": "/static/images/jaisalmer_fort.jpg",
        "desc": "Living golden sandstone citadel (Sonar Qila) rising above the Thar Desert, adorned with ornate havelis and camel safaris.",
        "best_season": "October to March",
        "keywords": ["jaisalmer", "jaisalmer fort", "sonar qila", "thar desert", "sam sand dunes", "haveli", "rajasthan"],
        "highlights": "Sam Sand Dunes sunset camel trek, Patwon Ki Haveli architecture, Desert stargazing camp.",
        "eco_tip": "Choose eco-friendly camel safaris that respect animal welfare and avoid dune off-roading in sensitive habitats.",
        "food": "Ker Sangri, Rajasthani Gatte, Makhania Lassi, Bajra Roti with white butter.",
    },
    {
        "id": 16,
        "name": "Golden Temple",
        "state": "Punjab",
        "price": 2600,
        "category": "Spiritual",
        "image_url": "/static/images/golden_temple.jpg",
        "desc": "Sri Harmandir Sahib in Amritsar, a luminous spiritual haven of peace, reflective Amrit Sarovar water, and 24/7 free Langar.",
        "best_season": "October to March",
        "keywords": ["golden temple", "amritsar", "harmandir sahib", "langar", "wagah border", "punjab"],
        "highlights": "Amrit Sarovar circumambulation, serving at the world's largest community kitchen (Langar), Wagah Border ceremony.",
        "eco_tip": "Participate as a volunteer (Seva) at the Langar to experience community equality and eco-conscious communal dining.",
        "food": "Amritsari Kulcha with Chole, rich creamy Lassi at Ahuja, Karah Parshad, Dal Makhani at Kesar Da Dhaba.",
    },
    {
        "id": 17,
        "name": "Khajuraho Temples",
        "state": "Madhya Pradesh",
        "price": 3100,
        "category": "Heritage & Art",
        "image_url": "/static/images/khajuraho_temples.jpg",
        "desc": "UNESCO World Heritage temple cluster renowned for exquisite medieval Nagara-style stone architecture and sculptures.",
        "best_season": "October to March",
        "keywords": ["khajuraho", "khajuraho temples", "kandariya mahadeva", "madhya pradesh", "unesco"],
        "highlights": "Kandariya Mahadeva Temple stone craftsmanship, Western Group sound and light show, Panna National Park safari.",
        "eco_tip": "Hire certified local ASI heritage guides to directly empower the artisan community.",
        "food": "Bundelkhandi Thali, Dal Bafla, fresh sugarcane juice, Mawa Jalebi.",
    },
    {
        "id": 18,
        "name": "Meghalaya Waterfalls",
        "state": "Meghalaya",
        "price": 3700,
        "category": "Nature & Wildlife",
        "image_url": "/static/images/meghalaya_waterfalls.jpg",
        "desc": "The Abode of Clouds featuring roaring Nohkalikai Falls, living root bridges in Cherrapunji, and crystal-clear Umngot river in Dawki.",
        "best_season": "September to May",
        "keywords": ["meghalaya", "meghalaya waterfalls", "cherrapunji", "shillong", "nohkalikai", "living root bridge", "dawki", "mawlynnong"],
        "highlights": "Double Decker Living Root Bridge trek in Nongriat, transparent boat ride at Dawki, Mawlynnong clean village.",
        "eco_tip": "Marvel at indigenous bio-engineering of living root bridges and keep all forest trails 100% plastic-free.",
        "food": "Khasi Jadoh (rice with herbs), Dohneiiong, fresh bamboo shoot curry, local wild berry tea.",
    },
    {
        "id": 19,
        "name": "Coorg Highlands",
        "state": "Karnataka",
        "price": 3500,
        "category": "Hills & Nature",
        "image_url": "/static/images/coorg_highlands.jpg",
        "desc": "Kodagu's emerald paradise of Arabica coffee plantations, spice gardens, Abbey Falls, and misty Raja's Seat viewpoints.",
        "best_season": "September to June",
        "keywords": ["coorg", "coorg highlands", "kodagu", "madikeri", "abbey falls", "coffee", "raja seat", "karnataka"],
        "highlights": "Private coffee estate tour & bean harvesting, Abbey Falls, Dubare Elephant Camp, Raja's Seat sunset.",
        "eco_tip": "Stay in authentic family-run coffee plantation homestays that harvest rainwater and use organic compost.",
        "food": "Coorg Pandi Curry, Kadambuttu (steamed rice dumplings), Noolputtu with coconut milk, fresh Coorg coffee.",
    },
    {
        "id": 20,
        "name": "Puducherry Promenade",
        "state": "Puducherry",
        "price": 3200,
        "category": "Coasts & Heritage",
        "image_url": "/static/images/puducherry_promenade.jpg",
        "desc": "Charming French colonial quarter (White Town), sea-facing Goubert Avenue promenade, pastel villas, and serene Auroville.",
        "best_season": "October to March",
        "keywords": ["puducherry", "pondicherry", "pondy", "white town", "auroville", "promenade", "french colony"],
        "highlights": "Sunrise cycling along Goubert Avenue, Matrimandir meditation in Auroville, French cafe hopping in White Town.",
        "eco_tip": "Rent vintage bicycles to explore White Town and support Auroville's zero-waste sustainable craft boutiques.",
        "food": "French butter croissants, Creole Seafood Curry, Wood-fired sourdough pizza, French press coffee.",
    },
    {
        "id": 21,
        "name": "Charminar",
        "state": "Telangana",
        "price": 3400,
        "category": "Heritage & Culture",
        "image_url": "/static/images/charminar.jpg",
        "desc": "16th-century architectural heart of Hyderabad, flanked by four grand minarets, bustling Laad Bazaar, and aromatic Nizami cuisine.",
        "best_season": "October to March",
        "keywords": ["charminar", "hyderabad", "laad bazaar", "nizam", "telangana", "old city"],
        "highlights": "Charminar rooftop view, shopping for handcrafted lacquer bangles in Laad Bazaar, Chowmahalla Palace tour.",
        "eco_tip": "Use the Hyderabad Metro for rapid, low-carbon transit between modern tech hubs and historic Old City.",
        "food": "Hyderabadi Dum Biryani, Osmania biscuits with Irani Chai, Double Ka Meetha, Haleem.",
    },
    {
        "id": 22,
        "name": "Golkonda Fort",
        "state": "Telangana",
        "price": 3800,
        "category": "Heritage & Forts",
        "image_url": "/static/images/golkonda_fort.jpg",
        "desc": "Historic fortress famed for ingenious acoustic architecture, Koh-i-Noor diamond vaults, and sweeping panoramic views across Hyderabad.",
        "best_season": "October to March",
        "keywords": ["golkonda", "golkonda fort", "golconda", "hyderabad", "fort", "telangana"],
        "highlights": "Acoustic clapping portico demonstration, royal Qutb Shahi tombs excursion, evening sound & light spectacle.",
        "eco_tip": "Carry a refillable steel water flask during the fort climb to eliminate disposable bottle waste.",
        "food": "Telangana spicy Natu Kodi Pulao, Kubani Ka Meetha with cream, Mirchi Ka Salan.",
    },
    {
        "id": 23,
        "name": "Gateway of India",
        "state": "Maharashtra",
        "price": 4800,
        "category": "Heritage & City",
        "image_url": "/static/images/gateway_of_india.jpg",
        "desc": "Majestic 20th-century basalt arch overlooking the Arabian Sea in South Mumbai, near the historic Taj Mahal Palace Hotel.",
        "best_season": "November to February",
        "keywords": ["gateway of india", "mumbai", "bombay", "colaba", "arabian sea", "maharashtra"],
        "highlights": "South Mumbai heritage Art Deco architectural walk, ferry to Elephanta Caves, sunset at Marine Drive Queen's Necklace.",
        "eco_tip": "Ride Mumbai's electric BEST double-decker buses for sustainable South Bombay sightseeing.",
        "food": "Mumbai Vada Pav, Bombay Duck fry, Pav Bhaji at Sardar, Bun Maska at Leopold / Britannia Cafe.",
    },
    {
        "id": 24,
        "name": "Ellora Caves",
        "state": "Maharashtra",
        "price": 3400,
        "category": "Heritage & Art",
        "image_url": "/static/images/ellora_caves.jpg",
        "desc": "Astonishing monolithic rock-cut cave temples in Aurangabad, featuring the world-renowned single-rock Kailash Temple.",
        "best_season": "October to March",
        "keywords": ["ellora", "ellora caves", "kailash temple", "aurangabad", "chhatrapati sambhajinagar", "ajanta", "maharashtra"],
        "highlights": "Kailash Temple (Cave 16) single-rock excavation marvel, Buddhist monastery caves, Jain shrine carvings.",
        "eco_tip": "Use government-operated electric shuttle coaches between the caves to protect the heritage rock from exhaust fumes.",
        "food": "Aurangabad Naan Qalia, Hurda roasted sorghum, Puran Poli.",
    },
    {
        "id": 25,
        "name": "Konark Sun Temple",
        "state": "Odisha",
        "price": 3500,
        "category": "Heritage & Coast",
        "image_url": "/static/images/konark_sun_temple.jpg",
        "desc": "13th-century UNESCO marvel sculpted as a colossal 24-wheeled chariot of the Sun God Surya near Chandrabhaga beach.",
        "best_season": "October to March",
        "keywords": ["konark", "konark sun temple", "black pagoda", "odisha", "puri", "chandrabhaga beach"],
        "highlights": "Intricate sundial wheels that calculate exact time, Chandrabhaga beach sunrise, Konark dance festival.",
        "eco_tip": "Explore Chandrabhaga beach's eco-certified blue flag coastal trail and avoid littering.",
        "food": "Odia Dalma, Chenna Poda (baked cheese dessert), fresh Bay of Bengal crab curry, Khaja.",
    },
    {
        "id": 26,
        "name": "Sunderbans Mangroves",
        "state": "West Bengal",
        "price": 4200,
        "category": "Nature & Wildlife",
        "image_url": "/static/images/sunderbans_mangroves.jpg",
        "desc": "The world's largest coastal mangrove delta, crisscrossed by tidal waterways and home to the elusive Royal Bengal Tiger.",
        "best_season": "October to March",
        "keywords": ["sunderbans", "sunderbans mangroves", "bengal tiger", "mangrove", "delta", "west bengal"],
        "highlights": "Boat safari through narrow tidal estuaries, Sajnekhali bird sanctuary, Dobanki canopy walk.",
        "eco_tip": "Always travel with licensed eco-tourism boat operators with silent solar/low-emission motors.",
        "food": "Bengali Shorshe Ilish (hilsa in mustard), Chingri Malai Curry, Mishti Doi, Sandesh.",
    },
    {
        "id": 27,
        "name": "Kaziranga National Park",
        "state": "Assam",
        "price": 4600,
        "category": "Nature & Wildlife",
        "image_url": "/static/images/kaziranga_national_park.jpg",
        "desc": "UNESCO sanctuary in the Brahmaputra floodplains, sheltering two-thirds of the world's great one-horned rhinoceroses.",
        "best_season": "November to April",
        "keywords": ["kaziranga", "kaziranga national park", "rhino", "one-horned rhino", "assam", "brahmaputra", "wildlife"],
        "highlights": "Jeep safari in Central/Western ranges, Kaziranga Orchid and Biodiversity Park, Brahmaputra river dolphin spotting.",
        "eco_tip": "Support community-run anti-poaching eco-camps and buy direct Assamese Muga silk weaves.",
        "food": "Assamese Masor Tenga (tangy river fish curry), Khaar with duck, Joha aromatic rice, Pitha.",
    },
    {
        "id": 28,
        "name": "Valley of Flowers",
        "state": "Uttarakhand",
        "price": 3900,
        "category": "Hills & Nature",
        "image_url": "/static/images/valley_of_flowers.jpg",
        "desc": "High-altitude Himalayan alpine meadow in Chamoli that erupts into a vibrant carpet of endemic alpine blooms and waterfalls.",
        "best_season": "July to September",
        "keywords": ["valley of flowers", "chamoli", "hemkund sahib", "ghangaria", "alpine flowers", "uttarakhand", "trek"],
        "highlights": "Trek through 500+ species of wild Himalayan flowers, sacred Hemkund Sahib glacial lake, Pushpawati river gorge.",
        "eco_tip": "Strict plastic ban is enforced by local eco-committees; bring all personal trash back to base camp.",
        "food": "Garhwali Kafuli (spinach gravy), Phaanu, Mandua (finger millet) roti, hot Rhododendron squash.",
    },
    {
        "id": 29,
        "name": "Dal Lake",
        "state": "Jammu & Kashmir",
        "price": 4800,
        "category": "Hills & Water",
        "image_url": "/static/images/dal_lake.jpg",
        "desc": "The jewel of Srinagar, celebrated for handcrafted wooden houseboats, sunrise Shikara floating vegetable markets, and Mughal gardens.",
        "best_season": "April to October (Pleasant) & December to February (Snow)",
        "keywords": ["dal lake", "srinagar", "kashmir", "shikara", "houseboat", "mughal gardens", "gulmarg", "pahalgam"],
        "highlights": "Dawn floating vegetable market Shikara ride, stay in hand-carved cedarwood houseboats, Nishat & Shalimar gardens.",
        "eco_tip": "Encourage zero-discharge eco-houseboats that treat greywater to keep Dal Lake crystal clear.",
        "food": "Kashmiri Wazwan (Rogan Josh, Gushtaba), aromatic saffron Kahwa with crushed almonds, Nadru Yakhni (lotus stem).",
    },
    {
        "id": 30,
        "name": "Rann of Kutch",
        "state": "Gujarat",
        "price": 4300,
        "category": "Desert & Culture",
        "image_url": "/static/images/rann_of_kutch.jpg",
        "desc": "Vast, surreal white-salt desert that shines under full moon nights, celebrated for Rann Utsav cultural festivities and artisan crafts.",
        "best_season": "November to February",
        "keywords": ["rann of kutch", "kutch", "white desert", "rann utsav", "dhordo", "bhuj", "gujarat"],
        "highlights": "Full moon walk on the white salt desert, Rogan art workshop in Nirona village, sunset at Kalo Dungar (Black Hill).",
        "eco_tip": "Stay in traditional eco-friendly mud huts (Bhunga) constructed by local artisans using natural thermal insulation.",
        "food": "Kutchi Dabeli, traditional Gujarati Thali with Bajra No Rotlo, Ringna No Oro, fresh Chas (buttermilk).",
    },
]


def is_gemini_configured() -> bool:
    return bool(config.GEMINI_API_KEY)


def build_destination_system_context() -> str:
    lines = ["Here is the verified Indian Journeys catalog of 30 bookable destinations in India:"]
    for d in ALL_DESTINATIONS:
        lines.append(
            f"- ID {d['id']}: {d['name']} ({d['state']}) | Category: {d['category']} | Price: Rs. {d['price']}/night | "
            f"Best Time: {d['best_season']} | Highlights: {d['highlights']} | Food: {d['food']} | Eco Tip: {d['eco_tip']}"
        )
    return "\n".join(lines)


def query_gemini_api(message: str, history: Optional[List[Dict[str, Any]]] = None, model_name: str = "gemini-2.5-flash") -> Optional[str]:
    request_url = f"{config.GEMINI_API_URL}/{model_name}:generateContent"
    
    # Construct multi-turn contents
    contents: List[Dict[str, Any]] = []
    
    if history and isinstance(history, list):
        recent_history = history[-8:]
        for item in recent_history:
            role = "user" if (item.get("role") == "user" or item.get("isUser") is True) else "model"
            text = (item.get("text") or item.get("content") or "").strip()
            if text:
                contents.append({"role": role, "parts": [{"text": text}]})

    # Append the current prompt
    contents.append({"role": "user", "parts": [{"text": message}]})

    full_system_instruction = f"{SYSTEM_PROMPT}\n\n{build_destination_system_context()}"

    payload = {
        "system_instruction": {
            "parts": [{"text": full_system_instruction}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.65,
            "maxOutputTokens": 800,
        },
    }

    req = urllib.request.Request(
        request_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": config.GEMINI_API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=12) as response:
        body = json.loads(response.read().decode("utf-8"))

    candidates = body.get("candidates") or []
    if not candidates:
        return None

    parts = (candidates[0].get("content") or {}).get("parts") or []
    content = " ".join(part.get("text", "").strip() for part in parts if part.get("text")).strip()
    return content if content else None


STATE_NAMES = {
    "kerala", "rajasthan", "karnataka", "tamil nadu", "uttarakhand",
    "west bengal", "maharashtra", "telangana", "ladakh", "jammu & kashmir",
    "jammu and kashmir", "goa", "assam", "meghalaya", "gujarat", "odisha",
    "punjab", "uttar pradesh", "madhya pradesh", "andaman & nicobar",
    "andaman and nicobar islands", "puducherry"
}


def find_destinations_in_text(text: str) -> List[Dict[str, Any]]:
    """Identifies relevant destination objects referenced in a text or query."""
    lower = text.lower()
    matched = []
    seen_ids = set()

    # Pass 1: Exact / Primary Destination Name Match (e.g., 'Taj Mahal', 'Munnar', 'Hampi', 'Ooty', etc.)
    for d in ALL_DESTINATIONS:
        primary_name = d["name"].lower().split()[0]
        if d["name"].lower() in lower or (len(primary_name) > 3 and primary_name not in STATE_NAMES and primary_name in lower):
            if d["id"] not in seen_ids:
                matched.append(d)
                seen_ids.add(d["id"])

    # Pass 2: Unique keyword aliases (e.g., 'alleppey' -> Kerala Backwaters, 'leh' -> Ladakh, 'pink city' -> Jaipur)
    for d in ALL_DESTINATIONS:
        if d["id"] in seen_ids:
            continue
        for kw in d["keywords"]:
            kw_clean = kw.strip().lower()
            if len(kw_clean) >= 3 and kw_clean not in STATE_NAMES and kw_clean in lower:
                matched.append(d)
                seen_ids.add(d["id"])
                break

    return matched


def extract_context_destination(history: Optional[List[Dict[str, Any]]]) -> Optional[Dict[str, Any]]:
    """Extracts the most recently discussed destination from previous conversation turns."""
    if not history:
        return None

    # Check user messages in reverse order first
    for item in reversed(history):
        is_user = item.get("role") == "user" or item.get("isUser") is True
        if not is_user:
            continue
        text = (item.get("text") or item.get("content") or "").lower()
        if not text:
            continue
        found = find_destinations_in_text(text)
        if found:
            return found[0]

    # Fallback to model/assistant messages in reverse order
    for item in reversed(history):
        text = (item.get("text") or item.get("content") or "").lower()
        if not text:
            continue
        found = find_destinations_in_text(text)
        if found:
            return found[0]

    return None


def generate_local_knowledge_reply(query: str, history: Optional[List[Dict[str, Any]]] = None) -> Tuple[str, List[Dict[str, Any]], List[str]]:
    """
    State-of-the-art Domain NLP & Rule Engine for Indian Journeys.
    Accurately handles destination discovery, itineraries, budgets, seasonal pacing,
    operational booking questions, multi-turn follow-ups, and local delicacies.
    """
    q = query.lower().strip()
    context_dest = extract_context_destination(history)

    # 1. Booking, Payment, Support & Cancellation questions
    if any(k in q for k in ["how to book", "booking process", "reserve", "how do i book", "how can i book"]):
        reply = (
            "✨ **How to Book a Stay on Indian Journeys:**\n\n"
            "1. **Select Destination**: Browse from our 30 curated scenic destinations on the **Home** or **Discover** page.\n"
            "2. **Customize Your Trip**: Choose your Check-In & Check-Out dates, number of guests, and travel style.\n"
            "3. **Choose Transport & Add-ons**: Add private SUV/Sedan cab transfers, flights, organic farm meal plans, or a certified naturalist guide.\n"
            "4. **Instant UPI / Card Payment**: Complete booking via instant UPI QR code or VPA (`9391862579@axl`).\n\n"
            "🛡️ *Free cancellation is available up to 48 hours before check-in.* For personal concierge support, call **9347466496**."
        )
        return reply, [], ["🌴 Explore beach destinations", "🏔️ Mountain getaways", "📋 Cancellation policy", "📞 Contact support"]

    if any(k in q for k in ["cancel", "refund", "cancellation policy", "money back", "how to cancel"]):
        reply = (
            "📋 **Cancellation & 100% Refund Policy:**\n\n"
            "• **100% Full Refund**: Free cancellation for all bookings when requested at least **48 hours prior to check-in**.\n"
            "• **Instant Self-Service**: Go to **My Trips** from the navigation bar, select your booking, and click **'Cancel Booking'**.\n"
            "• **Refund Processing**: Refunds for UPI and card payments are credited directly back to your source account within **2 to 4 business days**.\n\n"
            "Need urgent changes to your dates? Call our 24/7 concierge at **9347466496**."
        )
        return reply, [], ["✨ How to book", "💳 Payment methods", "📞 Call concierge", "🌿 View top stays"]

    if any(k in q for k in ["payment", "upi", "pay", "google pay", "phonepe", "paytm", "gpay", "bhim"]):
        reply = (
            "💳 **Fast & Secure Payment Options:**\n\n"
            "• **Instant UPI**: Scan the dynamic QR code on checkout or pay directly to VPA `9391862579@axl` (works with Google Pay, PhonePe, Paytm, BHIM).\n"
            "• **Instant Confirmation**: Your booking reference number and printable receipt are generated immediately once payment is verified.\n"
            "• **View Receipts**: All your trip vouchers and invoices remain securely saved in **My Trips**."
        )
        return reply, [], ["✨ How to book", "📋 Cancellation policy", "📞 Contact support", "🗺️ View live maps"]

    if any(k in q for k in ["contact", "customer care", "phone number", "support", "call", "helpline", "emergency"]):
        reply = (
            "📞 **Indian Journeys Customer Care & Concierge:**\n\n"
            "• **Direct Helpline**: [9347466496](tel:9347466496)\n"
            "• **Operating Hours**: 7 Days a week (8:00 AM – 10:00 PM IST)\n"
            "• **Services Provided**: Custom route planning, hotel date changes, cab dispatch, and on-trip emergency assistance."
        )
        return reply, [], ["✨ How to book", "🏰 Rajasthan Palaces", "🌴 Kerala Backwaters", "❄️ Winter getaways"]

    # 2. Itinerary & Trip Planning Queries (Prioritize multi-day / weekend plans)
    if any(k in q for k in ["itinerary", "plan a trip", "3 day", "3-day", "5 day", "5-day", "2 day", "2-day", "7 day", "weekend trip", "route"]):
        if "kerala" in q or "munnar" in q or "backwater" in q:
            kerala_spots = [d for d in ALL_DESTINATIONS if d["state"] == "Kerala"]
            reply = (
                "🌴 **Curated 3-Day Kerala Backwaters & Munnar Itinerary:**\n\n"
                "• **Day 1 (Alleppey Backwaters)**: Check into a solar-powered eco houseboat. Cruise through scenic palm canals and enjoy authentic Karimeen fish curry.\n"
                "• **Day 2 (Alleppey → Munnar)**: Scenic mountain drive past Cheeyappara waterfalls. Afternoon walk through organic tea plantations and Pothamedu sunset.\n"
                "• **Day 3 (Munnar Highlands)**: Early morning trek to Top Station for panoramic valley clouds. Spice plantation walk and tea museum tour before departure.\n\n"
                "💰 *Estimated stay budget: Rs. 7,000 – 9,000 for 2 nights.*"
            )
            return reply, kerala_spots, ["☕ Munnar Tea Gardens", "🛶 Kerala Backwaters", "✨ How to book", "📞 Call Concierge"]
        elif "rajasthan" in q or "jaipur" in q or "udaipur" in q:
            raj_spots = [d for d in ALL_DESTINATIONS if d["state"] == "Rajasthan"][:3]
            reply = (
                "🏰 **Curated 3-Day Royal Rajasthan Heritage Route:**\n\n"
                "• **Day 1 (Jaipur - Pink City)**: Sunrise at Hawa Mahal, morning exploration of Amber Fort, and afternoon walk through Johari Bazaar.\n"
                "• **Day 2 (Jaipur → Udaipur / Pushkar)**: Scenic transfer to the City of Lakes. Evening romantic boat cruise on Lake Pichola past Jag Mandir.\n"
                "• **Day 3 (Udaipur Palaces)**: Visit the grand City Palace and Bagore Ki Haveli folk dance show before farewell dinner.\n\n"
                "💰 *Estimated stay budget: Rs. 7,500 – 10,500 for 2 nights.*"
            )
            return reply, raj_spots, ["🏰 Jaipur Palaces", "👑 Udaipur Lakes", "✨ How to book", "📞 Concierge"]
        else:
            tri_spots = [d for d in ALL_DESTINATIONS if d["name"] in ["Taj Mahal", "Jaipur Palaces", "Varanasi Ghats"]]
            reply = (
                "🗺️ **Suggested 3-Day Classic Golden Triangle & Heritage Itinerary:**\n\n"
                "• **Day 1 (Agra)**: Dawn sunrise visit to the Taj Mahal to beat crowds. Afternoon tour of Agra Fort and marble inlay artisan workshops.\n"
                "• **Day 2 (Agra → Jaipur)**: Scenic drive via Fatehpur Sikri. Evening arrival in the Pink City with rooftop Dal Baati dinner.\n"
                "• **Day 3 (Jaipur)**: Electric vehicle tour of Amber Fort, Hawa Mahal photo stop, and artisan handicraft shopping.\n\n"
                "✨ *Explore full day-by-day itineraries and packing guides under our **Travel Guides** tab!*"
            )
            return reply, tri_spots, ["🕌 Taj Mahal", "🏰 Jaipur Palaces", "✨ How to book", "📞 Contact Concierge"]

    # 3. Direct Destination Search & Specific Queries (Food, Best Time, Price)
    matched_dests = find_destinations_in_text(q)
    if matched_dests and len(matched_dests) == 1:
        d = matched_dests[0]
        if any(w in q for w in ["food", "eat", "cuisine", "dish", "delicacy", "specialty"]):
            reply = (
                f"🍲 **Famous Local Cuisines in {d['name']} ({d['state']}):**\n\n"
                f"• **Must-Try Specialties**: {d['food']}\n"
                f"• **Stay Rate**: Starting at **Rs. {d['price']}/night**\n"
                f"• **Eco Dining**: Verified organic farm-to-table breakfast and local village culinary experiences.\n\n"
                f"Would you like an itinerary or budget breakdown for {d['name']}?"
            )
            return reply, [d], [f"🗓️ 3-day {d['name']} itinerary", f"💰 Budget for {d['name']}", f"☀️ Best time for {d['name']}", "✨ How to book"]

        reply = (
            f"📍 **{d['name']} — {d['state']}**\n\n"
            f"• **Category**: {d['category']}\n"
            f"• **Stay Price**: Starting at **Rs. {d['price']}/night** (verified eco-stay)\n"
            f"• **Best Season**: {d['best_season']}\n"
            f"• **Top Highlights**: {d['highlights']}\n"
            f"• **Local Food Specialties**: {d['food']}\n"
            f"• **Eco Tip**: {d['eco_tip']}\n\n"
            f"💡 *You can view live GPS coordinates and book this destination with zero cancellation fees!*"
        )
        prompts = [f"🗓️ 3-day {d['name']} itinerary", f"🍲 Famous food in {d['name']}", f"💰 Budget breakdown", "✨ How to book"]
        return reply, [d], prompts

    # 4. Contextual follow-up resolution (if user asks about a previously discussed place)
    is_followup = any(w in q for w in ["best time", "when to visit", "how much", "price", "cost", "food", "what to eat", "how to reach", "activities", "highlights", "weather", "season", "there", "this place", "itinerary here"])
    if is_followup and context_dest and not any(d["name"].lower() in q for d in ALL_DESTINATIONS):
        d = context_dest
        if any(w in q for w in ["food", "eat", "cuisine", "dish", "delicacy"]):
            reply = (
                f"🍲 **Famous Local Cuisines in {d['name']} ({d['state']}):**\n\n"
                f"• **Must-Try Specialties**: {d['food']}\n"
                f"• **Stay Rate**: Starting at **Rs. {d['price']}/night**\n"
                f"• **Eco Tip**: {d['eco_tip']}\n\n"
                f"Would you like an itinerary or budget breakdown for {d['name']}?"
            )
            return reply, [d], [f"🗓️ 3-day {d['name']} itinerary", f"💰 Budget for {d['name']}", f"☀️ Best time for {d['name']}", "📍 View on Map"]
        elif any(w in q for w in ["when to visit", "best time", "season", "weather"]):
            reply = (
                f"☀️ **Best Time to Visit {d['name']} ({d['state']}):**\n\n"
                f"• **Ideal Season**: **{d['best_season']}**\n"
                f"• **Key Highlights**: {d['highlights']}\n"
                f"• **Current Night Rate**: **Rs. {d['price']}/night**\n"
                f"• **Eco-Travel Tip**: {d['eco_tip']}\n\n"
                f"You can view live maps and book verified stays for {d['name']} directly on our platform!"
            )
            return reply, [d], [f"🗓️ 3-day {d['name']} plan", f"🍲 Food in {d['name']}", "✨ How to book", "📍 Live Maps"]
        elif any(w in q for w in ["price", "cost", "how much", "rate", "budget"]):
            reply = (
                f"💰 **Pricing & Budget Guide for {d['name']} ({d['state']}):**\n\n"
                f"• **Eco Stay Rate**: Starting from **Rs. {d['price']}/night** (Includes organic breakfast)\n"
                f"• **Estimated 3-Day Trip Budget (2 Adults)**: ~Rs. {d['price'] * 2 + 3500} (Including stay, local transfers & guided heritage tour)\n"
                f"• **Best Season**: {d['best_season']}\n\n"
                f"👉 Reserve directly on the **{d['name']}** page with free 48h cancellation!"
            )
            return reply, [d], [f"🗓️ 3-day {d['name']} plan", "✨ How to book", "💳 UPI payment", "📞 Concierge help"]

    # 5. State & Regional Queries
    state_matches = {
        "kerala": [d for d in ALL_DESTINATIONS if d["state"] == "Kerala"],
        "rajasthan": [d for d in ALL_DESTINATIONS if d["state"] == "Rajasthan"],
        "karnataka": [d for d in ALL_DESTINATIONS if d["state"] == "Karnataka"],
        "tamil nadu": [d for d in ALL_DESTINATIONS if d["state"] == "Tamil Nadu"],
        "uttarakhand": [d for d in ALL_DESTINATIONS if d["state"] == "Uttarakhand"],
        "west bengal": [d for d in ALL_DESTINATIONS if d["state"] == "West Bengal"],
        "maharashtra": [d for d in ALL_DESTINATIONS if d["state"] == "Maharashtra"],
        "telangana": [d for d in ALL_DESTINATIONS if d["state"] == "Telangana"],
        "ladakh": [d for d in ALL_DESTINATIONS if d["state"] == "Ladakh"],
        "kashmir": [d for d in ALL_DESTINATIONS if "kashmir" in d["state"].lower()],
        "goa": [d for d in ALL_DESTINATIONS if d["state"] == "Goa"],
        "northeast": [d for d in ALL_DESTINATIONS if d["state"] in ["Assam", "Meghalaya"]],
        "meghalaya": [d for d in ALL_DESTINATIONS if d["state"] == "Meghalaya"],
        "assam": [d for d in ALL_DESTINATIONS if d["state"] == "Assam"],
        "gujarat": [d for d in ALL_DESTINATIONS if d["state"] == "Gujarat"],
        "odisha": [d for d in ALL_DESTINATIONS if d["state"] == "Odisha"],
        "punjab": [d for d in ALL_DESTINATIONS if d["state"] == "Punjab"],
        "uttar pradesh": [d for d in ALL_DESTINATIONS if d["state"] == "Uttar Pradesh"],
        "madhya pradesh": [d for d in ALL_DESTINATIONS if d["state"] == "Madhya Pradesh"],
    }

    for state_key, places in state_matches.items():
        if state_key in q and places:
            lines = [f"🌟 **Top Handpicked Stays in {places[0]['state'] if state_key != 'northeast' else 'North-East India'}:**\n"]
            for p in places:
                lines.append(f"• **{p['name']}** — **Rs. {p['price']}/night** ({p['category']})\n  _{p['desc']}_\n")
            lines.append(f"💡 *Best Time: {places[0]['best_season']}. Click any card below to view details or reserve!*")
            return "\n".join(lines), places, [f"🗓️ Plan a {places[0]['state']} route", "💰 Budget stays", "✨ How to book", "📞 Concierge"]

    # 5. Budget-Specific Queries
    budget_match = re.search(r'(?:under|below|less than|budget of)\s*(?:rs\.?|inr|₹)?\s*(\d+)', q)
    if budget_match or any(k in q for k in ["budget", "cheap", "affordable", "low price", "inexpensive"]):
        limit = int(budget_match.group(1)) if budget_match else 3000
        budget_dests = [d for d in ALL_DESTINATIONS if d["price"] <= limit]
        if not budget_dests:
            budget_dests = sorted(ALL_DESTINATIONS, key=lambda x: x["price"])[:4]

        lines = [f"🌿 **Top Budget-Friendly Eco Stays (Under Rs. {limit:,} / night):**\n"]
        for loc in budget_dests[:5]:
            lines.append(f"• **{loc['name']}** ({loc['state']}) — **Rs. {loc['price']}/night**\n  _{loc['desc']}_\n")
        lines.append("💡 *Tip: All stays include verified solar energy, local organic dining, and 48-hour free cancellation.*")
        return "\n".join(lines), budget_dests[:4], ["🏖️ Beach escapes", "🏔️ Mountain getaways", "✨ How to book", "🗺️ View on Map"]

    # 6. Beach, Coastal & Island queries
    if any(k in q for k in ["beach", "coastal", "sea", "ocean", "island", "scuba", "coast"]):
        coastal = [d for d in ALL_DESTINATIONS if d["category"] in ["Coasts & Beaches", "Coasts & Water", "Coasts & Heritage", "Heritage & Coast"]]
        lines = ["🏖️ **Top Beach, Coastal & Island Getaways in India:**\n"]
        for loc in coastal[:4]:
            lines.append(f"• **{loc['name']}** ({loc['state']}) — **Rs. {loc['price']}/night**\n  _{loc['desc']}_\n")
        lines.append("🌊 *Best Season: October to April for clear waters, dolphin watching, and ocean breeze.*")
        return "\n".join(lines), coastal[:4], ["🌴 Goa beaches guide", "🌊 Andaman Islands plan", "✨ How to book", "📞 Contact support"]

    # 7. Mountain, Hills & Trekking queries
    if any(k in q for k in ["mountain", "hill", "hills", "trek", "trekking", "snow", "himalaya", "valley", "tea garden"]):
        hills = [d for d in ALL_DESTINATIONS if "Hills" in d["category"] or "Nature" in d["category"]]
        lines = ["🏔️ **Scenic Mountain Escapes, Hill Stations & Alpine Trails:**\n"]
        for loc in hills[:5]:
            lines.append(f"• **{loc['name']}** ({loc['state']}) — **Rs. {loc['price']}/night**\n  _{loc['desc']}_\n")
        lines.append("🌲 *Eco Tip: Support local mountain guides and maintain zero-waste trails.*")
        return "\n".join(lines), hills[:4], ["⛰️ 3-day Munnar plan", "❄️ Ladakh adventure", "🌸 Valley of Flowers trek", "✨ How to book"]

    # 8. Heritage, Forts, Palaces & History queries
    if any(k in q for k in ["heritage", "fort", "forts", "palace", "palaces", "history", "monument", "unesco", "ancient", "temple", "spiritual"]):
        heritage = [d for d in ALL_DESTINATIONS if "Heritage" in d["category"] or "Spiritual" in d["category"]]
        lines = ["🏰 **Royal Heritage, Forts & UNESCO Spiritual Landmarks:**\n"]
        for loc in heritage[:5]:
            lines.append(f"• **{loc['name']}** ({loc['state']}) — **Rs. {loc['price']}/night**\n  _{loc['desc']}_\n")
        lines.append("👑 *Best Time: October to March for cool heritage walks and palace festivals.*")
        return "\n".join(lines), heritage[:4], ["🕌 3-day Golden Triangle", "🏰 Royal Rajasthan route", "🛕 Hampi ruins guide", "✨ How to book"]

    # 9. Wildlife & Nature queries
    if any(k in q for k in ["wildlife", "safari", "animal", "national park", "tiger", "rhino", "forest", "mangrove"]):
        wildlife = [d for d in ALL_DESTINATIONS if "Nature & Wildlife" in d["category"]]
        lines = ["🐅 **Wildlife Safaris, National Parks & Eco-Delta Reserves:**\n"]
        for loc in wildlife:
            lines.append(f"• **{loc['name']}** ({loc['state']}) — **Rs. {loc['price']}/night**\n  _{loc['desc']}_\n")
        lines.append("🌿 *All jeep and boat safaris operate under strict sustainable wildlife guidelines.*")
        return "\n".join(lines), wildlife, ["🦏 Kaziranga Rhino Safari", "🐅 Sunderbans Delta", "✨ How to book", "📞 Concierge"]

    # 10. Seasonal Guidance (Winter, Summer, Monsoon)
    if any(k in q for k in ["winter", "december", "january", "february", "november"]):
        winter_spots = [d for d in ALL_DESTINATIONS if d["name"] in ["Jaisalmer Fort", "Rann of Kutch", "Taj Mahal", "Goa Beaches", "Kerala Backwaters"]]
        reply = (
            "❄️ **Best Indian Destinations for Winter Travel (Nov – Feb):**\n\n"
            "• **Rann of Kutch (Gujarat)**: Magical white-salt desert under full moon & Rann Utsav celebrations.\n"
            "• **Rajasthan Citadel Circuit (Jaipur & Jaisalmer)**: Pleasant desert days, palace lights, and campfires.\n"
            "• **Goa & Andaman Islands**: Warm sun, calm turquoise waters, and scuba diving.\n"
            "• **Agra & Taj Mahal**: Crisp morning sunrise without summer heat.\n\n"
            "💡 *Winter is peak season — we recommend booking stays at least 2 weeks in advance!*"
        )
        return reply, winter_spots, ["🏰 Jaisalmer Fort", "🧂 Rann of Kutch", "🌴 Goa Beaches", "✨ How to book"]

    if any(k in q for k in ["summer", "may", "june", "april"]):
        summer_spots = [d for d in ALL_DESTINATIONS if d["name"] in ["Ladakh Valleys", "Munnar Tea Gardens", "Darjeeling Hills", "Ooty Hills", "Valley of Flowers"]]
        reply = (
            "☀️ **Best Destinations to Beat the Heat in Summer (Apr – Jun):**\n\n"
            "• **Ladakh Valleys**: High-altitude crystal lakes (Pangong) and dramatic mountain passes.\n"
            "• **Munnar & Ooty Hills**: Cool misty tea plantations, eucalyptus breeze, and pine walks.\n"
            "• **Darjeeling Hills**: Panoramic views of Kangchenjunga and heritage toy train rides.\n"
            "• **Valley of Flowers (Uttarakhand)**: High-altitude Himalayan blooms starting late June."
        )
        return reply, summer_spots, ["🏔️ Ladakh Valleys", "☕ Munnar Tea Gardens", "🚂 Darjeeling Hills", "✨ How to book"]

    if any(k in q for k in ["monsoon", "rain", "july", "august", "september"]):
        monsoon_spots = [d for d in ALL_DESTINATIONS if d["name"] in ["Kerala Backwaters", "Meghalaya Waterfalls", "Coorg Highlands", "Valley of Flowers"]]
        reply = (
            "🌧️ **Enchanting Monsoon Escapes in India (Jul – Sep):**\n\n"
            "• **Kerala Backwaters**: Lush emerald canals, rejuvenating Ayurvedic massages, and quiet waterways.\n"
            "• **Meghalaya Waterfalls**: Dramatic roaring cascades (Nohkalikai) and living root bridges.\n"
            "• **Coorg Highlands**: Fresh coffee estate rains, roaring Abbey Falls, and misty hill drives.\n"
            "• **Valley of Flowers**: Peak blooming season with 500+ alpine flower species in the Himalayas."
        )
        return reply, monsoon_spots, ["🌧️ Meghalaya Waterfalls", "☕ Coorg Highlands", "🌿 Kerala Backwaters", "✨ How to book"]

    # 11. Itinerary Planning
    if any(k in q for k in ["itinerary", "plan a trip", "3 day", "3-day", "5 day", "5-day", "2 day", "weekend trip", "route"]):
        if "kerala" in q or "munnar" in q or "backwater" in q:
            kerala_spots = [d for d in ALL_DESTINATIONS if d["state"] == "Kerala"]
            reply = (
                "🌴 **Curated 3-Day Kerala Backwaters & Munnar Itinerary:**\n\n"
                "• **Day 1 (Alleppey Backwaters)**: Check into a solar-powered eco houseboat. Cruise through scenic palm canals and enjoy authentic Karimeen fish curry.\n"
                "• **Day 2 (Alleppey → Munnar)**: Scenic mountain drive past Cheeyappara waterfalls. Afternoon walk through organic tea plantations and Pothamedu sunset.\n"
                "• **Day 3 (Munnar Highlands)**: Early morning trek to Top Station for panoramic valley clouds. Spice plantation walk and tea museum tour before departure.\n\n"
                "💰 *Estimated stay budget: Rs. 7,000 – 9,000 for 2 nights.*"
            )
            return reply, kerala_spots, ["☕ Munnar Tea Gardens", "🛶 Kerala Backwaters", "✨ How to book", "📞 Call Concierge"]
        elif "rajasthan" in q or "jaipur" in q or "udaipur" in q:
            raj_spots = [d for d in ALL_DESTINATIONS if d["state"] == "Rajasthan"][:3]
            reply = (
                "🏰 **Curated 3-Day Royal Rajasthan Heritage Route:**\n\n"
                "• **Day 1 (Jaipur - Pink City)**: Sunrise at Hawa Mahal, morning exploration of Amber Fort, and afternoon walk through Johari Bazaar.\n"
                "• **Day 2 (Jaipur → Udaipur / Pushkar)**: Scenic transfer to the City of Lakes. Evening romantic boat cruise on Lake Pichola past Jag Mandir.\n"
                "• **Day 3 (Udaipur Palaces)**: Visit the grand City Palace and Bagore Ki Haveli folk dance show before farewell dinner.\n\n"
                "💰 *Estimated stay budget: Rs. 7,500 – 10,500 for 2 nights.*"
            )
            return reply, raj_spots, ["🏰 Jaipur Palaces", "👑 Udaipur Lakes", "✨ How to book", "📞 Concierge"]
        else:
            tri_spots = [d for d in ALL_DESTINATIONS if d["name"] in ["Taj Mahal", "Jaipur Palaces", "Varanasi Ghats"]]
            reply = (
                "🗺️ **Suggested 3-Day Classic Golden Triangle & Heritage Itinerary:**\n\n"
                "• **Day 1 (Agra)**: Dawn sunrise visit to the Taj Mahal to beat crowds. Afternoon tour of Agra Fort and marble inlay artisan workshops.\n"
                "• **Day 2 (Agra → Jaipur)**: Scenic drive via Fatehpur Sikri. Evening arrival in the Pink City with rooftop Dal Baati dinner.\n"
                "• **Day 3 (Jaipur)**: Electric vehicle tour of Amber Fort, Hawa Mahal photo stop, and artisan handicraft shopping.\n\n"
                "✨ *Explore full day-by-day itineraries and packing guides under our **Travel Guides** tab!*"
            )
            return reply, tri_spots, ["🕌 Taj Mahal", "🏰 Jaipur Palaces", "✨ How to book", "📞 Contact Concierge"]

    # 12. General fallback with warm greeting and suggested prompt pills
    popular = [d for d in ALL_DESTINATIONS if d["name"] in ["Taj Mahal", "Goa Beaches", "Munnar Tea Gardens", "Ladakh Valleys"]]
    reply = (
        "Namaste! 🙏 I'm your Indian Journeys AI Travel Assistant. Here are a few ways I can help you plan:\n\n"
        "1. **Destination Discovery**: Ask about *Goa beaches*, *Munnar tea hills*, *Ladakh valleys*, or *Rajasthan palaces*.\n"
        "2. **Budget Planning**: Ask for *budget stays under Rs. 3,000* or *luxury heritage palaces*.\n"
        "3. **Custom Itineraries**: Ask for a *3-day Kerala plan* or *5-day Golden Triangle route*.\n"
        "4. **Booking & Support**: Ask *how to book*, *UPI payment*, *cancellation policy*, or call our concierge at **9347466496**.\n\n"
        "Where in India would you like to travel next?"
    )
    prompts = ["🌴 Goa Beaches", "⛰️ 3-day Munnar itinerary", "🏰 Royal Rajasthan route", "💰 Stays under Rs. 3000", "✨ How to book"]
    return reply, popular, prompts


def chat_with_gemini(message: str, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Primary chat dispatcher.
    Tries Google Gemini API if configured with multi-turn history;
    otherwise seamlessly uses the high-precision local domain engine.
    """
    suggested_dests = find_destinations_in_text(message)
    
    if is_gemini_configured():
        models_to_try = [
            config.GEMINI_MODEL,
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ]
        unique_models = []
        for m in models_to_try:
            if m and m not in unique_models:
                unique_models.append(m)

        for model_name in unique_models:
            try:
                reply = query_gemini_api(message, history=history, model_name=model_name)
                if reply:
                    reply_dests = find_destinations_in_text(reply)
                    combined_dests = {d["id"]: d for d in (suggested_dests + reply_dests)}.values()
                    return {
                        "reply": reply,
                        "provider": "gemini",
                        "model": model_name,
                        "suggestedDestinations": list(combined_dests)[:4],
                        "followUpPrompts": [
                            "🗓️ Plan a 3-day itinerary",
                            "💰 Estimate trip budget",
                            "☀️ Best time to visit",
                            "✨ How to book stay"
                        ],
                    }
            except Exception as e:
                print(f"[Gemini API] Error with {model_name}: {e}")
                continue

    # Fallback to state-of-the-art local travel guide engine
    reply, dests, prompts = generate_local_knowledge_reply(message, history=history)
    return {
        "reply": reply,
        "provider": "local-knowledge-engine",
        "model": "Indian Journeys NLP v2",
        "suggestedDestinations": dests,
        "followUpPrompts": prompts,
    }
