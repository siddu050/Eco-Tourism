import React, { useState } from 'react';
import {
  CalendarRange,
  CheckCircle2,
  Route,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sun,
  CloudRain,
  Snowflake,
  Luggage,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DETAILED_ITINERARIES = [
  {
    id: 'golden-triangle',
    title: 'Golden Triangle Reimagined',
    duration: '5 Days / 4 Nights',
    region: 'North India',
    summary: 'Delhi, Agra, and Jaipur with boutique eco-stays, sunrise monument entries, and artisan walks.',
    days: [
      { day: 1, title: 'Old Delhi Heritage & Slow Food', desc: 'Explore historic Chandni Chowk alleys with a local storyteller, savor organic street snacks, and rest at a restored haveli.' },
      { day: 2, title: 'Sunrise Taj Mahal & Agra Crafts', desc: 'Enter the Taj Mahal at dawn to avoid crowds and heat. Afternoon visit to marble inlay artisan guilds in Agra.' },
      { day: 3, title: 'Fatehpur Sikri & Jaipur Arrival', desc: 'Drive through Mughal ghost citadel Fatehpur Sikri. Evening arrival in the Pink City with rooftop puppet show.' },
      { day: 4, title: 'Amber Fort & Block Printing Workshop', desc: 'Electric vehicle tour to Amber Fort, followed by a hands-on natural dye printing class in Bagru village.' },
      { day: 5, title: 'Hawa Mahal & Mindful Departure', desc: 'Early morning coffee overlooking Hawa Mahal facade and serene farewell walk through Jal Mahal promenade.' },
    ],
  },
  {
    id: 'kerala-trail',
    title: 'Kerala Water & Tea Trail',
    duration: '6 Days / 5 Nights',
    region: 'South India',
    summary: 'Backwaters to Munnar hills with solar houseboat stays, spice gardens, and high-altitude tea trails.',
    days: [
      { day: 1, title: 'Cochin Fort & Spice Markets', desc: 'Walk historic spice warehouses in Mattancherry and watch Chinese fishing nets against the sunset.' },
      { day: 2, title: 'Alleppey Solar Houseboat Cruise', desc: 'Drift along calm palm-fringed canals on a zero-emission electric houseboat with fresh traditional meals.' },
      { day: 3, title: 'Ascent to Munnar Tea Country', desc: 'Scenic mountain climb through Cheeyappara waterfalls to high-elevation tea plantations in Munnar.' },
      { day: 4, title: 'Top Station Ridge Trek & Birding', desc: 'Guided morning trek to Top Station with panoramic views across the Western Ghats clouds.' },
      { day: 5, title: 'Cardamom Forest & Ayurvedic Rest', desc: 'Visit an organic organic spice plantation and experience an authentic herbal oil massage.' },
      { day: 6, title: 'Misty Mornings & Departure', desc: 'Final sunrise walk through tea valleys and peaceful transfer to Cochin.' },
    ],
  },
  {
    id: 'sacred-river',
    title: 'Sacred River & Ancient Stone',
    duration: '5 Days / 4 Nights',
    region: 'Central & South',
    summary: 'Varanasi and Hampi for travelers seeking ancient architecture, spiritual ghats, and boulder landscapes.',
    days: [
      { day: 1, title: 'Varanasi Evening Ganga Aarti', desc: 'Witness the iconic evening lamp ceremonies at Dashashwamedh Ghat from a quiet rowboat.' },
      { day: 2, title: 'Dawn Ghats Walk & Sarnath Visit', desc: 'Morning boat ride past Manikarnika to Assi Ghat, followed by the peaceful deer park at Sarnath.' },
      { day: 3, title: 'Hampi Boulder Trails & Virupaksha', desc: 'Cycle through ancient Vijayanagara ruins and stone temple complexes in Hampi.' },
      { day: 4, title: 'Matanga Hill Sunrise & Coracle Ride', desc: 'Hike Matanga Hill for 360-degree panorama of boulder valleys and float in a circular reed coracle on the Tungabhadra.' },
      { day: 5, title: 'Vittala Stone Chariot & Reflection', desc: 'Marvel at the musical pillars of Vittala Temple before unhurried afternoon tea.' },
    ],
  },
];

const SEASONS_DATA = {
  winter: {
    title: 'Winter (October – March)',
    icon: Snowflake,
    weather: 'Pleasant, crisp & clear skies',
    bestPlaces: ['Rajasthan (Jaipur, Udaipur, Jaisalmer)', 'Agra (Taj Mahal)', 'Varanasi', 'Goa & Andaman Beaches', 'Rann of Kutch'],
    tips: 'Peak season for plains and deserts. Book stays 3-4 weeks in advance for prime eco-lodges.',
  },
  summer: {
    title: 'Summer (April – June)',
    icon: Sun,
    weather: 'Warm in plains, delightfully cool in mountains',
    bestPlaces: ['Ladakh & Pangong Lake', 'Munnar & Ooty Hills', 'Darjeeling & Sikkim', 'Valley of Flowers (Uttarakhand)'],
    tips: 'Escape the heat by heading to high-altitude Himalayan valleys and lush southern hill stations.',
  },
  monsoon: {
    title: 'Monsoon (July – September)',
    icon: CloudRain,
    weather: 'Dramatic clouds, emerald landscapes & misty rains',
    bestPlaces: ['Kerala Backwaters & Wayanad', 'Meghalaya Waterfalls & Living Bridges', 'Coorg Coffee Estates', 'Goa (Lush Green Season)'],
    tips: 'Ideal for slow-travel and Ayurvedic wellness retreats. Pack waterproof footwear and lightweight rain shells.',
  },
};

const DEFAULT_CHECKLIST = [
  { id: 1, text: 'Reusable stainless steel water bottle', checked: true },
  { id: 2, text: 'Lightweight waterproof jacket or rain poncho', checked: false },
  { id: 3, text: 'Eco-friendly biodegradable toiletries', checked: true },
  { id: 4, text: 'Comfortable walking shoes / trail sandals', checked: false },
  { id: 5, text: 'Light cotton layers & sun protection hat', checked: false },
  { id: 6, text: 'Power bank & offline regional maps', checked: true },
];

export const Guides = () => {
  const [activeSeason, setActiveSeason] = useState('winter');
  const [expandedItinerary, setExpandedItinerary] = useState('golden-triangle');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);

  const toggleChecklist = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const checkedCount = checklist.filter((c) => c.checked).length;
  const progressPercent = Math.round((checkedCount / checklist.length) * 100);

  const currentSeason = SEASONS_DATA[activeSeason];
  const SeasonIcon = currentSeason.icon;

  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="page-hero page-hero--guides">
        <div className="page-hero__content">
          <div className="hero-badge">
            <Route size={15} />
            <span>Interactive Planning Companion</span>
          </div>
          <h1>Plan with intentional routes, seasonal timing, and smart trip rhythm.</h1>
          <p className="section-copy">
            Transform trip inspiration into a structured, low-stress itinerary tailored for mindful exploration.
          </p>
        </div>
        <div className="guide-pillars">
          <div><Route size={18} /> Day-by-day Pacing</div>
          <div><CalendarRange size={18} /> Seasonal Wisdom</div>
          <div><Sparkles size={18} /> Eco-Minded Tips</div>
        </div>
      </section>

      {/* Interactive Seasonal Planner */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">When to Visit</p>
            <h2 className="section-title">Interactive Seasonal Timing Guide</h2>
          </div>
          <div className="pill-row">
            <button
              type="button"
              className={`pill-button${activeSeason === 'winter' ? ' pill-button--active' : ''}`}
              onClick={() => setActiveSeason('winter')}
            >
              <Snowflake size={14} /> Winter (Oct – Mar)
            </button>
            <button
              type="button"
              className={`pill-button${activeSeason === 'summer' ? ' pill-button--active' : ''}`}
              onClick={() => setActiveSeason('summer')}
            >
              <Sun size={14} /> Summer (Apr – Jun)
            </button>
            <button
              type="button"
              className={`pill-button${activeSeason === 'monsoon' ? ' pill-button--active' : ''}`}
              onClick={() => setActiveSeason('monsoon')}
            >
              <CloudRain size={14} /> Monsoon (Jul – Sep)
            </button>
          </div>
        </div>

        <div className="season-spotlight-card animate-fade-in">
          <div className="season-spotlight__header">
            <div className="season-icon-wrap">
              <SeasonIcon size={28} />
            </div>
            <div>
              <h3>{currentSeason.title}</h3>
              <p className="season-weather-text">{currentSeason.weather}</p>
            </div>
          </div>

          <div className="season-spotlight__grid">
            <div className="season-best-places">
              <strong>Recommended Destinations:</strong>
              <div className="season-places-list">
                {currentSeason.bestPlaces.map((place, i) => (
                  <div key={i} className="season-place-pill">
                    <MapPin size={13} />
                    <span>{place}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="season-tips-box">
              <strong>Seasonal Travel Advice:</strong>
              <p>{currentSeason.tips}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Expandable Itineraries */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Curated Itineraries</p>
            <h2 className="section-title">Expandable Day-by-Day Route Plans</h2>
          </div>
        </div>

        <div className="itineraries-accordion">
          {DETAILED_ITINERARIES.map((itinerary) => {
            const isExpanded = expandedItinerary === itinerary.id;
            return (
              <div
                key={itinerary.id}
                className={`itinerary-accordion-item${isExpanded ? ' itinerary-accordion-item--open' : ''}`}
              >
                <button
                  type="button"
                  className="itinerary-accordion-header"
                  onClick={() => setExpandedItinerary(isExpanded ? null : itinerary.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="itinerary-header-left">
                    <span className="itinerary-duration-badge">{itinerary.duration}</span>
                    <div>
                      <h3>{itinerary.title}</h3>
                      <p>{itinerary.summary}</p>
                    </div>
                  </div>
                  <div className="itinerary-header-right">
                    <span className="itinerary-region-tag">{itinerary.region}</span>
                    <div className="accordion-toggle-icon">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="itinerary-accordion-body animate-slide-down">
                    <div className="itinerary-timeline">
                      {itinerary.days.map((d) => (
                        <div key={d.day} className="timeline-day-item">
                          <div className="timeline-badge">Day {d.day}</div>
                          <div className="timeline-content">
                            <h4>{d.title}</h4>
                            <p>{d.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="itinerary-footer-action">
                      <Link to="/discover" className="btn-primary">
                        Find Stays for this Route <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Trip Checklist & Principles */}
      <section className="split-section">
        <div className="checklist-card">
          <div className="checklist-header">
            <div>
              <p className="section-eyebrow">Interactive Packing</p>
              <h2 className="section-title">Eco-Traveler Checklist</h2>
            </div>
            <div className="checklist-progress">
              <span>{progressPercent}% Ready</span>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="checklist">
            {checklist.map((item) => (
              <label key={item.id} className={`checklist__item${item.checked ? ' checklist__item--checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleChecklist(item.id)}
                />
                <span className="custom-check-box">
                  {item.checked && <CheckCircle2 size={16} />}
                </span>
                <span>{item.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="season-card">
          <p className="section-eyebrow">Travel Ethos</p>
          <h2 className="section-title">The Mindful Journey Code</h2>
          <div className="season-list">
            <div className="season-list__item">
              <strong>Support Local Artisans</strong>
              <p>Direct patronage helps preserve indigenous textile, pottery, and culinary traditions.</p>
            </div>
            <div className="season-list__item">
              <strong>Leave No Trace</strong>
              <p>Carry out all non-biodegradable waste and preserve sacred riverfronts and mountain passes.</p>
            </div>
            <div className="season-list__item">
              <strong>Slow Down the Pace</strong>
              <p>Spending 2-3 nights in one village creates deeper connections than rapid sightseeing.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Guides;
